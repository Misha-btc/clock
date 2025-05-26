import { useMemo } from 'react';
import { useLatestBlockHeight } from './useLatestBlockHeight';

export function useCurrentTime() {
  const DEPLOY_TIME = 897413;
  const blockHeight = useLatestBlockHeight(5000);

  const currentMinute = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const currentTime = time % 144;
    const blocksRemaining = 144 - currentTime;
    const minute = blocksRemaining % 6;
    const currentMinute = 6 - minute;

    return currentMinute;
  }, [blockHeight]);

  const currentHour = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const blocksPassed = time % 144;
    const blocksRemaining = 144 - blocksPassed;
    const hour = blocksRemaining % 6;
    const currentHour = 12 - ((blocksRemaining - hour) / 6);
    return currentHour;
  }, [blockHeight]);

  return { currentMinute, currentHour };
}