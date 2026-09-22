"use client";
import { useContext, useMemo } from "react";
import { BubbleContentRenderer, BubblesContext } from "@bublys-org/bubbles-ui";
import { launcherLayout } from "@bublys-org/launcher-model";
import { LauncherView, type LauncherViewEntry } from "../ui/LauncherView.js";
import { resolveLaunchTarget } from "../registration/launchTargets.js";
import { launcherSettingsUrl } from "../registration/bubbleRoutes.js";
import { useLauncher } from "./useLauncher.js";

/** バブルの枠（余白 + 縁）。中身を描ける大きさは、バブルの大きさからこれを引いた分 */
const CHROME = 26;

/**
 * ランチャーバブル（url: `launchers/:launcherId`）。
 *
 * 見た目は岸に貼り付いていても海に浮いていても同じ一覧。並べ方は
 * **中身を描ける大きさと項目数**だけで決まる（{@link launcherLayout}）。岸のことは知らない。
 */
export const LauncherBubble: BubbleContentRenderer = ({ bubble }) => {
  const launcherId = bubble.params.launcherId ?? bubble.url.replace(/^launchers\//, "");
  const { launcher } = useLauncher(launcherId);
  const { openBubble } = useContext(BubblesContext);
  const entries = useMemo<LauncherViewEntry[]>(
    () =>
      (launcher?.entries ?? []).map((e) => {
        const target = resolveLaunchTarget(e.url);
        return { id: e.id, url: e.url, label: target.label, icon: target.icon };
      }),
    [launcher],
  );

  // 貼り付いている辺は知らなくてよい。並べ方は中身を描ける大きさと項目数で決まる。
  // 末尾の設定 ⚙ も 1 項目として数える
  const outer = bubble.size ?? bubble.defaultSize;
  const drawable = {
    width: Math.max(0, outer.width - CHROME),
    height: Math.max(0, outer.height - CHROME),
  };
  const layout = launcherLayout(drawable, entries.length + 1);

  if (!launcher) {
    return <div style={{ padding: 16, fontSize: "0.875rem" }}>ランチャー "{launcherId}" は無い</div>;
  }

  return (
    <LauncherView
      entries={entries}
      vertical={layout.direction === "vertical"}
      labels={layout.labels}
      // 開いたバブルはランチャーの子（帯がランチャーの項目から伸びる）。
      // 帯を見せるかどうかはバブルの linksHidden（設定バブルから切り替え）で決まり、
      // 関係自体は常に残るので、切り替えれば既に開いているものにも効く
      onLaunch={(url) => openBubble(url, bubble.id)}
      settingsUrl={launcherSettingsUrl(launcherId)}
      onOpenSettings={() => openBubble(launcherSettingsUrl(launcherId), bubble.id)}
    />
  );
};
