'use client';

import { FC, useCallback, useContext } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { RuleListView } from "../ui/RuleListView.js";
import { useTransformer } from "./TransformerProvider.js";

type RuleListFeatureProps = {
  bubbleId?: string;
};

export const RuleListFeature: FC<RuleListFeatureProps> = ({ bubbleId }) => {
  const { rules, removeRule } = useTransformer();
  const { openBubble } = useContext(BubblesContext);

  const buildRuleUrl = useCallback(
    (ruleId: string) => `object-transformer/rules/${ruleId}/convert`,
    []
  );

  const handleDeleteRule = useCallback(
    (ruleId: string) => {
      removeRule(ruleId);
    },
    [removeRule]
  );

  const handleNavigateToEditor = useCallback(() => {
    if (bubbleId) {
      openBubble("object-transformer/editor", bubbleId);
    }
  }, [openBubble, bubbleId]);

  return (
    <RuleListView
      rules={rules}
      buildRuleUrl={buildRuleUrl}
      onDeleteRule={handleDeleteRule}
      onNavigateToEditor={handleNavigateToEditor}
    />
  );
};
