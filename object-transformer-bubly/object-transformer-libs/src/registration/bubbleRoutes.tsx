"use client";

import { FC, useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import {
  TransformerProvider,
  MappingEditorFeature,
  BatchConvertFeature,
  useTransformer,
} from "../feature/index.js";
import { RuleCard } from "../ui/RuleCard.js";

/**
 * **札 1 枚の中身の大きさ**（`chrome.ts`。枠が取るぶんは枠が外へ足す）。
 * 中身は「名前 ＋ 行き先」の 2 段なので、ほかの一覧の札より少しだけ高い。
 */
const RULE_CARD = { w: LIST_CARD_WIDTH, h: 54 } as const;

/** 一覧の右上に出す口の見た目（ほかの一覧の「＋新規」に合わせた寸法） */
const headBtn: React.CSSProperties = {
  font: "600 13px/1.5 -apple-system, sans-serif",
  padding: "4px 11px",
  borderRadius: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: "none",
  background: "#1976d2",
  color: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,.25)",
};

// マッピングエディタバブル
const MappingEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <TransformerProvider>
      {/* ★ 詳細の中身は枠から 12px 内側に置く（「ソース」が枠のすぐ内側から始まっていた） */}
      <div style={{ padding: 12 }}>
        <MappingEditorFeature bubbleId={bubble.id} />
      </div>
    </TransformerProvider>
  );
};

/**
 * ルール一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。ルール 1 つを泡にして、
 * 「どう並べるか」は親の View に任せる（ほかの一覧と同じ 7 つの並べ方が効く）。
 */
const RulesSpace: FC<{ bubbleId: string }> = ({ bubbleId }) => {
  const { rules } = useTransformer();
  const { openBubble } = useContext(BubblesContext);
  const members = useMemo(
    () => rules.map((r) => `object-transformer/rules/${r.id}/card`),
    [rules],
  );
  const newRule = useCallback(
    () => openBubble("object-transformer/editor", bubbleId),
    [openBubble, bubbleId],
  );
  return (
    <ListSpace
      members={members}
      itemWidth={RULE_CARD.w}
      itemHeight={RULE_CARD.h}
      /** 口は並びの右上の余白に置く（`ListSpace` の註） */
      head={
        <button style={headBtn} onClick={newRule}>
          ＋新規
        </button>
      }
    />
  );
};

// ルール一覧バブル
const RuleListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <TransformerProvider>
      <RulesSpace bubbleId={bubble.id} />
    </TransformerProvider>
  );
};

/** ルール 1 つの札 ── 一覧の中の泡 */
const RuleCardBubble: BubbleRoute["Component"] = ({ bubble }) => (
  <TransformerProvider>
    <RuleCardInner ruleId={bubble.params.ruleId} />
  </TransformerProvider>
);

const RuleCardInner: FC<{ ruleId: string }> = ({ ruleId }) => {
  const { rules, removeRule } = useTransformer();
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return null;
  return (
    <RuleCard
      ruleId={rule.id}
      name={rule.name}
      targetSchemaId={rule.targetSchemaId}
      fieldCount={rule.mappings.length}
      onDelete={removeRule}
    />
  );
};

// 一括変換バブル
const BatchConvertBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <TransformerProvider>
      {/* ★ 詳細の中身は枠から 12px 内側に置く（ほかの詳細と同じ） */}
      <div style={{ padding: 12 }}>
      <BatchConvertFeature
        ruleId={bubble.params.ruleId}
        bubbleId={bubble.id}
      />
      </div>
    </TransformerProvider>
  );
};

/** Object Transformer のバブルルート定義 */
export const objectTransformerBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "object-transformer/rules/:ruleId/convert",
    type: "batch-convert",
    Component: BatchConvertBubble,
    /** 落とし口と結果の表が縦に並ぶので、エディタと同じくらいの箱が要る */
    bubbleOptions: { defaultSize: { width: 560, height: 420 } },
  },
  {
    pattern: "object-transformer/rules/:ruleId/card",
    type: "rule-card",
    Component: RuleCardBubble,
    bubbleOptions: { defaultSize: { width: RULE_CARD.w, height: RULE_CARD.h } },
  },
  // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける
  {
    pattern: "object-transformer/rules",
    type: "rule-list",
    Component: RuleListBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
  },
  {
    pattern: "object-transformer/editor",
    type: "mapping-editor",
    Component: MappingEditorBubble,
    /**
     * ★ 既定の大きさ（中身の数）。落とし口が横に 2 つ並ぶので、
     *   1 つ 240 ＋ すき間 ＝ 横 560 要る。狭いと「ソースオブ / ジェクトを」と
     *   1 文字ずつ折り返して読めなくなる。
     */
    bubbleOptions: { defaultSize: { width: 560, height: 400 } },
  },
];
