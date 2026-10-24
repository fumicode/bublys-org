/**
 * Staff — スタッフ（従業員）ドメインモデル
 *
 * ドメインクラスは不変。更新メソッドは新しいインスタンスを返す。
 * department は省略可能（既存データとの互換性を保つため）。
 *
 * 休みの形（{@link DayOffStyle}）はその人の既定値。勤務表ごとに WorkingStaffMember で
 * 上書きできる。state は休みの形を**インスタンスで**持つので、保存形は {@link StaffPlain}。
 */
import { DayOffStyle, type DayOffStylePlain } from "./DayOffStyle.js";

export type StaffState = {
  id: string;
  name: string;
  /** 所属部署。未設定のスタッフは空文字列として扱う */
  department?: string;
  /** 休みの形の既定値。未設定は分散型 */
  dayOffStyle?: DayOffStyle;
};

/** シリアライズ用 */
export type StaffPlain = {
  id: string;
  name: string;
  department?: string;
  dayOffStyle?: DayOffStylePlain;
};

export class Staff {
  constructor(readonly state: StaffState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 所属部署。未設定のスタッフは空文字列 */
  get department(): string {
    return this.state.department ?? "";
  }

  /** 休みの形を決めているか（決めていなければ分散型として扱う） */
  get hasDayOffStyle(): boolean {
    return this.state.dayOffStyle !== undefined;
  }

  /** 休みの形。未設定は分散型 */
  get dayOffStyle(): DayOffStyle {
    return this.state.dayOffStyle ?? DayOffStyle.DEFAULT;
  }

  /** 名前を変更した新しい Staff を返す。変わらなければ自分自身。 */
  rename(name: string): Staff {
    if (name === this.state.name) return this;
    return new Staff({ ...this.state, name });
  }

  /** 部署を変更した新しい Staff を返す。変わらなければ自分自身。 */
  changeDepartment(department: string): Staff {
    if (department === this.department) return this;
    return new Staff({ ...this.state, department });
  }

  /** 休みの形を変えた新しい Staff を返す。変わらなければ自分自身。 */
  changeDayOffStyle(style: DayOffStyle): Staff {
    if (this.hasDayOffStyle && style.equals(this.dayOffStyle)) return this;
    return new Staff({ ...this.state, dayOffStyle: style });
  }

  toPlain(): StaffPlain {
    const plain: StaffPlain = { id: this.state.id, name: this.state.name };
    if (this.state.department !== undefined) plain.department = this.state.department;
    if (this.state.dayOffStyle) plain.dayOffStyle = this.state.dayOffStyle.toPlain();
    return plain;
  }

  static fromPlain(plain: StaffPlain): Staff {
    return new Staff({
      id: plain.id,
      name: plain.name,
      department: plain.department,
      dayOffStyle: plain.dayOffStyle ? DayOffStyle.fromPlain(plain.dayOffStyle) : undefined,
    });
  }
}
