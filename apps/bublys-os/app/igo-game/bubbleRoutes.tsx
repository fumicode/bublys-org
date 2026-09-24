"use client";

import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { Button, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { IgoWorldLineIntegration } from "../world-line/integrations/IgoWorldLineIntegration";
import { IgoWorldLineCanvas } from "../world-line/integrations/IgoWorldLineCanvas";
import { IgoGameCard } from "./ui/IgoGameCard";
import { selectIgoGameIds } from "./feature/igoSelectors";
import { dispatchCreateIgoGame } from "./feature/igoActions";
import { IgoGame_囲碁ゲーム } from "./domain";

/**
 * 囲碁ゲーム - メインバブル（world-line-graph 統合版）
 */
const IgoGameBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "");

  return (
    <IgoWorldLineIntegration gameId={gameId} worldLineUrl={`igo-game/${gameId}/history`} />
  );
};

/**
 * 囲碁ゲーム - 世界線ビューバブル（canvas）
 */
const IgoGameWorldLinesBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "").replace("/history", "");
  return <IgoWorldLineCanvas gameId={gameId} />;
};

/**
 * 囲碁ゲーム - 対局一覧バブル ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。対局 1 件を泡にして、
 * 「少ないときは縦に並べる／多いときは奥行きに重ねる」を親の View に任せる。
 */
const IgoGamesBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  const gameIds = useAppSelector(selectIgoGameIds);
  const members = useMemo(() => gameIds.map((id) => `igo-games/${id}`), [gameIds]);
  // 「新しく作る」は並びの外（泡にはならない口）。**作ったらそのまま開く**
  const newGame = useCallback(() => {
    const gameId = crypto.randomUUID();
    dispatchCreateIgoGame(dispatch, IgoGame_囲碁ゲーム.create(gameId, 9));
    openBubble(`igo-game/${gameId}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);
  return (
    <ListSpace
      members={members}
      itemHeight={120}
      itemWidth={LIST_CARD_WIDTH}
      head={
        /* ★ 口は並びの右上の余白に置く（ListSpace の註）。
           札は 280、箱は 420 なので右に 56px 空く ── そこへ収まる大きさにする */
        <Tooltip title="新規対局" arrow>
          <Button
            size="small"
            variant="contained"
            onClick={newGame}
            sx={{ minWidth: 0, px: 1.35, py: 0.3, fontSize: 16.5, lineHeight: 1.5 }}
          >
            ＋新規
          </Button>
        </Tooltip>
      }
    />
  );
};

/** 対局 1 件 ── 一覧の中の泡 */
const IgoGameCardBubble: BubbleRoute["Component"] = ({ bubble }) => (
  <IgoGameCard gameId={bubble.url.replace("igo-games/", "")} />
);

/**
 * 囲碁ゲーム機能のバブルルート定義
 */
export const igoGameBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^igo-games$/,
    type: "igo-games",
    Component: IgoGamesBubble,
    // 地は中身が持つ（並びの空間は、海がそのまま透ける）
    // ★ 箱は札よりだいぶ大きく取る。奥へ退く札は**箱の左上の角**（消失点）へ寄るので、
    //   札が箱いっぱいだと退いても真上にしか出ず、左に覗かない ──
    //   議事録（版）は 300 の箱に 150 の札。ここは 420 の箱に 280 の札
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  {
    pattern: /^igo-games\/[^/]+$/,
    type: "igo-game-card",
    Component: IgoGameCardBubble,
    // 札は**巻物にならない**大きさ（見出し 27 + 余白 + サムネイル 64）
    bubbleOptions: { defaultSize: { width: LIST_CARD_WIDTH, height: 120 } },
  },
  {
    pattern: /^igo-game\/[^/]+\/history$/,
    type: "igo-game-history",
    Component: IgoGameWorldLinesBubble,
    // 他のバブルと同じ通常 BubbleView で描画する（fillsContainer は使わない）。
    // サイズは popChildViewPortBelow が明示的に与える（画面下部ストリップ）。
    // canvas は透明。背景は半透明の黒にして、後ろを透かしつつ世界線を見やすく。
    bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)" },
  },
  {
    pattern: /^igo-game\/[^/]+$/,
    type: "igo-game",
    Component: IgoGameBubble,
    // ★ **全部映ることが意味の画面**。盤 360px の右に手番の欄が付くので、
    //   実測（中身 572 × 511）が収まる大きさで開く ── 巻物にしない
    bubbleOptions: { contentBackground: "transparent", defaultSize: { width: 600, height: 570 } },
  },
];
