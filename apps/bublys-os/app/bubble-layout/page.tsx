"use client";
/**
 * 泡のならべかた（5つの規則）を、本物のバブリの画面で動かすページ。
 *
 * 決めた形 ── **Z を使わない**:
 *   - 重なりを作るのは並べ方。開いた泡は元の泡の右下へずらして**重ねる**（`depth="cascade"`）
 *   - 大きさは X の魚眼が決める。焦点に近いほど大きい
 *   - 前後は「**大きく写るものが手前**」（描く順の第2キー）。触ると焦点が寄って入れ替わる
 *   - 泡の値は触っても 1 バイトも書かない（規則②）
 *
 * 既存のバブリの画面は**1文字も変えずに**載せる。橋渡しは 2 つだけ:
 *   - 旧 `BubblesContext.openBubble` → 新しい空間の `openBubble`
 *   - 旧 `CurrentBubbleContext` → いま描いている泡の id
 * （旧 `ObjectView` はこの 2 つを見てダブルクリックで開くので、これで繋がる）
 */
import { useEffect, useMemo, useState } from "react";
import { BubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { OpenDepth } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";
import { bubbleRoutes } from "../bubble-ui/BubblesUI/domain/bubbleRoutes";
import { bridgeRoutes } from "../bubble-ui/BubblesUI/feature/legacyRouteBridge";

/** この画面で試すバブリ（全部載せると重いので、一覧 → 詳細のあるものから） */
const TRY = ["users", "memos", "user-groups", "tasks", "igo-games"];

export default function BubbleLayoutPage() {
  const [depth, setDepth] = useState<OpenDepth>("cascade");
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight - 44 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const routes = useMemo(() => bridgeRoutes(bubbleRoutes), []);
  const initialUrls = useMemo(() => TRY.filter((u) => bubbleRoutes.some((r) => matches(r, u))).slice(0, 1), []);

  return (
    <div style={{ height: "100vh", background: "radial-gradient(circle 1200px at 50% 40%,#141a2b 0%,#080a11 100%)", color: "#e6ebf5", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 44, padding: "0 14px", borderBottom: "1px solid #222838", font: "13px/1.5 -apple-system, sans-serif" }}>
        <b>泡のならべかた ── 本物のバブリで</b>
        <span style={{ color: "#8792ab" }}>項目をダブルクリック → 重ねて開く／触ると焦点が寄って前後が入れ替わる</span>
        <span style={{ marginLeft: "auto" }} />
        {(["cascade", "fisheye-x", "plane"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            style={{
              font: "inherit", padding: "4px 12px", borderRadius: 7, cursor: "pointer",
              border: `1px solid ${depth === d ? "#4d8dff" : "#2a3145"}`,
              background: depth === d ? "#16233f" : "#141a2b",
              color: depth === d ? "#dce8ff" : "#cfd8ea",
            }}
          >
            {d === "cascade" ? "重ねて開く（Z なし）" : d === "fisheye-x" ? "隣に開く（魚眼）" : "面（Z あり）"}
          </button>
        ))}
      </div>
      <BubbleSpace
        key={depth}
        routes={routes}
        initialUrls={initialUrls}
        viewport={viewport}
        depth={depth}
        style={{ position: "absolute", left: 0, top: 44, width: viewport.w, height: viewport.h }}
      />
    </div>
  );
}

const matches = (route: LegacyRoute, url: string): boolean =>
  typeof route.pattern === "string" ? route.pattern === url : route.pattern.test(url);
