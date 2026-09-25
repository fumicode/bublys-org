"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import {
  TransformerProvider,
  MappingEditorFeature,
  RuleListFeature,
  BatchConvertFeature,
} from "../feature/index.js";

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

// ルール一覧バブル
const RuleListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <TransformerProvider>
      <RuleListFeature bubbleId={bubble.id} />
    </TransformerProvider>
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
    pattern: "object-transformer/rules",
    type: "rule-list",
    Component: RuleListBubble,
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
