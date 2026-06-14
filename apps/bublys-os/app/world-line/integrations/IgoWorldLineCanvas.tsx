'use client';
import { useContext, useEffect, useMemo } from 'react';
import { WorldLineGraph, type WorldNode } from '@bublys-org/world-line-graph';
import { WorldLinesCanvasView } from '@bublys-org/bubbles-ui';
import { WorldLineContext } from '../WorldLine/domain/WorldLineContext';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { World } from '../WorldLine/domain/World';

/** 旧 World[] を canvas ビュー用の WorldLineGraph に変換する。 */
function worldsToGraph(
  worlds: World<IgoGame_囲碁ゲーム>[],
  apexWorldId: string | null,
): WorldLineGraph {
  const nodes: Record<string, WorldNode> = {};
  let rootNodeId: string | null = null;
  worlds.forEach((w, i) => {
    nodes[w.worldId] = {
      id: w.worldId,
      parentId: w.parentWorldId,
      timestamp: i, // 配列順を保持（分岐の並び順に使われる）
      changedRefs: [],
      worldLineId: w.apexWorldLineId, // 同一世界線で色を揃える
    };
    if (w.parentWorldId === null) rootNodeId = w.worldId;
  });
  return new WorldLineGraph({ nodes, apexNodeId: apexWorldId, rootNodeId });
}

/**
 * 囲碁の世界線を bubbles-ui の canvas ビュー（左→右・分岐は下・横魚眼・自前
 * スクロール）で表示するアダプタ。
 *
 * 旧 World システムの {@link WorldLineContext} から worlds を読み、
 * {@link WorldLineGraph} に変換して {@link WorldLinesCanvasView} に渡す。
 *  - ノードクリック → setApex（その世界へ移動）
 *  - ← 親 / → 子 / ↑↓ 兄弟（フォーカス中のゲームのみ。矢印キーで世界線を移動）
 */
export function IgoWorldLineCanvas({ gameId }: { gameId: string }) {
  const { getAllWorlds, apexWorldId, setApex } = useContext(WorldLineContext);
  const { focusedObjectId } = useFocusedObject();
  const worlds = getAllWorlds() as World<IgoGame_囲碁ゲーム>[];

  // worlds は毎レンダー新規配列なので、内容シグネチャで graph/summary を安定化する。
  const sig =
    worlds.map((w) => `${w.worldId}:${w.parentWorldId}:${w.apexWorldLineId}`).join('|') +
    `#${apexWorldId}`;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graph = useMemo(() => worldsToGraph(worlds, apexWorldId), [sig]);

  const summaries = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of worlds) {
      const moves = w.worldState?.state.moveHistory.length ?? 0;
      m.set(w.worldId, moves > 0 ? `${moves}手` : '');
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // 矢印キーで世界線を移動（フォーカス中のゲームのみ）。
  useEffect(() => {
    if (focusedObjectId !== gameId) return;
    const onKey = (e: KeyboardEvent) => {
      const apex = apexWorldId ? graph.state.nodes[apexWorldId] : null;
      if (!apex) return;
      const childrenMap = graph.getChildrenMap();
      if (e.key === 'ArrowLeft') {
        if (!apex.parentId) return;
        e.preventDefault();
        setApex(apex.parentId);
      } else if (e.key === 'ArrowRight') {
        const children = childrenMap[apex.id] ?? [];
        if (children.length === 0) return;
        e.preventDefault();
        const sameLine = children.find((id) => graph.state.nodes[id]?.worldLineId === apex.worldLineId);
        setApex(sameLine ?? children[0]);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!apex.parentId) return;
        const siblings = childrenMap[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx < 0) return;
        const next = siblings[idx + (e.key === 'ArrowUp' ? -1 : 1)];
        if (!next) return;
        e.preventDefault();
        setApex(next);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [focusedObjectId, gameId, graph, apexWorldId, setApex]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <WorldLinesCanvasView
        graph={graph}
        apexNodeId={apexWorldId}
        getNodeSummary={(id) => summaries.get(id) ?? ''}
        onSelectNode={setApex}
        background="rgba(15,18,28,0.85)"
      />
    </div>
  );
}
