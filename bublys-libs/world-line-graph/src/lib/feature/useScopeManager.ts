import { useCallback } from 'react';
import {
  useAppDispatch,
  useAppSelector,
} from '@bublys-org/state-management';
import {
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
  selectScopeIds,
} from './worldLineGraphSlice';

/**
 * useScopeManager — 共通 prefix を持つ WorldLineGraph スコープの管理フック
 *
 * スコープの一覧取得・作成・削除を提供する。
 * 個々のスコープ内のオブジェクト操作は WorldLineGraphProvider + useShellManager で行う。
 */
export function useScopeManager(prefix: string) {
  const dispatch = useAppDispatch();
  const scopeIds = useAppSelector((state) => selectScopeIds(state, prefix));

  const create = useCallback(
    (id: string) => {
      dispatch(createScopeAction(`${prefix}${id}`));
    },
    [dispatch, prefix]
  );

  const remove = useCallback(
    (id: string) => {
      dispatch(deleteScopeAction(`${prefix}${id}`));
    },
    [dispatch, prefix]
  );

  return { scopeIds, createScope: create, deleteScope: remove };
}
