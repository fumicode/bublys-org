'use client';

import { FC, useCallback, useContext, useState } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import {
  MappingRule,
  applyMappingRule,
  type PlaneObjectLike,
} from "@bublys-org/object-transformer-model";
import { BatchConvertView } from "../ui/BatchConvertView.js";
import { useTransformer } from "./TransformerProvider.js";

type BatchConvertFeatureProps = {
  ruleId: string;
  bubbleId?: string;
};

// TODO: 実際のPlaneObjectリストはcsv-importerから取得する
// 現在は空配列のプレースホルダー
const usePlaneObjects = (): PlaneObjectLike[] => {
  return [];
};

export const BatchConvertFeature: FC<BatchConvertFeatureProps> = ({
  ruleId,
  bubbleId,
}) => {
  const { rules } = useTransformer();
  const { openBubble } = useContext(BubblesContext);
  const planeObjects = usePlaneObjects();

  const [results, setResults] = useState<Record<string, unknown>[] | null>(
    null
  );

  const ruleState = rules.find((r) => r.id === ruleId);

  const handleConvert = useCallback(() => {
    if (!ruleState) return;
    const rule = MappingRule.fromJSON(ruleState);
    const converted = applyMappingRule(planeObjects, rule);
    setResults(converted);
  }, [ruleState, planeObjects]);

  const handleBack = useCallback(() => {
    if (bubbleId) {
      openBubble("object-transformer/rules", bubbleId);
    }
  }, [openBubble, bubbleId]);

  if (!ruleState) {
    return <div>ルールが見つかりません</div>;
  }

  return (
    <BatchConvertView
      rule={ruleState}
      sourceCount={planeObjects.length}
      results={results}
      onConvert={handleConvert}
      onBack={handleBack}
    />
  );
};
