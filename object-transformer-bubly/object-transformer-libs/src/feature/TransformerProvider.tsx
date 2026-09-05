'use client';

import { FC, ReactNode, createContext, useCallback, useContext } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  DomainSchema,
  STAFF_SCHEMA,
  type MappingRuleState,
} from "@bublys-org/object-transformer-model";
import {
  addRule,
  updateRule,
  deleteRule,
  selectTransformerRules,
} from "../slice/transformer-slice.js";

// ========== Context ==========

type TransformerContextValue = {
  /** 利用可能なスキーマ一覧（現在はハードコード） */
  schemas: DomainSchema[];
  getSchema: (id: string) => DomainSchema | undefined;
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

/** 利用可能なスキーマ（今回はハードコード） */
const AVAILABLE_SCHEMAS: DomainSchema[] = [STAFF_SCHEMA];

export const TransformerProvider: FC<TransformerProviderProps> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const rules = useAppSelector(selectTransformerRules);

  const getSchema = useCallback(
    (id: string) => AVAILABLE_SCHEMAS.find((s) => s.id === id),
    []
  );

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
    schemas: AVAILABLE_SCHEMAS,
    getSchema,
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
