'use client';
import { useAppSelector, useAppDispatch } from '@bublys-org/state-management';
import { ObjectView } from '@bublys-org/bubbles-ui';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import styled from 'styled-components';
import { selectIgoGameIds, selectIgoGameAtApex } from '../feature/igoSelectors';
import { dispatchDeleteIgoGame } from '../feature/igoActions';
import { IgoBoardView } from './IgoBoardView';
import { IgoGame_囲碁ゲーム } from '../domain';

type IgoGameListProps = {
  buildDetailUrl: (gameId: string) => string;
  onGameClick?: (gameId: string, detailUrl: string) => void;
};

function statusLabel(game: IgoGame_囲碁ゲーム): string {
  if (game.state.status === 'finished') {
    if (game.state.winner) return `終局・${game.state.winner === 'black' ? '黒' : '白'}勝ち`;
    return '終局';
  }
  return `対局中・${game.currentTurnLabel}番`;
}

export function IgoGameList({ buildDetailUrl, onGameClick }: IgoGameListProps) {
  const dispatch = useAppDispatch();
  const gameIds = useAppSelector(selectIgoGameIds);
  const games = useAppSelector((state) =>
    gameIds
      .map((id) => {
        const game = selectIgoGameAtApex(id)(state);
        return game ? { id, game } : null;
      })
      .filter((x): x is { id: string; game: IgoGame_囲碁ゲーム } => x !== null),
  );

  if (games.length === 0) {
    return <div style={{ opacity: 0.7, padding: '8px 0' }}>まだ対局がありません。</div>;
  }

  return (
    <StyledList>
      {games.map(({ id, game }) => {
        const detailUrl = buildDetailUrl(id);
        const label = `${game.boardSize}路 対局`;
        return (
          <li key={id} className="e-item">
            <div aria-hidden className="e-thumb">
              {/* 9 路盤は 360px。0.2 倍で 72px のサムネイルにする。 */}
              <div style={{ transform: 'scale(0.2)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                <IgoBoardView game={game} />
              </div>
            </div>
            <div className="e-main">
              <ObjectView
                type="IgoGame"
                url={detailUrl}
                label={label}
                onClick={() => onGameClick?.(id, detailUrl)}
              >
                <SportsEsportsIcon sx={{ color: '#dcb35c', fontSize: 18 }} />
                <span>{label}</span>
              </ObjectView>
              <span className="e-meta">
                {game.state.moveHistory.length}手・{statusLabel(game)}
              </span>
            </div>
            <span className="e-button-group">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('この対局を削除しますか？')) {
                    dispatchDeleteIgoGame(dispatch, id);
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </span>
          </li>
        );
      })}
    </StyledList>
  );
}

const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  > .e-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    &:hover > .e-button-group {
      opacity: 1;
    }

    > .e-thumb {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 4px;
      background: #e8c887;
    }

    > .e-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;

      > .e-meta {
        font-size: 12px;
        color: #888;
      }
    }

    > .e-button-group {
      opacity: 0;
    }
  }
`;
