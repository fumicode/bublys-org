'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import { 
  serializeMemo, 
  deserializeMemo,
  createInitialMemo
} from '../Memo/feature/MemoManager';
import { Memo } from '../Memo/domain/Memo';

/**
 * MemoとWorldLineを統合するマネージャーコンポーネント
 * - 1つのMemoに対して1つの独立した世界線を管理
 */
interface MemoWorldLineManagerProps {
  children: React.ReactNode;
  memoId: string;
  isBubbleMode?: boolean;
}

export function MemoWorldLineManager({ 
  children, 
  memoId,
  isBubbleMode = false
}: MemoWorldLineManagerProps) {
  return (
    <WorldLineManager<Memo>
      objectId={memoId}
      serialize={serializeMemo}
      deserialize={deserializeMemo}
      createInitialWorldState={() => createInitialMemo()}
      isBubbleMode={isBubbleMode}
    >
      {children}
    </WorldLineManager>
  );
}

