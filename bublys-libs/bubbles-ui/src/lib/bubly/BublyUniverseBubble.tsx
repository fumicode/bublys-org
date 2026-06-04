"use client";
import { FC, type CSSProperties } from "react";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import type { BubbleContentRenderer } from "../bubble-routing/BubbleRouting.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { useUniverseArrangementWorldLine } from "../world-line/useUniverseArrangementWorldLine.js";
import { BubbleContent } from "../ui/BubbleContent.js";
import { UniverseView } from "../ui/UniverseView.js";

/**
 * universe バブルの中の世界線ナビゲーション（戻る/進む）。
 * universe に対して absolute 配置で重ねる。
 */
type UniverseNav = {
  moveBack: () => void;
  moveForward: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const UniverseWorldLineToolbar: FC<UniverseNav> = ({
  moveBack,
  moveForward,
  canUndo,
  canRedo,
}) => {
  const btn = (disabled: boolean): CSSProperties => ({
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 4,
    background: "rgba(20,22,30,0.6)",
    color: "rgba(230,235,255,0.9)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.3 : 1,
    padding: "2px 8px",
    fontSize: 14,
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 10,
        display: "flex",
        gap: 4,
        // 親 universe（nested）が pointer-events: none なので、ここだけ explicit auto。
        pointerEvents: "auto",
      }}
    >
      <button
        style={btn(!canUndo)}
        disabled={!canUndo}
        onClick={moveBack}
        title="戻る"
      >
        ←
      </button>
      <button
        style={btn(!canRedo)}
        disabled={!canRedo}
        onClick={moveForward}
        title="進む"
      >
        →
      </button>
    </div>
  );
};

/**
 * バブリ用の標準 universe バブル Component。
 *
 * 自分のルート定義（{@link BubbleRouteRegistry}）から:
 *   - snapshot codec        → 世界線 hook に注入（base 名を知らずに済む）
 *   - initialBubbleUrls     → UniverseView の初期 seed
 * を引いてくる。これにより同じ Component で users-bubly / task-bubly / 動的に
 * ロードされた `<name>-bubly` など、初期 seed が違うだけの bubly ルートを
 * 共通化できる。
 *
 * バブル位置で世界線がこのコンポーネントの universeId に束ねられ、親バブルの
 * url（`<base>@<node>`）と双方向バインドされる。
 */
export const BublyUniverseBubble: BubbleContentRenderer = ({ bubble }) => {
  const parentUniverseId = useUniverseId();
  const childUniverseId = `${parentUniverseId}/${bubble.id}`;
  const route = BubbleRouteRegistry.matchRoute(bubble.url);
  const nav = useUniverseArrangementWorldLine(
    childUniverseId,
    route?.snapshot
      ? {
          parentUniverseId,
          bubbleId: bubble.id,
          bubbleUrl: bubble.url,
          snapshot: route.snapshot,
        }
      : undefined,
  );
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <UniverseView
        universeId={childUniverseId}
        renderBubbleContent={(b) => <BubbleContent bubble={b} />}
        initialBubbleUrls={route?.initialBubbleUrls ?? []}
      />
      <UniverseWorldLineToolbar {...nav} />
    </div>
  );
};
