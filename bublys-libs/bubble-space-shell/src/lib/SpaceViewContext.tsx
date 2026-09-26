"use client";
/**
 * 見え方の口 ── 海の「開き方・ネオンの通し方・レンズの向き」を、外から触れるようにする。
 *
 * 触るところ（ボタン）は**1 つの泡**（{@link SpaceViewBubble}）にした。画面に固定した帯は
 * 規則の中に置き場所が無いので、ほかと同じ泡にして、いつも見えていてほしければ岸に貼る。
 * 泡は海の中で描かれるので、値はこの文脈で渡す。
 */
import { createContext, useContext } from "react";
import type { PresetId } from "@bublys-org/bubble-layout";
import type { TubeJoin } from "@bublys-org/bubbles-ui";

export type SpaceView = {
  /** 並べ方（View のプリセット）。**開き方は 1 つしかない**ので、見え方が変わるのはここ */
  readonly preset: PresetId;
  readonly setPreset: (preset: PresetId) => void;
  /** 岸に着いた泡の所で、ネオンをどう通すか */
  readonly join: TubeJoin;
  readonly setJoin: (join: TubeJoin) => void;
  /** 魚眼をどちらの向きに掛けるか（軸ごと） */
  readonly fisheye: { readonly x: boolean; readonly y: boolean };
  readonly toggleFisheye: (axis: "x" | "y") => void;
  /**
   * **レンズをまかせる。** 軸ごとに「平行で置いたら中身が画面に収まるか」を見て、
   * 収まらない軸だけ魚眼にする（収まったら平行へ戻す）。
   * 泡を足していって溢れたら自分で魚眼を点け、減ったら消す、という手間が無くなる。
   */
  readonly autoLens: boolean;
  readonly setAutoLens: (on: boolean) => void;
  /**
   * **どこから開いたかの帯**を、いつも見せるか。
   * 切っていても消えはしない ── 両端のどちらかに触れれば浮かぶ（既定）。
   */
  readonly bandsAlways: boolean;
  readonly setBandsAlways: (on: boolean) => void;
};

const NOOP: SpaceView = {
  preset: "free",
  setPreset: () => undefined,
  join: "detour",
  setJoin: () => undefined,
  fisheye: { x: true, y: false },
  toggleFisheye: () => undefined,
  autoLens: false,
  setAutoLens: () => undefined,
  bandsAlways: false,
  setBandsAlways: () => undefined,
};

export const SpaceViewContext = createContext<SpaceView>(NOOP);
export const useSpaceView = (): SpaceView => useContext(SpaceViewContext);
