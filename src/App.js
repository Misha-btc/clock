import './App.css';
import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useCurrentTime } from './hooks/useCurrentTime';
import clickSound from './assets/sounds/click2.mp3';
import clockInSystem from './assets/sounds/clockInSystem.mp3';
import { useTest } from './hooks/useTest';
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
  const signInput = useStateMachineInput(rive, 'State Machine 1', 'sign');
  const { currentMinute, currentHour } = useCurrentTime();
  const { currentMinuteTest, currentHourTest, hourPositions } = useTest();
  const [connected, setConnected] = useState(address? true : false);

  useEffect(() => {
    if (input && currentMinuteTest != null && currentMinuteTest !== 0 && currentMinuteTest !== 1) {
      input.value = currentMinuteTest;
    } else if (input && currentMinuteTest != null && currentMinuteTest === 0) {
      input.value = 6;
    } else if (input && currentMinuteTest != null && currentMinuteTest === 1) {
      input.value = 7;
      setTimeout(() => {
        input.value = 1;
      }, 100);
    }
  }, [input, currentMinuteTest]);

  useEffect(() => {
    if (!hoursInput || !currentHourTest) return;
    if (!connected) {
      clockInput.value = true;
    } else if (hourPositions === 0) {
      clockInput.value = true;
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
    } else {
      clockInput.value = false;
    }
    if (currentHourTest !== 1) {
      hoursInput.value = currentHourTest;
      if (hourPositions === 0) {
        amInput.value = false;
        const clockInSound = new Audio(clockInSystem);
        clockInSound.play();
      } else if (hourPositions === 12) {
        amInput.value = true;
      }
    } else if (currentHourTest === 1) {
      hoursInput.value = 13;
      setTimeout(() => {
        hoursInput.value = 1;
      }, 100);
    }
  }, [hoursInput, currentHourTest, clockInput, hourPositions, amInput, connected]);

  useEffect(() => {
    if (!secondsInput) return;
  
    let sec = 1;
    const click = new Audio(clickSound);
    click.volume = 0.42; 
  
    const interval = setInterval(() => {
      secondsInput.value = sec;
      click.currentTime = 0;
      click.play().catch(() => {});
  
      sec = sec === 60 ? 1 : sec + 1;
    }, 1000);
  
    return () => clearInterval(interval);
  }, [secondsInput]);

  useEffect(() => {
    if (signInput && signInput.value === true) {
      const handleClockIn = async () => {
        try {
          console.log('connect to OYL...');
          await connect('oyl');
          signInput.value = false;
        } catch (error) {
          console.error(error);
        }
      };

      handleClockIn();
    }
  }, [signInput, signInput?.value, connect]);

  useEffect(() => {
    if (address && address !== '' && paymentAddress && paymentAddress !== '') {
      console.log('wallet connected! Address:', address);

      localStorage.setItem('taprootAddress', address);
      localStorage.setItem('paymentAddress', paymentAddress);
      setConnected(true);
    }
  }, [address, paymentAddress]);

  // useEffect(() => {
  //   console.log('address:', address);
  //   if (address && address !== '' && signInput && signInput.value === true) {
  //     const handleUseClockIn = async () => {
  //    try {
  //          await executeClockIn();
  //        } catch (error) {
  //          console.error(error);
  //        }
  //      };
  //     handleUseClockIn();
  //   }
  // }, [address, executeClockIn]);



  return (
    <div className="App" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <RiveComponent style={{ width: '100%', height: '100%'}} />
    </div>
  );
}

export default App;
