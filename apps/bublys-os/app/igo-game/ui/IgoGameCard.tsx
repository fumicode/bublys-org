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

  /**
   * ★ 札の題名は**その対局の名前**。前は `${game.boardSize}路 対局` と種類を出していたので、
   *   この海の対局は全部 9 路 ＝ **どの札も同じ字**で、題名が 1 文字も働いていなかった。
   *   名前が無いうちは「無題」と言う（＝ 名前が無いことが見える）。付けるのは対局の画面。
   */
  const label = game.displayName;
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
          <span className="e-label" style={game.hasName ? undefined : { opacity: 0.55 }}>{label}</span>
        </ObjectView>
        {/*
          ★ **3 行の意味を分ける。**
            1 行目 … 名前（人が付けたもの）
            2 行目 … 正体（変わらない性質）── ここが前は 1 行目に間借りしていた
            3 行目 … 状態（変わるもの）
          ★ 種類（「対局」）も出す ── 札は一覧から**外へ出せる**（岸・ポケット・海）ので、
            一覧の外では「これは何か」を自分で言えないといけない。中では自明でも、外では違う。
        */}
        <span className="e-kind">{game.boardSize}路 対局</span>
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
  /* 上下も左右と同じ 10（札の高さ 84 ＝ 盤 64 ＋ 10×2 ── bubbleRoutes の IGO_CARD） */
  padding: 10px;
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
    /* 札の幅は名前 12 文字ぶんで決めてある（bubbleRoutes の IGO_CARD）。
       文字ブロックはそこからはみ出さない ── はみ出すと ×の口が押し出される */
    max-width: 100%;
  }
  /* 中の 3 行も、はみ出さずに切れるように（flex の子は既定で縮まない） */
  .e-main > * {
    min-width: 0;
    max-width: 100%;
  }
  /*
   * ★ **12 文字を超えた名前は … で切る。**
   *   幅を「名前 12 文字」で定義した以上、それより長い名前は切るしかない
   *   ── 折り返すと 3 行が 4 行になって、高さの定義（サムネイル 64）も崩れる。
   */
  .e-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  /* 正体の行。名前より静かに、状態より落ち着いた色で */
  .e-kind {
    color: #46506a;
    font-size: 12px;
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
