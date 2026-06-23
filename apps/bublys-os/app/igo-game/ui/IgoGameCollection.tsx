'use client';
import { Button } from '@mui/material';
import { useAppDispatch } from '@bublys-org/state-management';
import { IgoGameList } from './IgoGameList';
import { IgoGame_囲碁ゲーム } from '../domain';
import { dispatchCreateIgoGame } from '../feature/igoActions';

type IgoGameCollectionProps = {
  buildDetailUrl: (gameId: string) => string;
  onGameClick?: (gameId: string, detailUrl: string) => void;
};

/** 対局一覧 + 新規対局ボタン。 */
export function IgoGameCollection({ buildDetailUrl, onGameClick }: IgoGameCollectionProps) {
  const dispatch = useAppDispatch();

  const handleNewGame = () => {
    const gameId = crypto.randomUUID();
    const game = IgoGame_囲碁ゲーム.create(gameId, 9);
    // world-line-graph に scope と初期ゲームを seed してから開く
    dispatchCreateIgoGame(dispatch, game);
    onGameClick?.(gameId, buildDetailUrl(gameId));
  };

  return (
    <div style={{ padding: 16, minWidth: 280 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>囲碁 対局一覧</h3>
      <IgoGameList buildDetailUrl={buildDetailUrl} onGameClick={onGameClick} />
      <div style={{ marginTop: 16 }}>
        <Button variant="contained" onClick={handleNewGame}>
          新規対局
        </Button>
      </div>
    </div>
  );
}
