/**
 * DayOffType — 休みの種別
 *
 * 「年休」「週休」「祝日」「AM年休」など、休みの形態を表す。
 * セルには shortName（"年"、"週"、"AM年" 等）で表示する。
 * 不変。
 */

export type DayOffTypeState = {
  id: string;
  name: string;
  /** セルに表示する短縮名（"年"、"週"、"祝" 等） */
  shortName: string;
};

export class DayOffType {
  constructor(readonly state: DayOffTypeState) {}

  static of(id: string, name: string, shortName: string): DayOffType {
    return new DayOffType({ id, name, shortName });
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get shortName(): string {
    return this.state.shortName;
  }
}
