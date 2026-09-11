"use client";

/**
 * このバブリのモデルのクラス図。
 *
 * 中身は**2つの出どころを重ねている**。どちらも推測ではなく、それぞれの持ち主から来る:
 *
 *   構造（クラス・フィールド・メソッド・つながり）
 *     … TypeScript のソースから生成（`modelGraph.generated.ts`）。
 *       集約の根は**スライスの宣言**から読む（このリポジトリではスライスが集約の
 *       リポジトリ）。生成物が古くなったら `modelGraph.staleness.test.ts` が落ちる
 *   世界線での所属
 *     … world-line の宣言（`SHIFT_TYPE` と `shiftPlanScopeId`）から実行時に読む
 *
 * ★ hotel-shift-puzzle との違いはここが面白い。hotel は**集約の根**（勤務表）が
 *   まるごと世界線に載るが、このバブリは根の `ShiftPlan` ではなく、その部品の
 *   `Shift` だけが載る。枠が `ShiftPlan` を含まないのはそのため——巻き戻るのは
 *   シフトの中身であって、シフト表そのものではない。図はそれを黙って丸めない。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  ClassDiagramView,
  type ClassScope,
  type ModelGraph,
} from "@bublys-org/model-graph";
import { MODEL_GRAPH } from "./modelGraph.generated.js";
import { SHIFT_TYPE, shiftPlanScopeId } from "../world-line/shiftPlanTabs.js";

/**
 * スコープIDの**形**を取り出すための置き id。
 * クラス図は型の図なので実体の id が無い。`shiftPlanScopeId` に渡すと
 * `shift-plan:<id>` が返る＝そのスコープの形がそのまま読める。
 * ここを手で書くと、命名の規約を変えたとき図が古くなる。
 */
const SCOPE_ID_SENTINEL = "<id>";

/**
 * そのクラスがどの世界線スコープに属するか。
 *
 * このバブリの world-line は **`Shift` だけ**を記録する（`shiftPlanWorldLineListener`）。
 * 他の型は世界線に載らないので **`undefined`** ＝「所属という概念の対象ではない」。
 * `external` と言うと「世界の外にある」と読めてしまい、載る候補があるかのように嘘をつく。
 */
function worldLineScopeOf(className: string): ClassScope | undefined {
  if (className !== SHIFT_TYPE) return undefined;
  return { scopeId: shiftPlanScopeId(SCOPE_ID_SENTINEL), role: "live" };
}

/** 世界線に載る型にだけ札を出す。載らない型には何も言わない */
function worldLineMembershipOf(className: string): string | undefined {
  return className === SHIFT_TYPE ? "世界線に記録" : undefined;
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
    padding: "5px 8px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    flex: "0 0 auto",
  } as React.CSSProperties,
  details: {
    padding: "6px 10px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    color: "#8b949e",
    flex: "0 0 auto",
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
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<"force" | "column">("force");
  /**
   * ユーザーが動かした箱の位置。**この窓を開いているあいだだけ覚える。**
   * 図の見方の好みであってドメインのデータではないので、世界線には載せない
   */
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  /** 読み方と申告。既定は畳む（出しっぱなしだと窓の半分を説明が占める） */
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  /** いまの窓に図全体が収まる倍率にする */
  const fit = useCallback(() => {
    const el = canvasRef.current;
    const svg = el?.querySelector("svg");
    if (!el || !svg) return;
    const w = Number(svg.getAttribute("viewBox")?.split(" ")[2] ?? 0);
    const h = Number(svg.getAttribute("viewBox")?.split(" ")[3] ?? 0);
    if (!w || !h) return;
    setScale(Math.min(el.clientWidth / w, el.clientHeight / h, 1));
  }, []);
  const move = useCallback(
    (name: string, at: { x: number; y: number }) =>
      setPositions((prev) => ({ ...prev, [name]: at })),
    []
  );
  const d = graph.diagnostics;
  // 開いた直後から全体が見えているようにする。押さないと収まらないのでは、
  // 「まず図が読めない」状態から始まってしまう
  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [fit, mode, graph]);

  const membership = useCallback(worldLineMembershipOf, []);
  const scope = useCallback(worldLineScopeOf, []);

  const counts = useMemo(() => {
    const byKind = { aggregate: 0, part: 0, value: 0 };
    for (const c of graph.classes) byKind[c.kind]++;
    const contains = graph.relations.filter((r) => r.kind === "contains").length;
    return { byKind, contains, references: graph.relations.length - contains };
  }, [graph]);

  const warnings = d.classesWithoutState.length + d.unresolvedIdFields.length;

  return (
    <div style={S.wrap}>
      <div style={S.hud}>
        <strong style={{ color: "#58a6ff" }}>クラス図</strong>
        <span style={S.legend}>
          集約 {counts.byKind.aggregate} / 部品 {counts.byKind.part} / 値{" "}
          {counts.byKind.value} ・ 内包 {counts.contains} / 参照 {counts.references}
        </span>
        <span>
          {(
            [
              ["force", "力学"],
              ["column", "列"],
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
        </span>
        <span>
          <button type="button" onClick={fit} style={btn}>
            全体
          </button>
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
        {Object.keys(positions).length > 0 && (
          <button type="button" onClick={() => setPositions({})} style={btn}>
            並びを戻す（{Object.keys(positions).length}）
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ ...btn, background: open ? "#1f6feb" : "#21262d" }}
        >
          読み方{warnings > 0 ? ` ・ ⚠ ${warnings}` : ""}
        </button>
      </div>

      {open && (
        <div style={S.details}>
          <div>
            縦横の位置＝関係の近さ（力学）・{" "}
            <span style={{ color: "#8b949e" }}>◆実線＝内包（一緒に巻き戻る）</span>{" "}
            <span style={{ color: "#e3b341" }}>→破線＝id で参照（別々に巻き戻る）</span>{" "}
            <span style={{ color: "#e3b341" }}>↻＝自分を返す更新メソッド</span>
          </div>
          <div>
            <span style={{ color: "#39c5cf" }}>シアンの枠＝世界線スコープ</span>
            （一緒に保存され、一緒に巻き戻る範囲）。
            <b>このバブリで世界線に載るのは {SHIFT_TYPE} だけ</b>
            で、持ち主の ShiftPlan は載らない（巻き戻るのはシフトの中身であって、
            シフト表そのものではない）・ 箱はドラッグで動かせる
          </div>
          <div>
            出どころ: {d.sourceRoot}（{d.fileCount} ファイル）を生成時に読んだもの。
            集約の根はスライスの宣言から、世界線での所属は world-line の宣言から
          </div>
          {d.classesWithoutState.length > 0 && (
            <div style={S.warn}>
              ⚠ state を持たないクラス {d.classesWithoutState.length} 件はフィールドが空（
              {d.classesWithoutState.join(", ")}）
            </div>
          )}
          {d.unresolvedIdFields.length > 0 && (
            <div style={S.warn}>
              ⚠ 参照先を決められなかった id が {d.unresolvedIdFields.length} 件＝
              <b>その分だけ線が足りていない</b>（{d.unresolvedIdFields.join(", ")}）
            </div>
          )}
        </div>
      )}
      <div style={S.canvas} ref={canvasRef}>
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
