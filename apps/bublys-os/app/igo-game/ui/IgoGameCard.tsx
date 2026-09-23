'use client';
/**
 * 対局 1 件の札 ── **一覧の中で 1 つの泡になる**中身。
 *
 * 前は一覧（巻物）の中の行だった。泡にすると、並べ方の道具がそのまま効く
 * （縦に並べる／奥行きに重ねる）し、掴んで外へ出すこともできる。
 * 描くものは行のときと同じ ── 盤のサムネイル・名前・手数と状態。
 */
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { ObjectView } from '@bublys-org/bubbles-ui';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import styled from 'styled-components';
import { selectIgoGameAtApex } from '../feature/igoSelectors';
import { dispatchDeleteIgoGame } from '../feature/igoActions';
import { IgoBoardView } from './IgoBoardView';
import { IgoGame_囲碁ゲーム } from '../domain';

function statusLabel(game: IgoGame_囲碁ゲーム): string {
  if (game.state.status === 'finished') {
    if (game.state.winner) return `終局・${game.state.winner === 'black' ? '黒' : '白'}勝ち`;
    return '終局';
  }
  return `対局中・${game.currentTurnLabel}番`;
}

export function IgoGameCard({ gameId }: { gameId: string }) {
  const dispatch = useAppDispatch();
  const game = useAppSelector(selectIgoGameAtApex(gameId));
  if (!game) return <StyledCard>この対局は見つかりませんでした。</StyledCard>;

  const label = `${game.boardSize}路 対局`;
  return (
    <StyledCard>
      <div aria-hidden className="e-thumb">
        {/* 9 路盤は 360px。0.178 倍で 64px のサムネイルにする（札の中に収まる大きさ） */}
        <div style={{ transform: 'scale(0.178)', transformOrigin: 'top left', pointerEvents: 'none' }}>
          <IgoBoardView game={game} />
        </div>
      </div>
      <div className="e-main">
        {/* ダブルクリックで対局を開く（開く先は**外の海**）／ドラッグでポケットや岸へ */}
        {/* ★ `openingPosition` は「開いてよい」の合図として要る（旧 ObjectView の決まり）。
            どこに置くかは新しい模型では親の View が決めるので、値そのものは使われない */}
        <ObjectView
          type="IgoGame"
          url={`igo-game/${gameId}`}
          label={label}
          openingPosition="bubble-side-right"
        >
          <SportsEsportsIcon sx={{ color: '#dcb35c', fontSize: 18 }} />
          <span className="e-label">{label}</span>
        </ObjectView>
        <span className="e-meta">
          {game.state.moveHistory.length}手・{statusLabel(game)}
        </span>
      </div>
      <IconButton
        size="small"
        className="e-remove"
        title="この対局を消す"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('この対局を削除しますか？')) dispatchDeleteIgoGame(dispatch, gameId);
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </StyledCard>
  );
}

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-thumb {
    width: 64px;
    height: 64px;
    flex: 0 0 auto;
    overflow: hidden;
    border-radius: 6px;
  }
  .e-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .e-label {
    white-space: nowrap;
  }
  .e-meta {
    color: #6b7487;
    font-size: 12px;
  }
  .e-remove {
    margin-left: auto;
    flex: 0 0 auto;
  }
`;
