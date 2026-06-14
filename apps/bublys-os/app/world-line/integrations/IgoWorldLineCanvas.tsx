'use client';
import { useEffect, useMemo } from 'react';
import { useCasScope } from '@bublys-org/world-line-graph';
import { WorldLinesCanvasView } from '@bublys-org/bubbles-ui';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { IGO_GAME_TYPE, igoScopeId } from '../../igo-game/domain/IgoGameDomain';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

/**
 * 囲碁の世界線を bubbles-ui の canvas ビュー（左→右・分岐は下・横魚眼・自前
 * スクロール）で表示する。world-line-graph の scope を直接読む（memo の履歴
 * バブルと同じ作り）。
 *  - ノードクリック → moveTo（その世界へ移動）
 *  - ← 親 / → 子 / ↑↓ 兄弟（フォーカス中のゲームのみ）
 *  - 要約は手数
 */
export function IgoWorldLineCanvas({ gameId }: { gameId: string }) {
  const { focusedObjectId } = useFocusedObject();
  const scope = useCasScope(igoScopeId(gameId));
  const apexId = scope.graph.getApex()?.id ?? null;

  const summaries = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of Object.keys(scope.graph.state.nodes)) {
      const game = scope.getObjectAt<IgoGame_囲碁ゲーム>(id, IGO_GAME_TYPE, gameId);
      const moves = game?.state.moveHistory.length ?? 0;
      m.set(id, moves > 0 ? `${moves}手` : '');
    }
    return m;
  }, [scope.graph, scope.getObjectAt, gameId]);

  // 矢印キーで世界線を移動（フォーカス中のゲームのみ）
  useEffect(() => {
    if (focusedObjectId !== gameId) return;
    const onKey = (e: KeyboardEvent) => {
      const apex = scope.graph.getApex();
      if (!apex) return;
      const childrenMap = scope.graph.getChildrenMap();
      if (e.key === 'ArrowLeft') {
        if (!apex.parentId) return;
        e.preventDefault();
        scope.moveTo(apex.parentId);
      } else if (e.key === 'ArrowRight') {
        const children = childrenMap[apex.id] ?? [];
        if (children.length === 0) return;
        e.preventDefault();
        const sameLine = children.find(
          (id) => scope.graph.state.nodes[id]?.worldLineId === apex.worldLineId,
        );
        scope.moveTo(sameLine ?? children[0]);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!apex.parentId) return;
        const siblings = childrenMap[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx < 0) return;
        const next = siblings[idx + (e.key === 'ArrowUp' ? -1 : 1)];
        if (!next) return;
        e.preventDefault();
        scope.moveTo(next);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [focusedObjectId, gameId, scope]);

  return (
    // バブルのコンテンツ領域いっぱいに canvas を広げる（サイズはバブル側が決める）。
    <div style={{ width: '100%', height: '100%' }}>
      <WorldLinesCanvasView
        graph={scope.graph}
        apexNodeId={apexId}
        getNodeSummary={(id) => summaries.get(id) ?? ''}
        onSelectNode={scope.moveTo}
        background="rgba(15,18,28,0.85)"
      />
    </div>
  );
}
