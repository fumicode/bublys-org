"use client";

import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { Button, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LIST_BOX, ListSpace } from "@bublys-org/bubble-layout-feature";
import { METRICS } from "@bublys-org/bubble-layout";
import { IgoWorldLineIntegration } from "../world-line/integrations/IgoWorldLineIntegration";
import { IgoWorldLineCanvas } from "../world-line/integrations/IgoWorldLineCanvas";
import { IgoGameCard } from "./ui/IgoGameCard";
import { IDEAL_CHARS, igoCardWidth, widthOfChars } from "./ui/igoCardWidth";
import { selectIgoGameAtApex, selectIgoGameIds } from "./feature/igoSelectors";
import { dispatchCreateIgoGame } from "./feature/igoActions";
import { IgoGame_囲碁ゲーム } from "./domain";
// 自分の型を名乗る（副作用。`object-type-registration.ts` の註）
import "./object-type-registration";

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
 * **対局の札 1 枚の大きさ ── 中身から出した数。**
 *
 * > 札の大きさは札の中身が決める。箱（一覧の窓）は決めない。
 * > ただし幅は箱と折り合いを付ける ── **理想 12 文字・下限 7 文字**（`igoCardWidth`）。
 *
 * ★ **これは中身の数**（`chrome.ts`）。枠が取るぶんは枠が外へ足すので、ここには入れない。
 *
 * 高さは**盤のサムネイル 64 ＋ 上下の余白 10** ── 3 行の字（19.5 ＋ 18 ＋ 18 ＋ すき間 4 ＝ 59.5）
 * より盤のほうが高いので、盤が決める。上下の余白を左右と同じ 10 にして 84。
 *
 * ★ 前は `LIST_CARD_WIDTH`（392 ＝ **一覧の箱 − 余白**）を借りていた。中身に対して 152px 余り、
 *   ×の口が遠くに浮いていた（実測）。高さ 120 も「海に出たときの箱」から決めていたので、
 *   一覧の中では上下に 34px 余っていた。
 */
const IGO_CARD = { w: widthOfChars(IDEAL_CHARS), h: 84 } as const;

/**
 * **一覧の中身の大きさ ── 札から出す。**
 *
 * > 一覧の箱の幅は、札の幅から決まる（札の箱 ＋ 並びの左右の余白）。
 *
 * ```
 * 札の中身 308 ＋ 並びの余白 14×2 ＝ 336
 * ```
 *
 * ★ **装いは足さない。** 詰める並びの札は装いを持たない（`CHROME.packed` ＝ 0）ので、
 *   札の箱はそのまま中身。隙間は並べ方が決める（`LIST_GAP`）。
 *
 * ★ 前は `LIST_BOX`（406）を使っていた。あれは**札 378（メモ・タスクの札）に合わせた既定**で、
 *   囲碁の札を中身から 322 に決め直したあとも古い数のままだったので、
 *   **縦に並べたとき左右に 42px ずつ空いていた**（上下は 0 で接しているのに）。
 */
const IGO_LIST = { w: IGO_CARD.w + METRICS.PAD * 2, h: LIST_BOX.height } as const;

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
  /**
   * **いちばん長い名前の文字数。** 札の幅はこれと「並びに使える幅」で決まる
   * （`igoCardWidth`：理想 12 文字・下限 7 文字・12 超えは余地があるときだけ）。
   * 返すのは数なので、毎回同じなら再描画しない。
   */
  const longestName = useAppSelector((state) =>
    gameIds.reduce((max, id) => {
      const name = selectIgoGameAtApex(id)(state)?.state.name ?? "";
      return Math.max(max, [...name].length);
    }, 0),
  );
  // 「新しく作る」は並びの外（泡にはならない口）。**作ったらそのまま開く**
  const newGame = useCallback(() => {
    const gameId = crypto.randomUUID();
    dispatchCreateIgoGame(dispatch, IgoGame_囲碁ゲーム.create(gameId, 9));
    openBubble(`igo-game/${gameId}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);
  return (
    <ListSpace
      members={members}
      itemHeight={IGO_CARD.h}
      // 幅は札が決める ── 並びに使える幅を受けて、理想 12 文字・下限 7 文字で折り合う
      itemWidth={(room) => igoCardWidth(longestName, room)}
      head={
        /* ★ 口は並びの右上の余白に置く（ListSpace の註）。
           札 322 に対して箱は 420 なので、右の余白に収まる大きさにする */
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
    // 地は中身が持つ（並びの空間は、海がそのまま透ける）。幅は札から出す（IGO_LIST の註）
    bubbleOptions: { defaultSize: { width: IGO_LIST.w, height: IGO_LIST.h }, contentBackground: "transparent" },
  },
  {
    pattern: /^igo-games\/[^/]+$/,
    type: "igo-game-card",
    Component: IgoGameCardBubble,
    // 大きさは中身から出した数（{@link IGO_CARD} の註）。一覧の箱からは借りない
    bubbleOptions: { defaultSize: { width: IGO_CARD.w, height: IGO_CARD.h } },
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
    /**
     * ★ **全部映ることが意味の画面**。大きさは中身の実測から（**中身の数** ── chrome.ts）:
     *
     * ```
     * 横  余白16 ＋ 盤360 ＋ すき間16 ＋ 手番の欄180 ＋ 余白16      ＝ 588
     * 縦  余白16 ＋ 名前の行31 ＋ すき間16 ＋ 盤360 ＋ 余白16       ＝ 439
     * ```
     *
     * ★ 前は 586×536 で、**縦に 97px 余っていた**（盤の行が `flex:1` で余りを吸うので、
     *   見た目は下の余白として出る）。横は逆に 2px 足りず、手番の欄が潰れていた。
     */
    bubbleOptions: { contentBackground: "transparent", defaultSize: { width: 588, height: 439 } },
  },
];
