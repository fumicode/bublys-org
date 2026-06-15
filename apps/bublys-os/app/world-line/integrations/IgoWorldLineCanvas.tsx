'use client';
import { useMemo } from 'react';
import { useCasScope } from '@bublys-org/world-line-graph';
import { WorldLineScopeView, useScopeNodeSummaries, moveToSiblingBranch } from '@bublys-org/bubbles-ui';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { IGO_GAME_TYPE, igoScopeId } from '../../igo-game/domain/IgoGameDomain';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

// 各ノードの要約 = その局面の手数。
const formatMoves = (g: unknown) => {
  const n = (g as IgoGame_囲碁ゲーム).state.moveHistory.length;
  return n > 0 ? `${n}手` : '';
};

/**
 * 囲碁の世界線を共通の {@link WorldLineScopeView}（canvas: 左→右・分岐は下・
 * 横魚眼・自前スクロール）で表示する。scope は world-line-graph から直読み。
 *  - ノードクリック → moveTo（その世界へ移動）
 *  - ← 親 / → 子 / ↑↓ 兄弟（フォーカス中のゲームのみ。Cmd+Z は編集側が担当）
 *  - 要約は手数
 */
export function IgoWorldLineCanvas({ gameId }: { gameId: string }) {
  const { focusedObjectId } = useFocusedObject();
  const scope = useCasScope(igoScopeId(gameId));
  const getNodeSummary = useScopeNodeSummaries(scope, IGO_GAME_TYPE, gameId, formatMoves);

  // 矢印のみ・フォーカス中のゲーム限定（Cmd+Z は編集側 IgoWorldLineIntegration が担当）。
  const focused = focusedObjectId === gameId;
  const keyBindings = useMemo(
    () =>
      focused
        ? [
            { key: 'ArrowLeft', run: scope.moveBack },
            { key: 'ArrowRight', run: scope.moveForward },
            { key: 'ArrowUp', run: () => moveToSiblingBranch(scope, -1) },
            { key: 'ArrowDown', run: () => moveToSiblingBranch(scope, 1) },
          ]
        : [],
    [focused, scope],
  );

  return <WorldLineScopeView scope={scope} getNodeSummary={getNodeSummary} keyBindings={keyBindings} nameable />;
}
