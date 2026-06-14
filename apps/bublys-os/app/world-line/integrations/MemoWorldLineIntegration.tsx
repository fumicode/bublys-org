'use client';
import { useEffect } from 'react';
import { MemoEditor } from '../Memo/ui/MemoEditor';
import { MemoTitle } from '../Memo/ui/MemoTitle';
import { useMemoWorldLine } from '../Memo/feature/useMemoWorldLine';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

type MemoWorldLineIntegrationProps = {
  memoId: string;
  onOpenAuthor?: (userId: string, detailUrl: string) => void;
  onOpenWorldLineView?: () => void;
};

/**
 * Memo の編集 UI と world-line-graph を接続するコンポーネント。
 *
 * `useMemoWorldLine(memoId)` で scope を確保し、apex memo を MemoEditor /
 * MemoTitle に渡す。編集は `update(transform)` 経由で graph を伸ばす。
 *
 * scope（= world-line）が未初期化のとき（scope が空、apex 無し）は対象 memo が
 * まだ存在しないことを示すプレースホルダを出す。
 */
export function MemoWorldLineIntegration({ memoId, onOpenAuthor, onOpenWorldLineView }: MemoWorldLineIntegrationProps) {
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();
  const { apexMemo, update, moveBack, moveForward } = useMemoWorldLine(memoId);

  // Cmd/Ctrl+Z でデータ undo（= 世界線の親ノードへ moveBack）、
  // Cmd/Ctrl+Shift+Z で redo（moveForward）。フォーカス中の memo にだけ効かせる。
  // これにより apex が動き、世界線ビューの塗り点も追従する。
  useEffect(() => {
    if (focusedObjectId !== memoId) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) moveForward();
      else moveBack();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [focusedObjectId, memoId, moveBack, moveForward]);

  if (!apexMemo) {
    return <div style={{ opacity: 0.7 }}>このメモは見つからないか、まだ初期化されていません。</div>;
  }

  return (
    <div
      onFocus={() => setFocusedObjectId(memoId)}
      onMouseDown={() => setFocusedObjectId(memoId)}
      tabIndex={-1}
    >
      <MemoTitle
        memo={apexMemo}
        onSetAuthor={(userId) => update((current) => current.setAuthor(userId))}
        onOpenAuthor={onOpenAuthor}
        onOpenWorldLineView={onOpenWorldLineView}
      />
      <MemoEditor
        memo={apexMemo}
        memoId={memoId}
        onMemoChange={(updated) => update(() => updated)}
      />
    </div>
  );
}
