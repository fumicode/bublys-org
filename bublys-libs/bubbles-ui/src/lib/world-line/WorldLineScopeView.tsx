"use client";
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CasScopeValue } from "@bublys-org/world-line-graph";
import { useKeyBindings, type KeyBinding } from "../hooks/useKeyBindings.js";
import { WorldLinesCanvasView } from "./WorldLinesCanvasView.js";

const EMPTY_BINDINGS: KeyBinding[] = [];

// 位置（left/top）は apex のスクリーン座標に合わせて ref 経由で動的に設定するので、
// ここには入れない（入れると React の再レンダーで上書きされてしまう）。
const nameInputStyle: CSSProperties = {
  position: "absolute",
  // 初期は隠す。位置確定後に ref で visibility を visible にする。
  // （安定参照の const なので React は再レンダーで上書きしない＝ref の値が残る）
  visibility: "hidden",
  zIndex: 2,
  width: 140,
  padding: "2px 6px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(20,22,30,0.7)",
  color: "rgba(235,240,255,0.95)",
  outline: "none",
};

/**
 * world-line-graph の scope を canvas（左→右・分岐は下・横魚眼・自前スクロール）で
 * 表示する共通ビュー。apex を強調し、ノードクリックで moveTo する。
 *
 * 操作はすべて宣言的に注入する: `keyBindings` で「このキー → この動作」を渡す
 * （undo の有無やフォーカスゲートなど方針がドメインごとに異なるため、ここでは
 * 個別の useEffect を持たず {@link useKeyBindings} で一括登録するだけ）。
 * 兄弟移動など定番の動作は {@link moveToSiblingBranch} を使うとよい。
 */
export type WorldLineScopeViewProps = {
  scope: CasScopeValue;
  /** ノード ID → ラベル要約。{@link useScopeNodeSummaries} で作るのが楽。 */
  getNodeSummary?: (nodeId: string) => string;
  /** 「このキー → この動作」。無効化したいときは空配列でよい。 */
  keyBindings?: KeyBinding[];
  /** true で apex（選択中の世界）に名前をつけるテキストボックスを出す。 */
  nameable?: boolean;
  /**
   * ノードクリック時の動作。既定は scope.moveTo（その世界へ移動）。
   * 別スコープへ反映してから移動するなど、ドメイン固有の遷移を差し込みたいときに渡す。
   */
  onSelectNode?: (nodeId: string) => void;
  /** ラッパの style。既定はバブルいっぱい（100%）。 */
  style?: CSSProperties;
};

export const WorldLineScopeView: FC<WorldLineScopeViewProps> = ({
  scope,
  getNodeSummary,
  keyBindings,
  nameable = false,
  onSelectNode,
  style,
}) => {
  useKeyBindings(keyBindings ?? EMPTY_BINDINGS);
  const apexId = scope.graph.getApex()?.id ?? null;
  const apexLabel = (apexId ? scope.graph.state.nodes[apexId]?.label : undefined) ?? "";

  // 状態要約はそのまま、ラベル（名前）は別レイヤーで吹き出し表示する。
  const getNodeLabel = useCallback(
    (id: string) => scope.graph.state.nodes[id]?.label ?? "",
    [scope.graph],
  );

  // 名前テキストボックスの下書き。apex（選択ノード）が変わったら同期する。
  // 入力は EditableText と同じく素直な制御 input。IME は触らない。
  const [draft, setDraft] = useState(apexLabel);
  useEffect(() => {
    setDraft(apexLabel);
  }, [apexId, apexLabel]);
  const commit = () => {
    if (apexId) scope.setNodeLabel(apexId, draft.trim() || undefined);
  };

  // apex の⭕️近くに入力欄を寄せる。再レンダーを避けるため ref で直接 DOM 配置する。
  const inputRef = useRef<HTMLInputElement>(null);
  const placeInput = useCallback((pos: { x: number; y: number } | null) => {
    const el = inputRef.current;
    if (!el) return;
    if (!pos) {
      el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";
    // ノードの少し右下に置く（⭕️に被らない）
    el.style.left = `${Math.round(pos.x + 14)}px`;
    el.style.top = `${Math.round(pos.y + 8)}px`;
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      {nameable && apexId && (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            // IME 変換確定の Enter で確定させない（二重入力の原因だった）。
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="名前…"
          style={nameInputStyle}
        />
      )}
      <WorldLinesCanvasView
        graph={scope.graph}
        apexNodeId={apexId}
        getNodeSummary={getNodeSummary}
        getNodeLabel={getNodeLabel}
        onSelectNode={onSelectNode ?? scope.moveTo}
        onApexScreenPos={nameable ? placeInput : undefined}
      />
    </div>
  );
};

/**
 * scope の各ノードに置かれた (objectType, objectId) のオブジェクトを引き、
 * format で文字列化したノード要約関数を返す（{@link WorldLineScopeView} の
 * getNodeSummary 用）。format は呼び出し側で安定化（module 直置き等）する想定。
 */
export function useScopeNodeSummaries(
  scope: CasScopeValue,
  objectType: string,
  objectId: string,
  format: (obj: unknown) => string,
): (nodeId: string) => string {
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of Object.keys(scope.graph.state.nodes)) {
      const obj = scope.getObjectAt(id, objectType, objectId);
      m.set(id, obj != null ? format(obj) : "");
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.graph, scope.getObjectAt, objectType, objectId]);
  return useCallback((nodeId: string) => map.get(nodeId) ?? "", [map]);
}

/**
 * apex の兄弟ノードへ delta（-1=上, +1=下）だけ移動する（分岐間の切替）。
 * 範囲外・親なしなら何もしない。keyBindings の ↑↓ から使う。
 */
export function moveToSiblingBranch(scope: CasScopeValue, delta: number): void {
  const apex = scope.graph.getApex();
  if (!apex || apex.parentId === null) return;
  const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
  const idx = siblings.indexOf(apex.id);
  if (idx < 0) return;
  const next = siblings[idx + delta];
  if (next) scope.moveTo(next);
}
