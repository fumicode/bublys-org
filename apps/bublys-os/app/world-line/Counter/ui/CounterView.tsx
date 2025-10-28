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
      gap: '1rem',
      padding: '1rem',
    }}>
      <button 
        onClick={handleCountDown}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1.2rem',
          backgroundColor: '#ff5722',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        -
      </button>
      
      <span style={{ 
        fontSize: '2rem', 
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
          padding: '0.5rem 1rem',
          fontSize: '1.2rem',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        +
      </button>
    </div>
  );
}
