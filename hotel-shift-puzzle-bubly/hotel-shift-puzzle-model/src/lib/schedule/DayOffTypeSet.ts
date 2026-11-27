/**
 * DayOffTypeSet — 休み種別セット
 *
 * WorkShiftSet と同じ形: グローバルのテンプレートと勤務表ごとの独自セットがある。
 * 店舗形態ごとに既定セットを用意する。
 * 不変。
 */
import { DayOffType, type DayOffTypeState } from "./DayOffType.js";

export type DayOffTypeSetState = {
  id: string;
  types: DayOffType[];
};

export type DayOffTypeSetPlain = {
  id: string;
  types: DayOffTypeState[];
};

export class DayOffTypeSet {
  constructor(readonly state: DayOffTypeSetState) {}

  static of(id: string, types: DayOffType[]): DayOffTypeSet {
    return new DayOffTypeSet({ id, types });
  }

  get id(): string {
    return this.state.id;
  }

  get types(): readonly DayOffType[] {
    return this.state.types;
  }

  find(typeId: string): DayOffType | undefined {
    return this.state.types.find((t) => t.id === typeId);
  }

  withId(newId: string): DayOffTypeSet {
    return new DayOffTypeSet({ id: newId, types: [...this.state.types] });
  }

  toPlain(): DayOffTypeSetPlain {
    return {
      id: this.state.id,
      types: this.state.types.map((t) => t.state),
    };
  }

  static fromPlain(plain: DayOffTypeSetPlain): DayOffTypeSet {
    return new DayOffTypeSet({
      id: plain.id,
      types: plain.types.map((t) => new DayOffType(t)),
    });
  }
}

/** ホテル用の既定の休み種別セット（種別なし＝「休」だけ） */
export function createDefaultDayOffTypeSet(id: string): DayOffTypeSet {
  return DayOffTypeSet.of(id, []);
}

/** 行政用の既定の休み種別セット */
export function createGovernmentDayOffTypeSet(id: string): DayOffTypeSet {
  return DayOffTypeSet.of(id, [
    DayOffType.of("weekly", "週休", "週"),
    DayOffType.of("holiday", "祝日", "祝"),
    DayOffType.of("annual-leave", "年次有給休暇", "年"),
    DayOffType.of("pm-annual-leave", "PM年休", "PM年"),
    DayOffType.of("am-annual-leave", "AM年休", "AM年"),
    DayOffType.of("substitute", "代休", "代"),
    DayOffType.of("public-off", "公休", "公"),
    DayOffType.of("exchange", "振替休日", "振"),
    DayOffType.of("care-leave", "介護休暇", "介護"),
    DayOffType.of("special-leave", "特別休暇", "特休"),
    DayOffType.of("rest", "休暇", "休"),
  ]);
}
