import { useEffect, useState } from 'react';

export function useLatestBlockHeight(pollIntervalMs = 10000) {
  const [blockHeight, setBlockHeight] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBlockHeight = async () => {
      try {
        const res = await fetch('https://mainnet.sandshrew.io/v1/lasereyes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'esplora_blocks:tip:height',
            params: [],
          }),
        });

        const data = await res.json();
        if (isMounted && data?.result) {
          setBlockHeight(data.result);
        }
      } catch (err) {
        console.error('Error getting block height:', err);
      }
    };

    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return blockHeight;
}