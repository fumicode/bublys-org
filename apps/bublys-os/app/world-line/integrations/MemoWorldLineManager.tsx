'use client';
import { createWorldLineManager } from '../WorldLine/feature/createWorldLineManager';
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
}

const MemoWorldLineManagerBase = createWorldLineManager<Memo>({
  serialize: serializeMemo,
  deserialize: deserializeMemo,
  createInitialWorldState: () => createInitialMemo(),
});

export function MemoWorldLineManager({ 
  children, 
  memoId
}: MemoWorldLineManagerProps) {
  return (
    <MemoWorldLineManagerBase objectId={memoId}>
      {children}
    </MemoWorldLineManagerBase>
  );
}

