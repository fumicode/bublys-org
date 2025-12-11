'use client';
import { useState } from 'react';
import { CounterWorldLineIntegration } from './integrations/CounterWorldLineIntegration';
import { CounterWorldLineManager } from './integrations/CounterWorldLineManager';
import { MemoWorldLineIntegration } from './integrations/MemoWorldLineIntegration';
import { MemoWorldLineManager } from './integrations/MemoWorldLineManager';
import { Memo } from './Memo/domain/Memo';
import { MemoList } from './Memo/ui/MemoList';
import { FocusedObjectProvider } from './WorldLine/domain/FocusedObjectContext';

export default function Index() {
  const [counterId, setCounterId] = useState<string | null>(null);
  const [memoId, setMemoId] = useState<string | null>(null);
  const [showMemoList, setShowMemoList] = useState(false);

  const handleCreateCounter = () => {
    const newCounterId = `counter-${crypto.randomUUID()}`;
    // CounterはReduxに保存しない（世界線システムのみで管理）
    setCounterId(newCounterId);
  };

  const handleCreateMemo = () => {
    const newMemo = Memo.create();
    // MemoはReduxに保存しない（世界線システムのみで管理）
    setMemoId(newMemo.id);
    setShowMemoList(false);
  };

  const handleSelectMemo = (selectedMemoId: string) => {
    setMemoId(selectedMemoId);
    setShowMemoList(false);
  };
  const buildMemoUrl = (memoId: string) => `memos/${memoId}`;

  return (
    <FocusedObjectProvider>
      <div>
      {/* 初期化ボタン（左上） */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
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
          <button
            onClick={() => setShowMemoList(!showMemoList)}
            style={{
              padding: '8px 16px',
              backgroundColor: showMemoList ? '#ff9800' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {showMemoList ? 'メモ一覧を閉じる' : '既存メモを開く'}
          </button>
        </div>

        {/* 既存メモ一覧 */}
        {showMemoList && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            minWidth: '300px',
          }}>
            <MemoList buildDetailUrl={buildMemoUrl} onMemoClick={(id) => handleSelectMemo(id)} />
          </div>
        )}
      </div>

      {/* Counter: 独立した世界線 */}
      {counterId && (
        <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
          <CounterWorldLineManager counterId={counterId} initialValue={0}>
            <CounterWorldLineIntegration counterId={counterId} />
          </CounterWorldLineManager>
        </div>
      )}

      {/* Memo: 独立した世界線 */}
      {memoId && (
        <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
          <MemoWorldLineManager
            memoId={memoId}
            isBubbleMode={false}
            onOpenWorldLineView={() => {}}
            onCloseWorldLineView={() => {}}
          >
            <MemoWorldLineIntegration memoId={memoId} />
          </MemoWorldLineManager>
        </div>
      )}
      </div>
    </FocusedObjectProvider>
  );
}
