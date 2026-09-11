/**
 * WorkingStaffMember — 勤務スタッフ群のメンバー1人（勤務表の1行）
 *
 * 2種類ある。違いは**実体をどこに持つか**だけで、行としては同じ:
 *   - 名簿の人   … 実体は世界に焼き付いた Staff（pinned）。ここは staffId で指す
 *   - 臨時の人   … 名簿に載らないので、実体をこのメンバーが抱える
 *
 * 見分けるルールは1つ:「**実体を抱えていれば臨時の人**」。
 * origin のような別の印を足すと、実体の有無と印の2箇所が真実になり、いつか食い違う。
 *
 * 同一性は常に `staffId`。臨時の人の実体にも id は入っているが、読むときは staffId を
 * 正として被せ直すので、この2つがずれた記録が入ってきても行が分裂しない。
 *
 * **可能勤務帯（その人がこの勤務表で入れる勤務帯）もここが持つ。** 「誰が働くか」と
 * 「その人がどの勤務帯に入れるか」は同じ1つの参加の話なので、別の集約に分けない。
 *
 * state は抱えるものを**インスタンスで**持つ（保存形は別に持つ）。
 * シリアライズ用に入れ子まで plain な {@link WorkingStaffMemberPlain} を定義し、
 * toPlain() / fromPlain() で橋渡しする。不変。
 */
import { Staff, type StaffState } from "./Staff.js";

/** state：抱えている実体はインスタンス */
export type WorkingStaffMemberState = {
  /** この行が指す人。名簿の人も臨時の人も、同一性はこれ */
  staffId: string;
  /** 臨時の人の実体。名簿の人は名簿側に実体があるので持たない */
  staff?: Staff;
  /**
   * この勤務表で入れる勤務帯のID。
   *
   * **省略＝まだ絞っていない＝どの勤務帯にも入れる。** 空配列（どこにも入れない）とは違う。
   * 入ったばかりの人にわざわざ全勤務帯を書き込まなくて済むし、勤務帯が増えても
   * 既定で入れる（絞っていない人に後から席を用意して回る必要がない）。
   */
  allowedShiftIds?: string[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type WorkingStaffMemberPlain = {
  staffId: string;
  staff?: StaffState;
  allowedShiftIds?: string[];
};

export class WorkingStaffMember {
  constructor(readonly state: WorkingStaffMemberState) {}

  /** 名簿の人をメンバーにする（実体は名簿側にある） */
  static ofRoster(staffId: string): WorkingStaffMember {
    return new WorkingStaffMember({ staffId });
  }

  /** この勤務表の中だけの臨時の人をメンバーにする（実体を抱える） */
  static temporary(staff: Staff): WorkingStaffMember {
    return new WorkingStaffMember({ staffId: staff.id, staff });
  }

  // ========== 可能勤務帯 ==========

  /** この勤務表で入れる勤務帯を絞っているか（絞っていなければ全部入れる） */
  get hasShiftLimit(): boolean {
    return this.state.allowedShiftIds !== undefined;
  }

  /** 絞っている勤務帯ID（絞っていなければ undefined＝全部入れる） */
  get allowedShiftIds(): string[] | undefined {
    return this.state.allowedShiftIds;
  }

  /** その勤務帯に入れるか。絞っていなければ何にでも入れる */
  isAllowed(shiftId: string): boolean {
    return this.state.allowedShiftIds?.includes(shiftId) ?? true;
  }

  /**
   * その勤務帯の可否を反転した新しいメンバーを返す。不変。
   *
   * まだ絞っていない人を1つ外すときのために、勤務帯の全体集合を受け取る
   * （「全部入れる」から「これ以外」へ書き下すのに要る）。
   */
  toggleShift(shiftId: string, allShiftIds: readonly string[]): WorkingStaffMember {
    const current = this.state.allowedShiftIds ?? [...allShiftIds];
    const next = current.includes(shiftId)
      ? current.filter((id) => id !== shiftId)
      : [...current, shiftId];
    return new WorkingStaffMember({ ...this.state, allowedShiftIds: next });
  }

  /**
   * その勤務帯を入れるようにした新しいメンバーを返す。不変。
   * 絞っていない人（＝全部入れる）はそのまま返す。勤務帯が増えたときに使う。
   */
  allowShift(shiftId: string): WorkingStaffMember {
    const current = this.state.allowedShiftIds;
    if (current === undefined || current.includes(shiftId)) return this;
    return new WorkingStaffMember({
      ...this.state,
      allowedShiftIds: [...current, shiftId],
    });
  }

  /** 絞りを外して「どの勤務帯にも入れる」に戻した新しいメンバーを返す。不変。 */
  allowAllShifts(): WorkingStaffMember {
    if (!this.hasShiftLimit) return this;
    return new WorkingStaffMember({
      staffId: this.state.staffId,
      staff: this.state.staff,
    });
  }

  get staffId(): string {
    return this.state.staffId;
  }

  /** この勤務表の中だけで足した人か（＝実体を抱えているか） */
  get isTemporary(): boolean {
    return this.state.staff !== undefined;
  }

  /**
   * 抱えている実体（名簿の人は undefined）。
   * id は staffId を正として被せ直す（同一性の出所を1つにする）。
   */
  get staff(): Staff | undefined {
    const staff = this.state.staff;
    return staff && staff.id !== this.state.staffId
      ? new Staff({ ...staff.state, id: this.state.staffId })
      : staff;
  }

  /**
   * このメンバーの実体を解く。臨時の人は自分が抱えているもの、名簿の人は名簿から。
   * 名簿から引けなければ undefined（行にできないので、呼び出し側が落とす）。
   */
  resolve(fromRoster: (staffId: string) => Staff | undefined): Staff | undefined {
    return this.staff ?? fromRoster(this.state.staffId);
  }

  /**
   * 抱えている実体を変換した新しいメンバーを返す。不変。
   * 名簿の人には効かない（実体が名簿側にあるので、ここからは触れない）。
   */
  mapStaff(fn: (staff: Staff) => Staff): WorkingStaffMember {
    const staff = this.staff;
    if (!staff) return this;
    return new WorkingStaffMember({ ...this.state, staff: fn(staff) });
  }

  toPlain(): WorkingStaffMemberPlain {
    const plain: WorkingStaffMemberPlain = { staffId: this.state.staffId };
    if (this.state.staff) plain.staff = this.state.staff.state;
    if (this.state.allowedShiftIds) {
      plain.allowedShiftIds = [...this.state.allowedShiftIds];
    }
    return plain;
  }

  static fromPlain(plain: WorkingStaffMemberPlain): WorkingStaffMember {
    return new WorkingStaffMember({
      staffId: plain.staffId,
      staff: plain.staff ? new Staff(plain.staff) : undefined,
      allowedShiftIds: plain.allowedShiftIds
        ? [...plain.allowedShiftIds]
        : undefined,
    });
  }
}
