"use client";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  ROOT_UNIVERSE_ID,
  addBubble,
  createBubble,
  dockToShowre,
  makeSelectProjectedNodeId,
  selectBubbleArrangement,
} from "@bublys-org/bubbles-ui";
import { nameIntent } from "@bublys-org/world-line-graph";
import { Launcher } from "@bublys-org/launcher-model";
import { selectLauncherPlain, setLauncher } from "@bublys-org/launcher-libs";
import { DEFAULT_LAUNCHER_URLS, MAIN_LAUNCHER_ID, RETIRED_LAUNCH_URLS } from "./launchTargets";

const MAIN_LAUNCHER_URL = `launchers/${MAIN_LAUNCHER_ID}`;
/** 最初に貼るときの大きさ（あとはユーザーが辺を掴んで変えられる） */
const MAIN_LAUNCHER_SIZE = { width: 200, height: 360 };

/**
 * ルール: **OS 標準の呼び出しは、main ランチャーに必ず 1 つずつ居る。**
 *
 * - 集約が無ければ、OS 標準の呼び出しで作る
 * - 行き先が変わった呼び出しは差し替える（足す前に。でないと古いのと新しいのが並ぶ）
 * - 有っても足りないものがあれば足す（あとから増えた呼び出しが出てこないので）
 * - **標準の並び順に揃える**（`ordered`）。足すだけだと、順番を変えても
 *   すでに使っている人は古い並びのままで、新しいものが末尾に付くだけになる。
 *   標準に無いもの（読み込んだバブリ）は触らない
 *
 * OS 標準の呼び出しには外す口が無いので、足すだけで辻褄が合う
 * （ロードしたバブリの `<name>-bubly` は標準ではないので、ここは触らない）。
 * **泡は作らない** ── 「どこに出すか」は海の側の仕事（最初に開く url として渡すだけ）。
 */
export const useEnsureMainLauncherEntity = () => {
  const dispatch = useAppDispatch();
  const mainLauncher = useAppSelector(selectLauncherPlain(MAIN_LAUNCHER_ID));
  useEffect(() => {
    if (!mainLauncher) {
      dispatch(setLauncher(Launcher.create(DEFAULT_LAUNCHER_URLS, MAIN_LAUNCHER_ID).toPlain()));
      return;
    }
    const launcher = Launcher.fromPlain(mainLauncher);
    const moved = Object.entries(RETIRED_LAUNCH_URLS).reduce((l, [from, to]) => l.rename(from, to), launcher);
    const missing = DEFAULT_LAUNCHER_URLS.filter((url) => !moved.urls.includes(url));
    const next = missing.reduce((l, url) => l.add(url), moved).ordered(DEFAULT_LAUNCHER_URLS);
    if (next === launcher) return;
    dispatch(setLauncher(next.toPlain()));
  }, [dispatch, mainLauncher]);
};

/**
 * ルール: 「root には必ずランチャーが 1 つは居る。無ければ main ランチャーを左の岸に着ける」。
 *
 * - ランチャー集約 main が無ければ、OS 標準の呼び出しで作る
 * - root の配置に `launchers/main` バブルが無ければ足して、左の岸に着ける
 *
 * 配置の方は世界線から復元し終わる（projectedNodeId が付く）まで待つ。
 * 復元前に足すと、その commit が復元を上書きしてしまう。
 */
export const useEnsureMainLauncher = () => {
  const dispatch = useAppDispatch();
  const mainLauncher = useAppSelector(selectLauncherPlain(MAIN_LAUNCHER_ID));
  const projectedNodeId = useAppSelector(makeSelectProjectedNodeId(ROOT_UNIVERSE_ID));
  const arrangement = useAppSelector(selectBubbleArrangement);

  useEffect(() => {
    if (mainLauncher) return;
    dispatch(setLauncher(Launcher.create(DEFAULT_LAUNCHER_URLS, MAIN_LAUNCHER_ID).toPlain()));
  }, [dispatch, mainLauncher]);

  const hasMainLauncherBubble = Object.values(arrangement.bubbles).some((b) => b.url === MAIN_LAUNCHER_URL);

  useEffect(() => {
    if (projectedNodeId === null) return;
    if (hasMainLauncherBubble) return;
    nameIntent("launcher:ensure");
    const bubble = createBubble(MAIN_LAUNCHER_URL);
    dispatch(addBubble(bubble.toJSON(), ROOT_UNIVERSE_ID));
    // 左辺の、画面の少し下がった所に貼る（大きさはランチャーの既定）
    dispatch(dockToShowre(
      {
        bubbleId: bubble.id,
        dock: { edges: ["left"], at: { x: 0, y: 24 } },
        size: MAIN_LAUNCHER_SIZE,
      },
      ROOT_UNIVERSE_ID,
    ));
  }, [dispatch, projectedNodeId, hasMainLauncherBubble]);
};
