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
import { launcherSettingsUrl } from "../registration/bubbleRoutes.js";
import { useLauncher } from "./useLauncher.js";

/**
 * ランチャーバブル（url: `launchers/:launcherId`）。
 *
 * 岸に着いていれば帯（アイコン列）、浮いていれば一覧。どちらも同じこの
 * コンポーネントで、見せ方だけ {@link useShowreSide} で分岐する。
 *
 * 呼び出しは、このバブルが居るユニバースの openBubble で開く。岸に着いた
 * バブルも ShowreView 経由でそのユニバースの BubblesContext の中に居る。
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
      // 開いたバブルはランチャーの子（帯がランチャーの項目から伸びる）。
      // 帯を見せるかどうかはバブルの linksHidden（設定バブルから切り替え）で決まり、
      // 関係自体は常に残るので、切り替えれば既に開いているものにも効く
      onLaunch={(url) => openBubble(url, bubble.id)}
      settingsUrl={launcherSettingsUrl(launcherId)}
      onOpenSettings={() => openBubble(launcherSettingsUrl(launcherId), bubble.id)}
    />
  );
};
