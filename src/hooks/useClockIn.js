/* global BigInt */
import { useState } from 'react';
import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { Provider } from '@oyl/sdk/lib/provider/provider';
import { getAddressType, formatInputsToSign } from '@oyl/sdk/lib/shared/utils';
import { encodeRunestoneProtostone, ProtoStone, encipher } from 'alkanes/lib/index';
import { useLaserEyes } from '@omnisat/lasereyes-react'
import { useFeeEstimates } from './useGetFee';

function getScriptPkFromPubkey(pubkey) {
  if (!pubkey) {
    return null;
  }
  const pubkeyBuffer = Buffer.from(pubkey, 'hex');
  const p2wpkh = bitcoin.payments.p2wpkh({ 
    pubkey: pubkeyBuffer,
    network: bitcoin.networks.bitcoin
  });
  return p2wpkh.output.toString('hex');
}

export const useClockIn = () => {
  const { signPsbt, address, paymentAddress, paymentPublicKey } = useLaserEyes();
  const scriptPk = paymentPublicKey ? getScriptPkFromPubkey(paymentPublicKey) : null;
  const { getFeeRate } = useFeeEstimates();
  const executeClockIn = async () => {
    
    const response = await fetch("https://mainnet.sandshrew.io/v2/lasereyes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jsonrpc": "2.0", 
        "id": 1, 
        "method": "esplora_address::utxo",
        "params": [
          paymentAddress
        ]
      })
    });

    const data = await response.json();
    
    const sortedUtxos = [...data.result].sort((a, b) => b.value - a.value);

    const param1 = 2;
    const param2 = 21568;
    const param3 = 103;

    const minTxSize = 221;
    
    try {
      const feeRateGet = await getFeeRate();
      const feeRate = feeRateGet + 5;
      const dummyFee = minTxSize * (feeRate + 5);

      const requiredAmount = 330 + dummyFee;

      let selectedUtxos = [];
      let total = 0;

      for (const utxo of sortedUtxos) {
        selectedUtxos.push(utxo);
        total += utxo.value;
        if (total >= requiredAmount) break;
      }

      const provider = new Provider({
        url: 'https://mainnet.sandshrew.io',
        version: 'v2',
        projectId: 'lasereyes',
        network: bitcoin.networks.bitcoin,
        networkType: 'mainnet'
      });

      const calldata = [BigInt(param1), BigInt(param2), BigInt(param3)];
      
      const protostone = encodeRunestoneProtostone({
        protostones: [
          ProtoStone.message({
            protocolTag: 1n,
            edicts: [],
            pointer: 0,
            refundPointer: 0,
            calldata: encipher(calldata),
          }),
        ],
      }).encodedRunestone;

      let estimationPsbt = new bitcoin.Psbt({ network: provider.network });

      for (const utxo of selectedUtxos) {
        if (getAddressType(paymentAddress) === 1 || getAddressType(paymentAddress) === 3) {
          estimationPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: Buffer.from(scriptPk, 'hex'),
            },
          });
        } else if (getAddressType(paymentAddress) === 2) {
          const redeemScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_0,
            bitcoin.crypto.hash160(Buffer.from(paymentPublicKey, 'hex')),
          ]);

          estimationPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            redeemScript: redeemScript,
            witnessUtxo: {
              value: utxo.value,
              script: bitcoin.script.compile([
                bitcoin.opcodes.OP_HASH160,
                bitcoin.crypto.hash160(redeemScript),
                bitcoin.opcodes.OP_EQUAL,
              ]),
            },
          });
        } else if (getAddressType(paymentAddress) === 0) {
          const previousTxHex = await provider.esplora.getTxHex(utxo.txId);
          estimationPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
          });
        }
      }
      
      estimationPsbt.addOutput({
        script: protostone,
        value: 0,
      });
      
      const changeAmount = total - dummyFee;
      if (changeAmount > 546) {
        estimationPsbt.addOutput({
          address: paymentAddress,
          value: changeAmount,
        });
      }


      const formattedEstimationPsbt = await formatInputsToSign({
        _psbt: estimationPsbt,
        senderPublicKey: paymentPublicKey,
        network: provider.network,
      });
      
      const estimationPsbtObj = bitcoin.Psbt.fromBase64(formattedEstimationPsbt.toBase64(), {
        network: provider.network,
      });

      for (let i = 0; i < estimationPsbtObj.data.inputs.length; i++) {
        const fakeSig = Buffer.alloc(64, 0x00);
        
        if (getAddressType(paymentAddress) === 1 || getAddressType(paymentAddress) === 3) {
          estimationPsbtObj.data.inputs[i].finalScriptWitness = bitcoin.script.compile([
            fakeSig,
            Buffer.from(paymentPublicKey, 'hex')
          ]);
          estimationPsbtObj.data.inputs[i].finalScriptSig = Buffer.alloc(0);
        } else if (getAddressType(paymentAddress) === 2) {
          const redeemScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_0,
            bitcoin.crypto.hash160(Buffer.from(paymentPublicKey, 'hex'))
          ]);
          
          estimationPsbtObj.data.inputs[i].finalScriptWitness = bitcoin.script.compile([
            fakeSig,
            Buffer.from(paymentPublicKey, 'hex')
          ]);
          estimationPsbtObj.data.inputs[i].finalScriptSig = bitcoin.script.compile([redeemScript]);
        } else {
          estimationPsbtObj.data.inputs[i].finalScriptSig = bitcoin.script.compile([
            fakeSig,
            Buffer.from(paymentPublicKey, 'hex')
          ]);
        }
      }

      const estimationTx = estimationPsbtObj.extractTransaction();
      const vSize = estimationTx.virtualSize() + 10;
      

      let fee = Math.ceil(vSize * feeRate);
      
      
      let finalPsbt = new bitcoin.Psbt({ network: provider.network });

      let totalUtxoAmount = 0;

      for (const utxo of selectedUtxos) {
        totalUtxoAmount += utxo.value;
        
        if (getAddressType(paymentAddress) === 1 || getAddressType(paymentAddress) === 3) {
          finalPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: Buffer.from(scriptPk, 'hex'),
            },
          });
        } else if (getAddressType(paymentAddress) === 2) {
          const redeemScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_0,
            bitcoin.crypto.hash160(Buffer.from(paymentPublicKey, 'hex')),
          ]);

          finalPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            redeemScript: redeemScript,
            witnessUtxo: {
              value: utxo.value,
              script: bitcoin.script.compile([
                bitcoin.opcodes.OP_HASH160,
                bitcoin.crypto.hash160(redeemScript),
                bitcoin.opcodes.OP_EQUAL,
              ]),
            },
          });
        } else if (getAddressType(paymentAddress) === 0) {
          const previousTxHex = await provider.esplora.getTxHex(utxo.txid);
          finalPsbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
          });
        }
      }
      
      finalPsbt.addOutput({
        script: protostone,
        value: 0,
      });

      const changeAmountUtxo = totalUtxoAmount - fee;
      if (changeAmountUtxo > 546) {
        finalPsbt.addOutput({
          address: paymentAddress,
          value: changeAmountUtxo,
        });
      }

      const formattedFinalPsbt = await formatInputsToSign({
        _psbt: finalPsbt,
        senderPublicKey: paymentPublicKey,
        network: provider.network,
      });
      
      const rawTxHex = formattedFinalPsbt.toBase64();

      try {
        const signResponse = await signPsbt(rawTxHex, true, true);

        return signResponse;
      } catch (error) {
        throw error;
      }

      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  return { executeClockIn };
}