import { Button } from '@mui/material';
import { MemoList } from './MemoList';
import { Memo } from '../domain/Memo';
import { useAppDispatch } from '@bublys-org/state-management';
import { dispatchCreateMemo } from '../feature/memoActions';

type MemoCollectionProps = {
  buildDetailUrl: (memoId: string) => string;
  buildDeleteUrl: (memoId: string) => string;
  onMemoClick?: (memoId: string, detailUrl: string) => void;
  onMemoDelete?: (memoId: string) => void;
};

export function MemoCollection({ buildDetailUrl, buildDeleteUrl, onMemoClick, onMemoDelete }: MemoCollectionProps) {
  const dispatch = useAppDispatch();

  const handleAddMemo = () => {
    const newMemo = Memo.create();
    // world-line-graph に scope と初期 memo を seed する
    dispatchCreateMemo(dispatch, newMemo);
    // 新しいメモのバブルを開く
    onMemoClick?.(newMemo.id, buildDetailUrl(newMemo.id));
  };

  const handleDelete = (memoId: string) => {
    onMemoDelete?.(memoId);
  };

  return (
    <div>
      <MemoList
        buildDetailUrl={buildDetailUrl}
        buildDeleteUrl={buildDeleteUrl}
        onMemoClick={onMemoClick}
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
