'use client';
import { useState } from 'react';
import { CounterWorldLineIntegration } from './integrations/CounterWorldLineIntegration';
import { CounterWorldLineManager } from './integrations/CounterWorldLineManager';
import { MemoWorldLineIntegration } from './integrations/MemoWorldLineIntegration';
import { MemoWorldLineManager } from './integrations/MemoWorldLineManager';
import { Memo, useAppDispatch, addMemo } from '@bublys-org/state-management';

export default function Index() {
  const dispatch = useAppDispatch();
  const [counterId, setCounterId] = useState<string | null>(null);
  const [memoId, setMemoId] = useState<string | null>(null);

  const handleCreateCounter = () => {
    const newCounterId = `counter-${crypto.randomUUID()}`;
    // CounterはReduxに保存しない（世界線システムのみで管理）
    setCounterId(newCounterId);
  };

  const handleCreateMemo = () => {
    const newMemo = Memo.create();
    dispatch(addMemo({ memo: newMemo.toJson() }));
    setMemoId(newMemo.id);
  };

  return (
    <div>
      {/* 初期化ボタン（左上） */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={handleCreateCounter}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Counter作成
        </button>
        <button
          onClick={handleCreateMemo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Memo作成
        </button>
      </div>

      {/* Counter: 独立した世界線 */}
      {counterId && (
        <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
          <CounterWorldLineManager counterId={counterId} initialValue={0}>
            <CounterWorldLineIntegration />
          </CounterWorldLineManager>
        </div>
      )}

      {/* Memo: 独立した世界線 */}
      {memoId && (
        <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
          <MemoWorldLineManager memoId={memoId}>
            <MemoWorldLineIntegration memoId={memoId} />
          </MemoWorldLineManager>
        </div>
      )}
    </div>
  );
}
