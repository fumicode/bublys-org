"use client";
import {
  type BubbleContentRenderer,
  Bubble,
  selectBubblesRelationByOpeneeId,
  makeSelectBubbleByIdInUniverse,
  updateBubble,
  useUniverseId,
} from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { LauncherSettingsView } from "../ui/LauncherSettingsView.js";

/**
 * ランチャーの設定バブル（url: `launchers/:launcherId/settings`）。ランチャーの ⚙ から開く。
 *
 * 「開いたものと帯で繋ぐ」は、このバブルを開いた**ランチャーバブル**の `linksHidden` を
 * 切り替える。関係（bubbleRelations）は常に作られていて、見せるかどうかだけを変えるので、
 * 既に開いているバブルの帯も一緒に消え、戻せば復活する。設定は配置の一部なので世界線に乗る。
 */
export const LauncherSettingsBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const relation = useAppSelector((state) =>
    selectBubblesRelationByOpeneeId(state, { openeeId: bubble.id, universeId }),
  );
  const launcherBubble = useAppSelector(
    relation ? makeSelectBubbleByIdInUniverse(universeId, relation.openerId) : () => undefined,
  );

  if (!launcherBubble) {
    return (
      <div style={{ padding: 16, fontSize: "0.875rem" }}>
        ランチャーから開いてください（どのランチャーの設定か分かりません）
      </div>
    );
  }

  return (
    <LauncherSettingsView
      linksOpened={!launcherBubble.linksHidden}
      onLinksOpenedChange={(v) =>
        dispatch(updateBubble(Bubble.fromJSON(launcherBubble.toJSON()).setLinksHidden(!v).toJSON(), universeId))
      }
    />
  );
};
