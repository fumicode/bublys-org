"use client";
/**
 * メモのバブルルート ── **この lib が何を開けるか**の一覧。
 *
 * 前は OS のルート表（`apps/bublys-os/.../domain/bubbleRoutes.tsx`）に直に書かれていた。
 * メモをバブリにしたので、開けるものはメモ自身が持つ。
 */
import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext, deleteProcessBubble, removeBubble, WorldLineScopeView } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { Button } from "@mui/material";
import { useCasScope } from "@bublys-org/world-line-graph";
import { MemoCard } from "../ui/MemoCard.js";
import { Memo } from "../domain/Memo.js";
import { memoScopeId } from "../domain/MemoDomain.js";
import { dispatchCreateMemo } from "../feature/memoActions.js";
import { selectMemoIds } from "../feature/memoSelectors.js";
import { MemoDeleteConfirm } from "../feature/MemoDeleteConfirm.js";
import { MemoWorldLineIntegration } from "../feature/MemoWorldLineIntegration.js";

/** 泡の中身を描くもの（OS 側の `BubbleContentRenderer` と同じ形） */
type BubbleContentRenderer = BubbleRoute["Component"];

/**
 * 札 1 枚の**中身**の大きさ（`chrome.ts`）。枠が取るぶんは枠が外へ足す。
 *
 * ★ 高さは実測（中身は 46〜54px 要る）の上限 54。64 にしていたら枠の中が 30px しかなく、
 *   **札 1 枚ずつに巻物の棒が出ていた**。一覧は「全部映る」ことが意味の画面なので、
 *   1 枚ずつ巻物になるのは本末転倒。前は枠のぶん 34 を足した 88 を名乗っていた。
 */
const MEMO_CARD = { w: LIST_CARD_WIDTH, h: 54 };

/**
 * メモ一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。メモ 1 件を泡にして、
 * 「少ないときは縦に並べる／多いときは奥行きに重ねる」を親の View に任せる。
 */
const MemosBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  const memoIds = useAppSelector(selectMemoIds);
  const members = useMemo(() => memoIds.map((id) => `memos/${id}/card`), [memoIds]);
  // 「新しく作る」は並びの外（泡にはならない口）。**作ったらそのまま開く**
  const newMemo = useCallback(() => {
    const memo = Memo.create();
    dispatchCreateMemo(dispatch, memo);
    openBubble(`memos/${memo.id}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);
  return (
    <ListSpace
      members={members}
      itemWidth={MEMO_CARD.w}
      itemHeight={MEMO_CARD.h}
      head={
        <Button
          size="small"
          variant="contained"
          onClick={newMemo}
          sx={{ minWidth: 0, px: 1.35, py: 0.3, fontSize: 16.5, lineHeight: 1.5 }}
        >
          ＋新規
        </Button>
      }
    />
  );
};

/** メモ 1 件の札 ── 一覧の中の泡 */
const MemoCardBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const memoId = bubble.url.replace("memos/", "").replace("/card", "");
  return <MemoCard memoId={memoId} onDelete={(id) => openBubble(`memos/${id}/delete-confirm`, bubble.id)} />;
};

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenWorldLineView = () => {
    openBubble(`memos/${memoId}/history`, bubble.id);
  };
  return (
    <MemoWorldLineIntegration
      memoId={memoId}
      onOpenWorldLineView={handleOpenWorldLineView}
      worldLineUrl={`memos/${memoId}/history`}
    />
  );
};

const MemoDeleteConfirmBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const memoId = bubble.url.replace("memos/", "").replace("/delete-confirm", "");

  const closeSelf = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <MemoDeleteConfirm
      memoId={memoId}
      onDeleted={closeSelf}
      onCancel={closeSelf}
    />
  );
};

// Memo の世界線を canvas で表示。click でそのノードに移動できる。
// 履歴は /history なので popChildViewPortBelow で画面下部ストリップとして開く。
const MemoWorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "").replace("/history", "");
  const scope = useCasScope(memoScopeId(memoId));
  return <WorldLineScopeView scope={scope} nameable />;
};

/** メモが開けるもの */
export const memoBubbleRoutes: BubbleRoute[] = [
  { pattern: /^memos$/, type: "memos", Component: MemosBubble,
    // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける。箱は札 280 に対して広く取る
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" } },
  // ★ 札は詳細より**先に**置く（`memos/:id` が `.../card` も飲み込むので）
  { pattern: /^memos\/[^/]+\/card$/, type: "memo-card", Component: MemoCardBubble,
    bubbleOptions: { defaultSize: { width: MEMO_CARD.w, height: MEMO_CARD.h } } },
  { pattern: /^memos\/[^/]+\/delete-confirm$/, type: "memo-delete-confirm", Component: MemoDeleteConfirmBubble },
  { pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)" } },
  /**
   * ★ 詳細の既定の大きさ（中身の数）。題は 2 行で頭打ち（`MemoTitle`）なので、
   *   その 2 行 ＋ 作者の行 ＋ 本文が数行入る大きさ。
   */
  { pattern: /^memos\/[^/]+$/, type: "memo", Component: MemoBubble,
    bubbleOptions: { defaultSize: { width: 440, height: 340 } } },
];
