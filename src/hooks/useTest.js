import { useState, useEffect, useMemo } from 'react';


export function useTest() {
  const DEPLOY_TIME = 897413;
  const [currentBlock, setCurrentBlock] = useState(DEPLOY_TIME);
  const [hourPositions, setHourPositions] = useState(0);

  // Имитируем изменение блоков каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBlock(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  // Циклически перебираем 144 блока
  const blockHeight = useMemo(() => {
    const cyclePosition = (currentBlock - DEPLOY_TIME) % 144;
    return DEPLOY_TIME + cyclePosition;
  }, [currentBlock]); 

  const currentMinuteTest = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const currentTime = time % 144;
    const blocksRemaining = 144 - currentTime;
    const minute = blocksRemaining % 6;
    const currentMinute = 6 - minute;

    return currentMinute;
  }, [blockHeight]);

  const currentHourTest = useMemo(() => {
    if (blockHeight == null) return null;

    const time = blockHeight - DEPLOY_TIME;
    const currentTime = time % 144;
    
    // Часовая стрелка смещается каждые 6 тактов (24 позиции за 144 блока)
    const hourPosition = Math.floor(currentTime / 6);
    setHourPositions(hourPosition);
    // Преобразуем в 12-часовой формат (0-23 -> 12,1,2...11,12,1,2...11)
    const currentHour = hourPosition % 12 === 0 ? 12 : hourPosition % 12;
    
    return currentHour;
  }, [blockHeight]);

  return { currentMinuteTest, currentHourTest, blockHeight, hourPositions };
}
