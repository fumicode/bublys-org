'use client';
import { WorldLine3DView } from '../WorldLine/ui/WorldLine3DView';
import { MemoEditor } from '../Memo/ui/MemoEditor';
import { Memo } from '../Memo/domain/Memo';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

/**
 * Memoの3Dビュー専用コンポーネント
 */
export function MemoWorldLine3DView({ memoId, onCloseWorldLineView }: { memoId: string; onCloseWorldLineView: () => void }) {
  const { setFocusedObjectId } = useFocusedObject();

  const handleCloseWorldLineView = () => {
    onCloseWorldLineView();
  };

  return (
    <WorldLine3DView<Memo>
      renderWorldState={(memo: Memo, onMemoChange) => (
        <div
          onFocus={() => setFocusedObjectId(memoId)}
          onMouseDown={() => setFocusedObjectId(memoId)}
          tabIndex={-1}
        >
          <MemoEditor memo={memo} onMemoChange={onMemoChange} memoId={memoId} />
        </div>
      )}
      onCloseWorldLineView={handleCloseWorldLineView}
    />
  );
}