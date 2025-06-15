import './App.css';
import { useEffect } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useCurrentTime } from './hooks/useCurrentTime';
import clickSound from './assets/sounds/click2.mp3';
import clickSound2 from './assets/sounds/click3.mp3';
import clickSound3 from './assets/sounds/click1.mp3';
import clockInSystem from './assets/sounds/clockInSystem.mp3';

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

  const input = useStateMachineInput(rive, 'State Machine 1', 'minutes');
  const hoursInput = useStateMachineInput(rive, 'State Machine 1', 'hours');
  const secondsInput = useStateMachineInput(rive, 'State Machine 1', 'sec');
  const amInput = useStateMachineInput(rive, 'State Machine 1', 'am');
  const { currentMinute, currentHour, hourPositions } = useCurrentTime();

  const handleRedirect = () => {
    window.open('https://app.oyl.io/clock-in/', '_blank');
  };


  useEffect(() => {
    if (currentMinute === null) return;

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
      const clockInSound = new Audio(clockInSystem);
      clockInSound.play().catch(() => {});
    }
  }, [input, currentMinute, hourPositions]);


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
  }, [hoursInput, currentHour, hourPositions, amInput]);


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

  return (
    <div className="App" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        filter: 'blur(5px)',
        zIndex: 1
      }}>
        <RiveComponent style={{ width: '100%', height: '100%'}} />
      </div>
      
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 1000,
        cursor: 'pointer',
        width: '100%'
      }}
      onClick={handleRedirect}>
        <div style={{
          color: '#FFD700',
          fontSize: '48px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 4px 15px rgba(0, 0, 0, 0.9)',
          letterSpacing: '2px',
          marginBottom: '20px'
        }}>
          🔧 CLOCKMAKER IS RESTORING THE CLOCK 🔧
        </div>
        
        <div style={{ 
          fontSize: '24px', 
          opacity: '0.9',
          color: '#FFA500',
          fontWeight: 'normal',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          animation: 'blink 2s infinite',
          marginBottom: '15px'
        }}>
          ⚠️ TEMPORARILY OUT OF SERVICE ⚠️
        </div>
        
        <div style={{ 
          fontSize: '18px', 
          opacity: '0.8',
          color: 'white',
          fontWeight: '300'
        }}>
          Clock-in using OYL App
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 0.9; }
          51%, 100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default App;
