import { useCallback } from 'react';

export const useFeeEstimates = () => {
  const getFeeRate = useCallback(async () => {
    try {
      const response = await fetch("https://mainnet.sandshrew.io/v2/lasereyes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "jsonrpc": "2.0", 
          "id": 1, 
          "method": "esplora_fee-estimates",
          "params": []
        })
      });

      const data = await response.json();
      return Math.ceil(data.result["1"]);
    } catch (error) {
      console.error('Error getting fee rate:', error);
      return 10;
    }
  }, []);

  return { getFeeRate };
};
