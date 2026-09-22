"use client";
import { useContext, useMemo } from "react";
import {
  BubbleContentRenderer,
  BubblesContext,
  useShowreSide,
  isVerticalShowre,
} from "@bublys-org/bubbles-ui";
import { LauncherView, type LauncherViewEntry } from "../ui/LauncherView.js";
import { resolveLaunchTarget } from "../registration/launchTargets.js";
import { useLauncher } from "./useLauncher.js";

/**
 * ランチャーバブル（url: `launchers/:launcherId`）。
 *
 * 岸に着いていれば帯（アイコン列）、浮いていれば一覧。どちらも同じこの
 * コンポーネントで、見せ方だけ {@link useShowreSide} で分岐する。
 *
 * 呼び出しは、このバブルが居るユニバースの openBubble で開く。岸に着いた
 * バブルも ShowreView 経由でそのユニバースの BubblesContext の中に居るので、
 * サイドバーの popChildOrJoinSibling(url, "root") と同じ振る舞いになる。
 */
export const LauncherBubble: BubbleContentRenderer = ({ bubble }) => {
  const launcherId = bubble.params.launcherId ?? bubble.url.replace(/^launchers\//, "");
  const { launcher } = useLauncher(launcherId);
  const { openBubble } = useContext(BubblesContext);
  const side = useShowreSide();

  const entries = useMemo<LauncherViewEntry[]>(
    () =>
      (launcher?.entries ?? []).map((e) => {
        const target = resolveLaunchTarget(e.url);
        return { id: e.id, url: e.url, label: target.label, icon: target.icon };
      }),
    [launcher],
  );

  if (!launcher) {
    return <div style={{ padding: 16, fontSize: "0.875rem" }}>ランチャー "{launcherId}" は無い</div>;
  }

  return (
    <LauncherView
      entries={entries}
      compact={side !== undefined}
      vertical={side === undefined || isVerticalShowre(side)}
      // 岸に着いたランチャーから開いたバブルは、岸ではなく海に属する（ランチャーとの
      // 親子関係を持たない）。opener を "root" にすると relateBubbles が関係を作らない。
      onLaunch={(url) => openBubble(url, side !== undefined ? "root" : bubble.id)}
    />
  );
};
