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
};

/** シリアライズ用：入れ子まで全部 plain */
export type WorkingStaffMemberPlain = {
  staffId: string;
  staff?: StaffState;
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
    return WorkingStaffMember.temporary(fn(staff));
  }

  toPlain(): WorkingStaffMemberPlain {
    const staff = this.state.staff;
    return staff
      ? { staffId: this.state.staffId, staff: staff.state }
      : { staffId: this.state.staffId };
  }

  static fromPlain(plain: WorkingStaffMemberPlain): WorkingStaffMember {
    return new WorkingStaffMember({
      staffId: plain.staffId,
      staff: plain.staff ? new Staff(plain.staff) : undefined,
    });
  }
}
