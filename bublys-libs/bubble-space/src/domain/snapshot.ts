import { Space } from "./space.js";
import type { SpaceState } from "./space.js";

/** 世界線に載せる型名 */
export const BUBBLE_SPACE_TYPE = "bubble-space";
/** 1つの空間 = 1つのスナップショットなので固定 id */
export const BUBBLE_SPACE_ID = "main";

/**
 * 空間の配置スナップショット。
 *
 * 世界線（CAS）は型ごとにクラスを要求する（plain object だと instanceof 解決ができない）
 * ため専用クラスにしている。中身は Space の状態そのもの。
 *
 * 「どの泡がどこにあり、どうつながっているか」は、勤務表やメモと同じく
 * 記録されるべき状態のひとつ、という立場をとる。
 */
export class BubbleSpaceSnapshot {
  constructor(readonly state: SpaceState) {}

  static of(space: Space): BubbleSpaceSnapshot {
    return new BubbleSpaceSnapshot(space.toPlain());
  }
  toSpace(): Space {
    return Space.fromPlain(this.state);
  }
  toJSON(): SpaceState {
    return this.state;
  }
  static fromJSON(json: unknown): BubbleSpaceSnapshot {
    return new BubbleSpaceSnapshot(json as SpaceState);
  }
}

/** 配置の同一性。位置の微調整まで含めて「変わったか」を判定する。 */
export const spaceFingerprint = (space: Space): string =>
  JSON.stringify(space.toPlain());
