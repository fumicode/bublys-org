"use client";
import { FC, useCallback, useContext } from "react";
import { HengeGame_化ゲーム } from "@bublys-org/henge-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { gameScopeId, HENGE_GAME_TYPE } from "./HengeGameProvider.js";
import { HengeGameView } from "../ui/HengeGameView.js";

export type HengeGameFeatureProps = {
  gameId: string;
  bubbleId?: string;
};

/**
 * ゲーム 1 つ。**このゲーム専用の世界線**に繋ぐ。
 *
 * `shell.update()` を呼ぶたびに世界線に節が 1 つ増える。
 * 戻ってから更新すれば、そこから枝が割れる ── それが「別の可能性を試す」。
 */
export const HengeGameFeature: FC<HengeGameFeatureProps> = ({ gameId, bubbleId }) => {
  const { openBubble } = useContext(BubblesContext);

  // ★ id が取れていないのに create すると、中身が undefined のゲームが
  //   世界線に書き込まれる。落ちるより前に止める。
  const hasId = gameId.length > 0;

  const scope = useCasScope(gameScopeId(gameId), {
    initialObjects: [{ type: HENGE_GAME_TYPE, object: HengeGame_化ゲーム.create(gameId) }],
  });

  const shell = scope.getShell<HengeGame_化ゲーム>(HENGE_GAME_TYPE, gameId);
  const game = shell?.object ?? null;

  const handleAdvance = useCallback(() => {
    shell?.update((g) => g.advance());
  }, [shell]);

  const handleOpenWorldLine = useCallback(() => {
    openBubble(`henge/games/${gameId}/history`, bubbleId ?? "root");
  }, [openBubble, gameId, bubbleId]);

  if (!hasId) {
    return (
      <div style={{ padding: 16, color: "#c00", fontSize: 13 }}>
        url からゲームの id が取り出せませんでした: <code>{gameId || "(空)"}</code>
      </div>
    );
  }

  // ★ 参照はあるのに実データが手元に無い瞬間がある。そこで「無い」と判断しない
  if (!game) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", fontSize: 13 }}>
        {scope.pending ? "読み込んでいます…" : "このゲームは見つかりませんでした。"}
      </div>
    );
  }

  return (
    <HengeGameView
      game={game}
      canUndo={scope.canUndo}
      canRedo={scope.canRedo}
      onAdvance={handleAdvance}
      onUndo={scope.moveBack}
      onRedo={scope.moveForward}
      onOpenWorldLine={handleOpenWorldLine}
    />
  );
};
