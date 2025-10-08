'use client';
import { FC } from "react";
import { Counter } from "../domain/Counter";
import styled from "styled-components";
import { increment, decrement, useAppDispatch } from "@bublys-org/state-management";

const StyledCounterView = styled.div`
  .counter-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin: 1rem 0;
  }

  .counter-display {
    font-size: 2rem;
    font-weight: bold;
    color: #333;
    min-width: 80px;
    text-align: center;
  }

  .counter-btn {
    width: 50px;
    height: 50px;
    border: 2px solid #9c27b0;
    border-radius: 50%;
    background-color: white;
    color: #9c27b0;
    cursor: pointer;
    font-size: 1.5rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background-color: #9c27b0;
      color: white;
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }
`;

type CounterViewProps = {
  counter: Counter;
  onCounterChange: (newCounter: Counter) => void;
};

/**
 * CounterView
 * カウンターの表示と操作を行うUIコンポーネント
 * 現在の世界線のカウンターのみを更新可能
 */
export const CounterView: FC<CounterViewProps> = ({
  counter,
  onCounterChange,
}) => {
  const dispatch = useAppDispatch();

  const handleIncrement = () => {
    const newCounter = counter.countUp();
    console.log("カウンター増加:", newCounter.value);
    
    // Reduxのグローバル状態も更新
    dispatch(increment());
    
    // 現在の世界線のカウンターを更新
    onCounterChange(newCounter);  
  };

  const handleDecrement = () => {
    const newCounter = counter.countDown();
    console.log("カウンター減少:", newCounter.value);
    
    // Reduxのグローバル状態も更新
    dispatch(decrement());
    
    // 現在の世界線のカウンターを更新
    onCounterChange(newCounter);
  };

  return (
    <StyledCounterView>
      <div className="counter-container">
        <button 
          className="counter-btn"
          onClick={handleDecrement}
          aria-label="カウンターを減らす"
        >
          -
        </button>
        <div className="counter-display">
          {counter.value}
        </div>
        <button 
          className="counter-btn"
          onClick={handleIncrement}
          aria-label="カウンターを増やす"
        >
          +
        </button>
      </div>
    </StyledCounterView>
  );
};