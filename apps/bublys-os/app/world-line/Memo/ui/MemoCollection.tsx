import { Button } from '@mui/material';
import { MemoList } from './MemoList';
import { Memo } from '../domain/Memo';
import { serializeMemo } from '../feature/MemoManager';
import { useAppDispatch, initialize } from '@bublys-org/state-management';
import { WorldLineState } from '@bublys-org/state-management';

type MemoCollectionProps = {
  onSelectMemo: (memoId: string) => void;
};

export function MemoCollection({ onSelectMemo }: MemoCollectionProps) {
  const dispatch = useAppDispatch();

  const handleAddMemo = () => {
    // 新しいメモを作成
    const newMemo = Memo.create();
    const memoId = newMemo.id;

    // 世界線の初期状態を作成
    const rootWorldId = crypto.randomUUID();
    const worldLineState: WorldLineState = {
      worlds: [
        {
          id: rootWorldId,
          world: {
            worldId: rootWorldId,
            parentWorldId: null,
            worldState: serializeMemo(newMemo),
          },
        },
      ],
      apexWorldId: rootWorldId,
      rootWorldId: rootWorldId,
    };

    // 世界線システムに初期化
    dispatch(initialize({ objectId: memoId, worldLine: worldLineState }));

    // 新しいメモのバブルを開く
    onSelectMemo(memoId);
  };

  return (
    <div>
      <MemoList onSelectMemo={onSelectMemo} />
      <div style={{ marginTop: '16px' }}>
        <Button variant="contained" onClick={handleAddMemo}>
          メモを追加
        </Button>
      </div>
    </div>
  );
}
