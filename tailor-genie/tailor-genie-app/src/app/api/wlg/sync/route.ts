import { NextRequest, NextResponse } from 'next/server';
import type { WorldLineGraphJson } from '@bublys-org/world-line-graph';
import {
  saveCasEntry,
  loadCasEntry,
  saveGraph,
  loadGraph,
  listGraphScopeIds,
  listCasHashes,
} from './serverStore';

interface SyncBody {
  graphs: Array<{ scopeId: string; graph: WorldLineGraphJson }>;
  casEntries: Array<{ hash: string; data: unknown }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncBody;

    const graphPromises = body.graphs.map(({ scopeId, graph }) =>
      saveGraph(scopeId, graph),
    );
    const casPromises = body.casEntries.map(({ hash, data }) =>
      saveCasEntry(hash, data),
    );

    await Promise.all([...graphPromises, ...casPromises]);

    const scopeIds = await listGraphScopeIds();
    const casHashes = await listCasHashes();

    return NextResponse.json({
      ok: true,
      graphCount: scopeIds.length,
      casCount: casHashes.length,
    });
  } catch (err) {
    console.error('[wlg/sync] POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { scopeId, apexNodeId } = (await request.json()) as {
      scopeId: string;
      apexNodeId: string;
    };

    const graph = await loadGraph(scopeId);
    if (!graph) {
      return NextResponse.json({ error: 'scope not found' }, { status: 404 });
    }
    if (!graph.nodes[apexNodeId]) {
      return NextResponse.json({ error: 'node not found' }, { status: 404 });
    }

    graph.apexNodeId = apexNodeId;
    await saveGraph(scopeId, graph);

    return NextResponse.json({ ok: true, scopeId, apexNodeId });
  } catch (err) {
    console.error('[wlg/sync] PATCH error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const full = searchParams.get('full');
    const diff = searchParams.get('diff');
    const scopeId = searchParams.get('scopeId');
    const hash = searchParams.get('hash');

    // ?diff=true&knownHashes=h1,h2,h3 → graphs全量 + 未知CASのみ返す
    if (diff) {
      const knownParam = searchParams.get('knownHashes') || '';
      const knownHashes = new Set(
        knownParam ? knownParam.split(',') : [],
      );

      // Load all graphs
      const scopeIds = await listGraphScopeIds();
      const graphs: Record<string, WorldLineGraphJson> = {};
      for (const id of scopeIds) {
        const g = await loadGraph(id);
        if (g) graphs[id] = g;
      }

      // Find CAS entries the client doesn't have
      const allHashes = await listCasHashes();
      const newHashes = allHashes.filter((h) => !knownHashes.has(h));
      const cas: Record<string, unknown> = {};
      for (const h of newHashes) {
        const data = await loadCasEntry(h);
        if (data !== undefined) cas[h] = data;
      }

      return NextResponse.json({ graphs, cas });
    }

    // ?full=true → 全graph + 全CASを返す（Pull Sync用）
    if (full) {
      const scopeIds = await listGraphScopeIds();
      const graphs: Record<string, WorldLineGraphJson> = {};
      for (const id of scopeIds) {
        const g = await loadGraph(id);
        if (g) graphs[id] = g;
      }

      const casHashes = await listCasHashes();
      const cas: Record<string, unknown> = {};
      for (const h of casHashes) {
        const data = await loadCasEntry(h);
        if (data !== undefined) cas[h] = data;
      }

      return NextResponse.json({ graphs, cas });
    }

    // ?hash=xxx → 特定CASエントリの中身
    if (hash) {
      const data = await loadCasEntry(hash);
      if (data === undefined) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      return NextResponse.json({ hash, data });
    }

    // ?scopeId=xxx → graph + そのgraphが参照するCASエントリ
    if (scopeId) {
      const graph = await loadGraph(scopeId);
      if (!graph) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      const cas: Record<string, unknown> = {};
      for (const node of Object.values(graph.nodes)) {
        for (const ref of node.changedRefs) {
          const data = await loadCasEntry(ref.hash);
          if (data !== undefined) {
            cas[ref.hash] = data;
          }
        }
      }
      return NextResponse.json({ scopeId, graph, cas });
    }

    // デフォルト: 一覧
    const scopeIds = await listGraphScopeIds();
    const casHashes = await listCasHashes();
    return NextResponse.json({
      scopeIds,
      casCount: casHashes.length,
      casHashes,
    });
  } catch (err) {
    console.error('[wlg/sync] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
