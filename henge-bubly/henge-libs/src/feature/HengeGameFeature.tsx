"use client";
import { FC, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PUZZLE, HengeGame_化ゲーム, type HengeMethodDef } from "@bublys-org/henge-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { gameScopeId, HENGE_GAME_TYPE } from "./HengeGameProvider.js";
import { HengeGameView } from "../ui/HengeGameView.js";
import { askHenge } from "../ai/hengeOracle.js";

export type HengeGameFeatureProps = {
  gameId: string;
  bubbleId?: string;
};

const newId = () => crypto.randomUUID();

/**
 * ゲーム 1 つ。**このゲーム専用の世界線**に繋ぐ。
 * 変化 1 回 = 世界線の節 1 つ。待っている間のことは世界線に載せない。
 */
export const HengeGameFeature: FC<HengeGameFeatureProps> = ({ gameId, bubbleId }) => {
  const { openBubble } = useContext(BubblesContext);
  const hasId = gameId.length > 0;

  const scope = useCasScope(gameScopeId(gameId), {
    initialObjects: [{ type: HENGE_GAME_TYPE, object: HengeGame_化ゲーム.create(gameId) }],
  });

  const shell = scope.getShell<HengeGame_化ゲーム>(HENGE_GAME_TYPE, gameId);
  const game = shell?.object ?? null;

  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 盤面がまだなら最初の盤面を置く
  useEffect(() => {
    if (shell && game && !game.isSetUp) shell.update((g) => (g.isSetUp ? g : g.setUp(DEFAULT_PUZZLE, newId)));
  }, [shell, game]);

  const handleToggle = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));
  }, []);

  const handlePerform = useCallback(
    async (method: HengeMethodDef) => {
      if (!shell || !game) return;
      const pieces = selected.map((id) => game.field.find((p) => p.id === id)).filter(Boolean);
      if (!game.canPerform(method, selected)) return;
      setBusy(`${method.label}…`);
      setError(null);
      try {
        const outputs = await askHenge(method.id, pieces as never);
        const ids = selected;
        shell.update((g) => g.apply(method, ids, outputs, newId));
        setSelected([]);
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
      } finally {
        setBusy(null);
      }
    },
    [shell, game, selected],
  );

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
      selected={selected.filter((id) => game.field.some((p) => p.id === id))}
      busy={busy}
      error={error}
      canUndo={scope.canUndo}
      canRedo={scope.canRedo}
      onToggle={handleToggle}
      onPerform={handlePerform}
      onUndo={() => { setSelected([]); scope.moveBack(); }}
      onRedo={() => { setSelected([]); scope.moveForward(); }}
      onOpenWorldLine={handleOpenWorldLine}
    />
  );
};
