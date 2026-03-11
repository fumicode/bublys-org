"use client";

import { FC, useState, useEffect, useCallback } from "react";

type GraphSummary = {
  scopeId: string;
  nodeCount: number;
  apexNodeId: string | null;
  rootNodeId: string | null;
};

type ServerState = {
  graphs: Record<string, { nodes: Record<string, unknown>; apexNodeId: string | null; rootNodeId: string | null }>;
  cas: Record<string, unknown>;
};

export const ServerStateFeature: FC = () => {
  const [data, setData] = useState<ServerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const [expandedCas, setExpandedCas] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/wlg/sync?full=true");
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回 + 3秒ポーリング
  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const graphs: GraphSummary[] = data
    ? Object.entries(data.graphs).map(([scopeId, g]) => ({
        scopeId,
        nodeCount: Object.keys(g.nodes).length,
        apexNodeId: g.apexNodeId,
        rootNodeId: g.rootNodeId,
      }))
    : [];

  const casEntries = data ? Object.entries(data.cas) : [];

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Server State</h2>
        <button
          onClick={fetchData}
          style={{
            padding: "4px 12px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>

      {lastUpdated && (
        <div style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>
          Last updated: {lastUpdated.toLocaleTimeString()} (3s auto-refresh)
        </div>
      )}

      {loading && <div style={{ color: "#888" }}>Loading...</div>}
      {error && (
        <div style={{ color: "#d32f2f", padding: 8, background: "#ffebee", borderRadius: 4, marginBottom: 8 }}>
          Error: {error}
        </div>
      )}

      {data && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Graphs" value={graphs.length} color="#1976d2" />
            <StatCard label="CAS Entries" value={casEntries.length} color="#388e3c" />
            <StatCard label="Total Nodes" value={graphs.reduce((s, g) => s + g.nodeCount, 0)} color="#f57c00" />
          </div>

          {/* Graphs */}
          <Section title={`Graphs (${graphs.length})`}>
            {graphs.length === 0 ? (
              <Empty>No graphs</Empty>
            ) : (
              graphs.map((g) => (
                <div key={g.scopeId} style={{ marginBottom: 4 }}>
                  <div
                    onClick={() => setExpandedScope(expandedScope === g.scopeId ? null : g.scopeId)}
                    style={{
                      padding: "6px 8px",
                      background: "#f5f5f5",
                      borderRadius: 4,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{g.scopeId}</span>
                    <span style={{ color: "#888", fontSize: 11 }}>
                      {g.nodeCount} nodes
                    </span>
                  </div>
                  {expandedScope === g.scopeId && (
                    <div style={{ padding: "4px 8px", fontSize: 11, color: "#555" }}>
                      <div>apex: <Code>{g.apexNodeId ?? "null"}</Code></div>
                      <div>root: <Code>{g.rootNodeId ?? "null"}</Code></div>
                      <div style={{ marginTop: 4 }}>
                        <details>
                          <summary style={{ cursor: "pointer", color: "#1976d2" }}>Raw JSON</summary>
                          <pre style={{
                            background: "#fafafa",
                            padding: 8,
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 300,
                            fontSize: 10,
                            marginTop: 4,
                          }}>
                            {JSON.stringify(data.graphs[g.scopeId], null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </Section>

          {/* CAS */}
          <Section title={`CAS Entries (${casEntries.length})`}>
            {casEntries.length === 0 ? (
              <Empty>No CAS entries</Empty>
            ) : (
              casEntries.map(([hash, value]) => (
                <div key={hash} style={{ marginBottom: 4 }}>
                  <div
                    onClick={() => setExpandedCas(expandedCas === hash ? null : hash)}
                    style={{
                      padding: "6px 8px",
                      background: "#f5f5f5",
                      borderRadius: 4,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    <span>{hash}</span>
                    <span style={{ color: "#888" }}>
                      {getTypeLabel(value)}
                    </span>
                  </div>
                  {expandedCas === hash && (
                    <pre style={{
                      background: "#fafafa",
                      padding: 8,
                      borderRadius: 4,
                      overflow: "auto",
                      maxHeight: 200,
                      fontSize: 11,
                      color: "#222",
                      margin: "4px 0 0 0",
                    }}>
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const StatCard: FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{
    flex: 1,
    padding: "8px 12px",
    background: color,
    color: "white",
    borderRadius: 6,
    textAlign: "center",
  }}>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    <div style={{ fontSize: 11, opacity: 0.9 }}>{label}</div>
  </div>
);

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#333" }}>{title}</div>
    {children}
  </div>
);

const Empty: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: "#999", padding: 12, textAlign: "center" }}>{children}</div>
);

const Code: FC<{ children: React.ReactNode }> = ({ children }) => (
  <code style={{ background: "#e8e8e8", padding: "1px 4px", borderRadius: 2, fontFamily: "monospace", fontSize: 11 }}>
    {children}
  </code>
);

function getTypeLabel(value: unknown): string {
  if (value && typeof value === "object" && "type" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).type);
  }
  if (value && typeof value === "object" && "id" in (value as Record<string, unknown>)) {
    return `id:${String((value as Record<string, unknown>).id).slice(0, 8)}`;
  }
  return typeof value;
}
