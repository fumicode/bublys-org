"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import {
  TransformerProvider,
  MappingEditorFeature,
  RuleListFeature,
  BatchConvertFeature,
} from "@bublys-org/object-transformer-libs";

// マッピングエディタバブル
const MappingEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <TransformerProvider>
      <MappingEditorFeature bubbleId={bubble.id} />
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
      <BatchConvertFeature
        ruleId={bubble.params.ruleId}
        bubbleId={bubble.id}
      />
    </TransformerProvider>
  );
};

/** Object Transformer のバブルルート定義 */
export const objectTransformerBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "object-transformer/rules/:ruleId/convert",
    type: "batch-convert",
    Component: BatchConvertBubble,
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
  },
];
