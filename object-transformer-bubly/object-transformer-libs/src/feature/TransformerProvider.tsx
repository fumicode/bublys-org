'use client';

import { FC, ReactNode, createContext, useCallback, useContext } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import type { MappingRuleState } from "@bublys-org/object-transformer-model";
import {
  addRule,
  updateRule,
  deleteRule,
  selectTransformerRules,
} from "../slice/transformer-slice.js";

// ========== Context ==========

type TransformerContextValue = {
  /** 保存済みルール一覧 */
  rules: MappingRuleState[];
  saveRule: (rule: MappingRuleState) => void;
  updateExistingRule: (rule: MappingRuleState) => void;
  removeRule: (ruleId: string) => void;
};

const TransformerContext = createContext<TransformerContextValue | null>(null);

export const useTransformer = (): TransformerContextValue => {
  const ctx = useContext(TransformerContext);
  if (!ctx) throw new Error("useTransformer must be used within TransformerProvider");
  return ctx;
};

// ========== Provider ==========

type TransformerProviderProps = {
  children: ReactNode;
};

export const TransformerProvider: FC<TransformerProviderProps> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const rules = useAppSelector(selectTransformerRules);

  const saveRule = useCallback(
    (rule: MappingRuleState) => {
      dispatch(addRule(rule));
    },
    [dispatch]
  );

  const updateExistingRule = useCallback(
    (rule: MappingRuleState) => {
      dispatch(updateRule(rule));
    },
    [dispatch]
  );

  const removeRule = useCallback(
    (ruleId: string) => {
      dispatch(deleteRule(ruleId));
    },
    [dispatch]
  );

  const value: TransformerContextValue = {
    rules,
    saveRule,
    updateExistingRule,
    removeRule,
  };

  return (
    <TransformerContext.Provider value={value}>
      {children}
    </TransformerContext.Provider>
  );
};
