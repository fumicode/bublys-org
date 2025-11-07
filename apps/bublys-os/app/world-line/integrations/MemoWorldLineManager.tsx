'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import { Memo, useAppSelector } from '@bublys-org/state-management';

/**
 * MemoとWorldLineを統合するマネージャーコンポーネント
 */
interface MemoWorldLineManagerProps {
  children: React.ReactNode;
  memoId: string;
}

export function MemoWorldLineManager({ 
  children, 
  memoId
}: MemoWorldLineManagerProps) {
  // Reduxから既存のMemoデータを取得（初期化用）
  const reduxMemoRaw = useAppSelector((state) => state.memo.memos[memoId]);
  const reduxMemo = reduxMemoRaw ? Memo.fromJson(reduxMemoRaw) : undefined;
  
  return (
    <WorldLineManager<Memo>
      objectId={memoId}
      serialize={(memo: Memo) => memo.toJson()}
      deserialize={(data: any) => Memo.fromJson(data)}
      createInitialWorldState={() => {
        // Reduxから既存のMemoがある場合はそれを使用、なければ新規作成
        if (reduxMemo) {
          return reduxMemo;
        }
        // 初期化時は常にMemo.create()を使用
        return Memo.create();
      }}
    >
      {children}
    </WorldLineManager>
  );
}

