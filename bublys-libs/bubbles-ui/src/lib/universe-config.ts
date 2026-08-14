import { Universe } from "@bublys-org/bubbles-ui-util";

/** universe（StyledUniverse）の一辺サイズ（px）。スクロール可能空間の広さ */
export const UNIVERSE_SIZE = 50000;

/** 既定サイズの Universe を生成する */
export const createUniverse = (): Universe =>
  new Universe({ width: UNIVERSE_SIZE, height: UNIVERSE_SIZE });
