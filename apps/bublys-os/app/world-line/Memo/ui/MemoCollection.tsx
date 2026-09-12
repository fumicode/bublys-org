import { Button } from '@mui/material';
import { MemoList } from './MemoList';
import { Memo } from '../domain/Memo';
import { useAppDispatch } from '@bublys-org/state-management';
import { dispatchCreateMemo } from '../feature/memoActions';

type MemoCollectionProps = {
  buildDetailUrl: (memoId: string) => string;
  buildDeleteUrl: (memoId: string) => string;
  /** 「メモを追加」で作った新規メモを開く（一覧の行を開くのはダブルクリック） */
  onOpenMemo?: (memoId: string, detailUrl: string) => void;
  onMemoDelete?: (memoId: string) => void;
};

export function MemoCollection({ buildDetailUrl, buildDeleteUrl, onOpenMemo, onMemoDelete }: MemoCollectionProps) {
  const dispatch = useAppDispatch();

  const handleAddMemo = () => {
    const newMemo = Memo.create();
    // world-line-graph に scope と初期 memo を seed する
    dispatchCreateMemo(dispatch, newMemo);
    // 新しいメモのバブルを開く
    onOpenMemo?.(newMemo.id, buildDetailUrl(newMemo.id));
  };

  const handleDelete = (memoId: string) => {
    onMemoDelete?.(memoId);
  };

  return (
    <div>
      <MemoList
        buildDetailUrl={buildDetailUrl}
        buildDeleteUrl={buildDeleteUrl}
        onMemoDelete={handleDelete}
      />
      <div style={{ marginTop: '16px' }}>
        <Button variant="contained" onClick={handleAddMemo}>
          メモを追加
        </Button>
      </div>
    </div>
  );
}
