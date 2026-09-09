'use client';

/**
 * WorldLineInspector — 世界線の中身を覗く（Redux と IndexedDB を突き合わせる）
 *
 * 見たいのは主に「参照はあるのに値が無い」のズレ。世界線のグラフ（参照）は消えないが、
 * 値はメモリ上の CAS から追い出されて IndexedDB にだけ残る。この2つを並べて出す。
 *
 * 読み取り専用。世界線には一切書き込まない（覗くだけで世界が動いてはいけない）。
 * 行の組み立ては inspectorModel の純粋関数に寄せてあり、そちらでテストしている。
 */
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@bublys-org/state-management';
import type { RootState } from '@bublys-org/state-management';
import { WorldLineGraph } from '../domain/WorldLineGraph';
import { MAX_CAS_ENTRIES } from './worldLineGraphSlice';
import {
  listGraphScopeIdsFromIDB,
  listStateHashesFromIDB,
  loadStateFromIDB,
} from './IndexedDBStore';
import {
  buildNodeRows,
  buildScopeRows,
  buildStateRows,
  type InspectorSources,
} from './inspectorModel';
import { WorldLineInspectorView } from '../ui/WorldLineInspectorView';

export type WorldLineInspectorProps = {
  /** 最初に選んでおくスコープ */
  defaultScopeId?: string;
};

export const WorldLineInspector: FC<WorldLineInspectorProps> = ({ defaultScopeId }) => {
  const graphs = useAppSelector((s: RootState) => s.worldLineGraph?.graphs ?? {});
  const cas = useAppSelector((s: RootState) => s.worldLineGraph?.cas ?? {});

  const [idbScopeIds, setIdbScopeIds] = useState<string[] | null>(null);
  const [idbHashes, setIdbHashes] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(false);
  /** メモリに無いものを人が明示的に引いてきた値 */
  const [fetched, setFetched] = useState<Record<string, unknown>>({});

  const [scopeId, setScopeId] = useState<string | null>(defaultScopeId ?? null);
  const [nodeId, setNodeId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([listGraphScopeIdsFromIDB(), listStateHashesFromIDB()])
      .then(([ids, hashes]) => {
        setIdbScopeIds(ids);
        setIdbHashes(new Set(hashes));
      })
      .catch((e) => {
        console.warn('世界線インスペクタ: IndexedDB を読めませんでした', e);
        setIdbScopeIds([]);
        setIdbHashes(new Set());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const sources = useMemo<InspectorSources>(
    () => ({ cas, idbHashes, fetched }),
    [cas, idbHashes, fetched]
  );

  const scopes = useMemo(
    () => buildScopeRows(graphs, idbScopeIds),
    [graphs, idbScopeIds]
  );

  const graph = useMemo(() => {
    const json = scopeId ? graphs[scopeId] : undefined;
    return json ? WorldLineGraph.fromJSON(json) : null;
  }, [graphs, scopeId]);

  const nodes = useMemo(
    () => (graph ? buildNodeRows(graph, sources) : []),
    [graph, sources]
  );

  // スコープを選び直したら、そのスコープの apex を初期選択にする
  useEffect(() => {
    if (!graph) return;
    setNodeId((prev) => (prev && graph.state.nodes[prev] ? prev : graph.state.apexNodeId));
  }, [graph]);

  const stateAtNode = useMemo(
    () => (graph && nodeId ? buildStateRows(graph, nodeId, sources) : []),
    [graph, nodeId, sources]
  );

  const loadValue = useCallback((hash: string) => {
    loadStateFromIDB(hash)
      .then((data) => {
        if (data === undefined) return;
        setFetched((prev) => ({ ...prev, [hash]: data }));
      })
      .catch((e) => console.warn('世界線インスペクタ: 値を引けませんでした', e));
  }, []);

  return (
    <WorldLineInspectorView
      memoryScopeCount={Object.keys(graphs).length}
      memoryCasCount={Object.keys(cas).length}
      casLimit={MAX_CAS_ENTRIES}
      idbScopeCount={idbScopeIds?.length ?? null}
      idbStateCount={idbHashes?.size ?? null}
      scopes={scopes}
      selectedScopeId={scopeId}
      onSelectScope={setScopeId}
      nodes={nodes}
      selectedNodeId={nodeId}
      onSelectNode={setNodeId}
      stateAtNode={stateAtNode}
      onReload={reload}
      onLoadValue={loadValue}
      loading={loading}
    />
  );
};
