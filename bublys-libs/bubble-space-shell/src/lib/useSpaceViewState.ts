"use client";
/**
 * 見え方の口の**中身の持ち方** ── 大元の海も、ユニバース（窓）の中の海も、これ 1 つで持つ。
 *
 * > **口は海の実物を映す。** 持っているのは世界（View の軸）で、ここは写し。
 *
 * ★ 海は `onLens` で自分のレンズを送ってくるので、口の見た目はいつでも海と一致する
 *   （読み込み直しても、まかせるに決めさせても、ずれない）。
 * ★ ネオンの通し方（`join`）だけは外から受ける ── あれは**画面ぜんぶで 1 つ**で、
 *   窓の中の岸にも同じものが効く（`legacyRouteBridge` の註）。
 */
import { useCallback, useMemo, useState } from "react";
import { PRESETS } from "@bublys-org/bubble-layout";
import type { BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
import type { LensId, PlaneAxis, PresetId } from "@bublys-org/bubble-layout";
import type { TubeJoin } from "@bublys-org/bubbles-ui";
import type { SpaceView } from "./SpaceViewContext.js";

/** その並べ方で、どちらの軸が魚眼か（口の最初の見た目は、ここから出す） */
export const lensesOf = (id: PresetId) => ({
  x: PRESETS[id].x.lens === "fisheye",
  y: PRESETS[id].y.lens === "fisheye",
});

export type SpaceViewState = {
  /** 口に渡す値 */
  readonly view: SpaceView;
  /** 海へ渡す：レンズが決まったことの報せ口（海 → 口） */
  readonly onLens: (axis: PlaneAxis, lens: LensId) => void;
  /** 海へ渡す：まかせるか */
  readonly autoLens: boolean;
  /** 海へ渡す：帯の出し方 */
  readonly bandDisplay: "hover" | "always";
};

export function useSpaceViewState(
  /** その海の口（作り直されることがあるので、覚え書きで受ける） */
  space: { readonly current: BubbleSpaceApi | null },
  join: TubeJoin,
  setJoin: (join: TubeJoin) => void,
  /** 最初の並べ方 */
  initialPreset: PresetId = "free",
): SpaceViewState {
  const [preset, setPresetState] = useState<PresetId>(initialPreset);
  /**
   * ★ **ここは口の見た目でしかない。** 本物は世界（View の軸）にあり、海が変わるたびに
   *   `onLens` で送られてくる ── 押した回数で決まるものではないので、最初の値も
   *   **最初の並べ方のレンズ**から出す。
   */
  const [fisheye, setFisheye] = useState(() => lensesOf(initialPreset));
  const [autoLens, setAutoLens] = useState(false);
  const [bandsAlways, setBandsAlways] = useState(false);

  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next);
    space.current?.setPreset(next);
  }, [space]);

  /**
   * 軸のレンズを切り替える。世界に書くのは View の 1 つの軸だけ。
   * ★ `setFisheye` の更新関数の中で海に書いてはいけない ──
   *   更新関数はレンダリング中に呼ばれるので、別のコンポーネントを更新することになる。
   */
  const toggleFisheye = useCallback((axis: PlaneAxis) => {
    const on = !fisheye[axis];
    setFisheye((f) => ({ ...f, [axis]: on }));
    space.current?.setLens(axis, on ? "fisheye" : "parallel");
  }, [fisheye, space]);

  /** 海からの報せ（まかせた結果も、読み込み直しも、これで口に届く） */
  const onLens = useCallback((axis: PlaneAxis, lens: LensId) => {
    setFisheye((f) => (f[axis] === (lens === "fisheye") ? f : { ...f, [axis]: lens === "fisheye" }));
  }, []);

  const view = useMemo<SpaceView>(
    () => ({
      preset, setPreset, join, setJoin, fisheye, toggleFisheye,
      autoLens, setAutoLens, bandsAlways, setBandsAlways,
    }),
    [preset, setPreset, join, setJoin, fisheye, toggleFisheye, autoLens, bandsAlways],
  );

  return { view, onLens, autoLens, bandDisplay: bandsAlways ? "always" : "hover" };
}
