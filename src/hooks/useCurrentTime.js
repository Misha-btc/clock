import { useMemo, useState } from 'react';
import { useLatestBlockHeight } from './useLatestBlockHeight';

export function useCurrentTime() {
  const DEPLOY_TIME = 897413;
  const blockHeight = useLatestBlockHeight(5000);
  const [hourPositions, setHourPositions] = useState(0);

  const currentMinute = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const currentTime = time % 144;
    const blocksRemaining = 144 - currentTime;
    const minute = blocksRemaining % 6;
    const currentMinute = 6 - minute;
    console.log(`currentMinute: ${currentMinute}`);

    return currentMinute;
  }, [blockHeight]);

  const currentHour = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const currentTime = time % 144;
    
    const hourPosition = Math.floor(currentTime / 6);
    setHourPositions(hourPosition);
    const currentHour = hourPosition % 12 === 0 ? 12 : hourPosition % 12;
    
    return currentHour;
  }, [blockHeight]);

  return { currentMinute, currentHour, hourPositions };
}