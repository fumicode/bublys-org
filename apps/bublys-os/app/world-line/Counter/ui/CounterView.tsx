'use client';
import { Counter } from '../domain/Counter';
interface CounterViewProps {
  counter: Counter;
  onCounterChange: (newCounter: Counter) => void;
}
export function CounterView({ counter, onCounterChange }: CounterViewProps) {
  const handleCountUp = () => {
    onCounterChange(counter.countUp());
  };
  const handleCountDown = () => {
    onCounterChange(counter.countDown());
  };
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '0.8rem',
    }}>
      <button 
        onClick={handleCountDown}
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '1.1rem',
          backgroundColor: '#ff5722',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        -
      </button>
      
      <span style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold',
        minWidth: '3rem',
        textAlign: 'center',
        color: '#333',
      }}>
        {counter.value}
      </span>
      
      <button 
        onClick={handleCountUp}
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '1.1rem',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        +
      </button>
    </div>
  );
}
