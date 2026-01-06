'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { MemoEditor } from '../Memo/ui/MemoEditor';
import { MemoTitle } from '../Memo/ui/MemoTitle';
import { Memo } from '../Memo/domain/Memo';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

type MemoWorldLineIntegrationProps = {
  memoId: string;
  onOpenAuthor?: (userId: string, detailUrl: string) => void;
};

/**
 * MemoとWorldLineの統合層
 */
export function MemoWorldLineIntegration({ memoId, onOpenAuthor }: MemoWorldLineIntegrationProps) {
  const { setFocusedObjectId } = useFocusedObject();

  return (
    <WorldLineView<Memo>
      renderWorldState={(memo: Memo, onMemoChange) => (
        <div
          onFocus={() => setFocusedObjectId(memoId)}
          onMouseDown={() => setFocusedObjectId(memoId)}
          tabIndex={-1}
        >
          <MemoTitle
            memo={memo}
            onSetAuthor={(userId) => onMemoChange(memo.setAuthor(userId))}
            onOpenAuthor={onOpenAuthor}
          />
          <MemoEditor memo={memo} onMemoChange={onMemoChange} memoId={memoId} />
        </div>
      )}
    />
  );
}
