"use client";
/**
 * 見え方の口 ── 海の「開き方・ネオンの通し方・レンズの向き」を、外から触れるようにする。
 *
 * 触るところ（ボタン）は**1 つの泡**（{@link SpaceViewBubble}）にした。画面に固定した帯は
 * 規則の中に置き場所が無いので、ほかと同じ泡にして、いつも見えていてほしければ岸に貼る。
 * 泡は海の中で描かれるので、値はこの文脈で渡す。
 */
import { createContext, useContext } from "react";
import type { OpenDepth } from "@bublys-org/bubble-layout-feature";
import type { TubeJoin } from "@bublys-org/bubbles-ui";

export type SpaceView = {
  /** 開き方（重ねて開く／隣に開く／面） */
  readonly depth: OpenDepth;
  readonly setDepth: (depth: OpenDepth) => void;
  /** 岸に着いた泡の所で、ネオンをどう通すか */
  readonly join: TubeJoin;
  readonly setJoin: (join: TubeJoin) => void;
  /** 魚眼をどちらの向きに掛けるか（軸ごと） */
  readonly fisheye: { readonly x: boolean; readonly y: boolean };
  readonly toggleFisheye: (axis: "x" | "y") => void;
};

const NOOP: SpaceView = {
  depth: "cascade",
  setDepth: () => undefined,
  join: "detour",
  setJoin: () => undefined,
  fisheye: { x: true, y: false },
  toggleFisheye: () => undefined,
};

export const SpaceViewContext = createContext<SpaceView>(NOOP);
export const useSpaceView = (): SpaceView => useContext(SpaceViewContext);
