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
import { ProfileSelection, type ProfileSelectionPlain } from "./ProfileSelection.js";

export type StaffState = {
  id: string;
  name: string;
  /** 所属部署。未設定のスタッフは空文字列として扱う */
  department?: string;
  /** 休みの形の既定値。未設定は分散型 */
  dayOffStyle?: DayOffStyle;
  /**
   * スタッフプロファイルの辞書の項目で選んだ値（店舗での既定。#236）。
   * 勤務表ごとに WorkingStaffMember で項目ごとに上書きできる。未設定は何も選んでいない
   */
  profile?: ProfileSelection;
};

/** シリアライズ用 */
export type StaffPlain = {
  id: string;
  name: string;
  department?: string;
  dayOffStyle?: DayOffStylePlain;
  /** 何も選んでいなければ書かない（プロファイル以前の記録と同じ形・同じハッシュを保つ） */
  profile?: ProfileSelectionPlain;
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

  /** スタッフプロファイルの辞書の項目で選んだ値（店舗での既定）。未設定は空 */
  get profile(): ProfileSelection {
    return this.state.profile ?? ProfileSelection.EMPTY;
  }

  /**
   * 辞書の項目の値を決めた新しい Staff を返す。空配列はその項目を外す（店舗での既定に
   * 「何も無い」を明示する必要はないので、決めていない状態に戻す）。変わらなければ自分自身。
   */
  setProfileValues(itemId: string, valueIds: readonly string[]): Staff {
    const current = this.profile;
    const next = valueIds.length === 0 ? current.clear(itemId) : current.set(itemId, valueIds);
    if (next === current) return this;
    return new Staff({ ...this.state, profile: next.isEmpty ? undefined : next });
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
    if (this.state.profile && !this.state.profile.isEmpty) {
      plain.profile = this.state.profile.toPlain();
    }
    return plain;
  }

  static fromPlain(plain: StaffPlain): Staff {
    return new Staff({
      id: plain.id,
      name: plain.name,
      department: plain.department,
      dayOffStyle: plain.dayOffStyle ? DayOffStyle.fromPlain(plain.dayOffStyle) : undefined,
      profile: plain.profile?.length ? ProfileSelection.fromPlain(plain.profile) : undefined,
    });
  }
}
