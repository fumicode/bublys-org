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

  const handleSelectRule = useCallback(
    (ruleId: string) => {
      if (bubbleId) {
        openBubble(`object-transformer/rules/${ruleId}/convert`, bubbleId);
      }
    },
    [openBubble, bubbleId]
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
      onSelectRule={handleSelectRule}
      onDeleteRule={handleDeleteRule}
      onNavigateToEditor={handleNavigateToEditor}
    />
  );
};
