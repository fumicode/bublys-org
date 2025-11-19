'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { MemoEditor } from '../Memo/ui/MemoEditor';
import { MemoTitle } from '../Memo/ui/MemoTitle';
import { Memo } from '../Memo/domain/Memo';

/**
 * MemoとWorldLineの統合層
 */
export function MemoWorldLineIntegration({ memoId }: { memoId: string }) {
  return (
    <WorldLineView<Memo>
      renderWorldState={(memo: Memo, onMemoChange) => (
        <div>
          <MemoTitle memo={memo} />
          <MemoEditor memo={memo} onMemoChange={onMemoChange} />
        </div>
      )}
    />
  );
}

