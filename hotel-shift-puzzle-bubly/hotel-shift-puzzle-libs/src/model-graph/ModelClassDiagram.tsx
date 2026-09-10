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
import {
  ClassDiagramView,
  type ClassScope,
  type ModelGraph,
} from "@bublys-org/model-graph";
import { MODEL_GRAPH } from "./modelGraph.generated.js";
import { HOTEL_OBJECTS } from "../objects/hotelObjects.js";
import { membershipOf, pinnedTypesOf } from "../objects/framework.js";
import { APP_SCOPE_ID } from "../objects/commit.js";

/**
 * スコープIDの**形**を取り出すための置き id。
 * クラス図は型の図なので実体の id が無い。`homeScope` に渡すと `Schedule:<id>` が返る
 */
const SCOPE_ID_SENTINEL = "<id>";

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

/**
 * そのクラスがどの世界線スコープに属するか。
 *
 * ★ `homeScope` に**sentinel の id を渡してスコープの形を取り出す**。
 *   クラス図は型の図なので実体の id が無い。`homeScope("<id>")` を呼べば
 *   `Schedule:<id>` が返る＝そのスコープの**形**がそのまま読める。
 *   ここを手で `"Schedule:<id>"` と書くと、記述子の規約を変えたとき図が古くなる。
 *
 * 焼き付けメンバー（pinned）が**どの世界に焼かれるか**は、メンバー側の宣言には
 * 書いていない（オーナー側の `scope.pinTypes` が決める）ので、記述子を走査して探す。
 */
function worldLineScopeOf(className: string): ClassScope | undefined {
  const registered = REGISTERED_NAME_OF[className];
  if (!registered) return undefined;
  const membership = membershipOf(registered);

  if (membership.kind === "live") {
    const scopeId = membership.homeScope(SCOPE_ID_SENTINEL);
    // グローバル固定IDのときだけ本籍を持たない型がある（勤務帯セット）。
    // 形が取れないものは「世界に属さない」と同じ扱いにする
    return scopeId ? { scopeId, role: "live" } : undefined;
  }
  if (membership.kind === "pinned") {
    // 「誰が焼き付けるか」はオーナー側の宣言。記述子を直に覗かず、
    // 宣言を読むための関数（pinnedTypesOf）を通す
    const owner = Object.keys(HOTEL_OBJECTS).find((type) =>
      pinnedTypesOf(type).includes(registered)
    );
    if (!owner) return undefined;
    const ownerMembership = membershipOf(owner);
    const scopeId =
      ownerMembership.kind === "live"
        ? ownerMembership.homeScope(SCOPE_ID_SENTINEL)
        : undefined;
    return scopeId ? { scopeId, role: "pinned" } : undefined;
  }
  return { scopeId: APP_SCOPE_ID, role: "external" };
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

const btn: React.CSSProperties = {
  background: "#21262d",
  color: "#c9d1d9",
  border: "1px solid #30363d",
  borderRadius: 4,
  padding: "2px 8px",
  marginRight: 4,
  cursor: "pointer",
};

export const ModelClassDiagram: FC<{ graph?: ModelGraph }> = ({
  graph = MODEL_GRAPH,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  // 図は横に長い（集約の数だけ列が並ぶ）ので、縮めて全体を見る手段が要る
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<"force" | "column">("force");
  /**
   * ユーザーが動かした箱の位置。**この窓を開いているあいだだけ覚える。**
   * 図の見方の好みであってドメインのデータではないので、世界線には載せない
   */
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const move = useCallback(
    (name: string, at: { x: number; y: number }) =>
      setPositions((prev) => ({ ...prev, [name]: at })),
    []
  );
  const d = graph.diagnostics;
  const membership = useCallback(worldLineMembershipOf, []);
  const scope = useCallback(worldLineScopeOf, []);

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
          配置{" "}
          {(
            [
              ["force", "力学（近いものを近くに）"],
              ["column", "列（集約ごと）"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{ ...btn, background: mode === m ? "#1f6feb" : "#21262d" }}
            >
              {label}
            </button>
          ))}
          {Object.keys(positions).length > 0 && (
            <button type="button" onClick={() => setPositions({})} style={btn}>
              並びを戻す（{Object.keys(positions).length} 個動かした）
            </button>
          )}
        </span>
        <span style={S.legend}>
          箱はドラッグで動かせる ・{" "}
          <span style={{ color: "#39c5cf" }}>シアンの枠＝世界線スコープ</span>
          （一緒に保存され、一緒に巻き戻る範囲）・{" "}
          <span style={{ color: "#39c5cf" }}>▌＝その世界に焼き付けられる</span>
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
              style={{ ...btn, background: scale === z ? "#1f6feb" : "#21262d" }}
            >
              {z * 100}%
            </button>
          ))}
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            style={btn}
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
          scopeOf={scope}
          scale={scale}
          mode={mode}
          positions={positions}
          onMove={move}
        />
      </div>
    </div>
  );
};
