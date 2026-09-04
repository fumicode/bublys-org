import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import type { MappingRuleState } from "@bublys-org/object-transformer-model";

// ========== State ==========

type TransformerState = {
  rules: MappingRuleState[];
};

const initialState: TransformerState = {
  rules: [],
};

// ========== Slice ==========

export const transformerSlice = createSlice({
  name: "objectTransformer",
  initialState,
  reducers: {
    addRule: (state, action: PayloadAction<MappingRuleState>) => {
      state.rules.push(action.payload);
    },
    updateRule: (state, action: PayloadAction<MappingRuleState>) => {
      const index = state.rules.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rules[index] = action.payload;
      }
    },
    deleteRule: (state, action: PayloadAction<string>) => {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
    },
  },
});

export const { addRule, updateRule, deleteRule } = transformerSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices
    extends WithSlice<typeof transformerSlice> {}
}

// rootReducerに注入（副作用として実行）
transformerSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithTransformer = RootState & {
  objectTransformer: TransformerState;
};

const selectRulesArray = (state: StateWithTransformer) =>
  state.objectTransformer?.rules ?? [];

/** ルール一覧を取得 */
export const selectTransformerRules = createSelector(
  [selectRulesArray],
  (rules): MappingRuleState[] => rules
);

/** IDでルールを取得 */
export const selectTransformerRuleById = (ruleId: string) =>
  createSelector(
    [selectRulesArray],
    (rules): MappingRuleState | undefined =>
      rules.find((r) => r.id === ruleId)
  );
