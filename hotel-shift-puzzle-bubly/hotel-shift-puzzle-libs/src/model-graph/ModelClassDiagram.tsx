"use client";

/**
 * このバブリのモデルのクラス図。
 *
 * 中身は**2つの出どころを重ねている**。どちらも推測ではなく、それぞれの持ち主から来る:
 *
 *   構造（クラス・フィールド・メソッド・つながり）
 *     … TypeScript のソースから生成（`modelGraph.generated.ts`）。
 *       生成物が古くなったら `modelGraph.staleness.test.ts` が落ちる
 *   世界線での所属（live / pinned / external）
 *     … 記述子（`objects/hotelObjects.tsx` の membership）から実行時に読む。
 *       ソースの型からは分からないので、ここで重ねる
 *
 * 別の出どころを混ぜないのが要点。構造を記述子に手で書くと図が黙って古くなるし、
 * 所属をソースから推すと当たらない。それぞれ知っている側に聞く。
 */
import { useCallback, useMemo, useState, type FC } from "react";
import { ClassDiagramView, type ModelGraph } from "@bublys-org/model-graph";
import { MODEL_GRAPH } from "./modelGraph.generated.js";
import { HOTEL_OBJECTS } from "../objects/hotelObjects.js";
import { membershipOf } from "../objects/framework.js";

/** クラス名 → 世界線への登録名（記述子から作る。手で書かない） */
const REGISTERED_NAME_OF: Record<string, string> = Object.fromEntries(
  Object.entries(HOTEL_OBJECTS).map(([type, d]) => [d.class.name, type])
);

/**
 * そのクラスが世界線でどう属するか。
 *
 * 登録されていないクラス（集約の中の部品・値オブジェクト）は **`undefined`**。
 * 「所属が無い」ではなく「所属という概念の対象ではない」ので、
 * 図には何も描かせない（`external` と読ませたら嘘になる）。
 */
function worldLineMembershipOf(className: string): string | undefined {
  const registered = REGISTERED_NAME_OF[className];
  if (!registered) return undefined;
  return membershipOf(registered).kind;
}

const S = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    background: "#0d1117",
    color: "#c9d1d9",
    font: "12px system-ui, sans-serif",
  } as React.CSSProperties,
  hud: {
    padding: "8px 10px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  } as React.CSSProperties,
  legend: { color: "#8b949e" } as React.CSSProperties,
  warn: { color: "#e3b341" } as React.CSSProperties,
  canvas: { flex: 1, minHeight: 0, overflow: "auto" } as React.CSSProperties,
};

export const ModelClassDiagram: FC<{ graph?: ModelGraph }> = ({
  graph = MODEL_GRAPH,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  // 図は横に長い（集約の数だけ列が並ぶ）ので、縮めて全体を見る手段が要る
  const [scale, setScale] = useState(1);
  const d = graph.diagnostics;
  const membership = useCallback(worldLineMembershipOf, []);

  const counts = useMemo(() => {
    const byKind = { aggregate: 0, part: 0, value: 0 };
    for (const c of graph.classes) byKind[c.kind]++;
    const contains = graph.relations.filter((r) => r.kind === "contains").length;
    return { byKind, contains, references: graph.relations.length - contains };
  }, [graph]);

  return (
    <div style={S.wrap}>
      <div style={S.hud}>
        <strong style={{ color: "#58a6ff" }}>モデルのクラス図</strong>
        <span style={S.legend}>
          集約 {counts.byKind.aggregate} / 部品 {counts.byKind.part} / 値{" "}
          {counts.byKind.value} ・ 内包 {counts.contains} / 参照 {counts.references}
        </span>
        <span style={S.legend}>
          縦＝同じ集約の内側（上が根） ・ 横＝別の集約
        </span>
        <span style={S.legend}>
          <span style={{ color: "#8b949e" }}>◆実線＝内包（一緒に巻き戻る）</span>{" "}
          <span style={{ color: "#e3b341" }}>→破線＝id で参照（別々に巻き戻る）</span>{" "}
          <span style={{ color: "#e3b341" }}>↻＝自分を返す更新メソッド</span>
        </span>
        <span style={S.legend}>
          出どころ: {d.sourceRoot}（{d.fileCount} ファイル）を生成時に読んだもの。
          所属（live/pinned/external）は記述子から
        </span>
        {d.classesWithoutState.length > 0 && (
          <span style={S.warn}>
            state を持たないクラス {d.classesWithoutState.length} 件はフィールドが空（
            {d.classesWithoutState.join(", ")}）
          </span>
        )}
        {d.unresolvedIdFields.length > 0 && (
          <span style={S.warn}>
            参照先を決められなかった id が {d.unresolvedIdFields.length} 件＝
            <b>その分だけ線が足りていない</b>（{d.unresolvedIdFields.join(", ")}）
          </span>
        )}
        <span style={S.legend}>
          表示{" "}
          {[0.5, 0.75, 1].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setScale(z)}
              style={{
                background: scale === z ? "#1f6feb" : "#21262d",
                color: "#c9d1d9",
                border: "1px solid #30363d",
                borderRadius: 4,
                padding: "2px 8px",
                marginRight: 4,
                cursor: "pointer",
              }}
            >
              {z * 100}%
            </button>
          ))}
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            style={{
              background: "#21262d",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            {selected} の選択を外す
          </button>
        )}
      </div>
      <div style={S.canvas}>
        <ClassDiagramView
          graph={graph}
          selected={selected}
          onSelect={setSelected}
          membershipOf={membership}
          scale={scale}
        />
      </div>
    </div>
  );
};
