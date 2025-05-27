import './App.css';
import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useCurrentTime } from './hooks/useCurrentTime';
import clickSound from './assets/sounds/click2.mp3';
import clickSound2 from './assets/sounds/click3.mp3';
import clickSound3 from './assets/sounds/click1.mp3';
import clockInSystem from './assets/sounds/clockInSystem.mp3';
import { useClockIn } from './hooks/useClockIn';
import { useLaserEyes } from '@omnisat/lasereyes-react';

function App() {
  const { RiveComponent, rive } = useRive({
    src: "/assets/rive/clockin.riv",
    stateMachines: 'State Machine 1',
    autoplay: true,
    onLoadError: () => console.log("ERROR LOADING RIVE"),
    onLoad: () => console.log("LOADED RIVE"),
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const { executeClockIn } = useClockIn();
  const { connect, address, paymentAddress } = useLaserEyes();
  const input = useStateMachineInput(rive, 'State Machine 1', 'minutes');
  const hoursInput = useStateMachineInput(rive, 'State Machine 1', 'hours');
  const secondsInput = useStateMachineInput(rive, 'State Machine 1', 'sec');
  const clockInput = useStateMachineInput(rive, 'State Machine 1', 'clockin');
  const amInput = useStateMachineInput(rive, 'State Machine 1', 'am');
  const buttonInput = useStateMachineInput(rive, 'State Machine 1', 'buttonPresed');
  const { currentMinute, currentHour, hourPositions } = useCurrentTime();
  const [connected, setConnected] = useState(address? true : false);
  

  useEffect(() => {
    if (currentMinute === null) {
      return;
    }

    if (input && currentMinute !== 0 && currentMinute !== 1) {
      input.value = currentMinute;
    } else if (input && currentMinute === 0) {
      input.value = 6;
    } else if (input && currentMinute === 1) {
      input.value = 7;
      setTimeout(() => {
        input.value = 1;
      }, 100);
    } 
    if (input && currentMinute === 5 && hourPositions === 23) {
      if (clockInput) clockInput.value = true;
      const clockInSound = new Audio(clockInSystem);
      clockInSound.play();
      if (address && address !== '') {
        const handleUseClockIn = async () => {
          try {
            await executeClockIn();
          } catch (error) {
            console.error(error);
          }
        };
         handleUseClockIn();
      }
    }
    if (!connected) {
      if (clockInput) clockInput.value = true;
    } else if (connected && (currentMinute !== 5 && hourPositions !== 23)) {
      if (clockInput) {
        clockInput.value = false;
      }
    }
  }, [input, currentMinute, connected, address]);

  useEffect(() => {
    if (!hoursInput || !currentHour) return;
    
    if (currentHour !== 1) {
      hoursInput.value = currentHour;
      if (hourPositions === 0) {
        if (amInput) amInput.value = false;
      } else if (hourPositions === 12) {
        if (amInput) amInput.value = true;
      }
    } else if (currentHour === 1) {
      hoursInput.value = 13;
      setTimeout(() => {
        hoursInput.value = 1;
      }, 100);
    }
  }, [hoursInput, currentHour, clockInput, hourPositions, amInput, connected]);

  useEffect(() => {
    if (!secondsInput) return;

    let sec = 1;
    const click = new Audio(clickSound);
    click.volume = 0.42; 
    const click2 = new Audio(clickSound2);
    click2.volume = 0.50;
    const click3 = new Audio(clickSound3);
    click3.volume = 0.42;

    const sounds = [click, click2, click3];

    const interval = setInterval(() => {
      secondsInput.value = sec;
      
      const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
      randomSound.currentTime = 0;
      randomSound.play().catch(() => {});

      sec = sec === 60 ? 1 : sec + 1;
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsInput]);

  useEffect(() => {
    if (!buttonInput && connected) return;

    let isProcessing = false;
    
    const checkButton = () => {
      if (!buttonInput || isProcessing) return;
      
      if (buttonInput.value === true) {
        isProcessing = true;
        
        buttonInput.value = false;
        
        const handleClockIn = async () => {
          try {
            await connect('oyl');
          } catch (error) {
            console.error('❌ Error:', error);
          } finally {
            setTimeout(() => {
              isProcessing = false;
            }, 1000);
          }
        };

        handleClockIn();
      }
    };

    const interval = setInterval(checkButton, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, [buttonInput, connect]);

  useEffect(() => {
    if (address && address !== '' && paymentAddress && paymentAddress !== '') {

      localStorage.setItem('taprootAddress', address);
      localStorage.setItem('paymentAddress', paymentAddress);
      setConnected(true);
    }
  }, [address, paymentAddress]);

  return (
    <div className="App" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <RiveComponent style={{ width: '100%', height: '100%'}} />
    </div>

  );
}

export default App;
