/**
 * WorkingStaffGroup — 勤務スタッフ群（その勤務表で働く人たちの集約）
 *
 * 勤務表とスタッフの**間に噛ませる入れ物**。以前は勤務表の行が「その世界に居る
 * スタッフ全員」だったので、勤務表の側からは誰も足せず・外せず・並べ替えられなかった。
 * 「誰が働くか」を持つ集約を独立させると、その3つが勤務表の中で完結する。
 *
 * メンバー1人の形は {@link WorkingStaffMember}。名簿の人は staffId で指すだけ、
 * 臨時の人は実体をメンバーが抱える（名簿には載らないので）。
 * 群は勤務表と同じ世界線に載るので、臨時の人は時間移動で一緒に現れたり消えたりする。
 *
 * 並び順は members の順そのもの（＝勤務表の行順）。
 * state はメンバーを**インスタンスで**持つ。シリアライズ用に入れ子まで plain な
 * {@link WorkingStaffGroupPlain} を別途定義し、toPlain() / fromPlain() で橋渡しする。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { Staff } from "./Staff.js";
import {
  WorkingStaffMember,
  type WorkingStaffMemberPlain,
} from "./WorkingStaffMember.js";

/** state：メンバーはインスタンスで保持する */
export type WorkingStaffGroupState = {
  /** この集約のID。勤務表が workingStaffGroupId で指す（勤務表1つにつき群1つ） */
  id: string;
  /** 働く人たち。**この配列の順が勤務表の行順** */
  members: WorkingStaffMember[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type WorkingStaffGroupPlain = {
  id: string;
  members: WorkingStaffMemberPlain[];
};

export class WorkingStaffGroup {
  constructor(readonly state: WorkingStaffGroupState) {}

  /** 名簿から来た人だけで群を作る（勤務表が生まれるとき＝焼き付けたメンバーそのまま） */
  static ofRoster(id: string, staffIds: readonly string[]): WorkingStaffGroup {
    return new WorkingStaffGroup({
      id,
      members: staffIds.map((staffId) => WorkingStaffMember.ofRoster(staffId)),
    });
  }

  get id(): string {
    return this.state.id;
  }

  /** 働く人たち（並び順のまま） */
  get members(): WorkingStaffMember[] {
    return this.state.members;
  }

  /** 働く人のID一覧（並び順のまま） */
  staffIds(): string[] {
    return this.state.members.map((m) => m.staffId);
  }

  /** その人がこの勤務表で働くか */
  has(staffId: string): boolean {
    return this.state.members.some((m) => m.staffId === staffId);
  }

  /** その人がこの勤務表の中だけで足した臨時の人か */
  isTemporary(staffId: string): boolean {
    return this.memberOf(staffId)?.isTemporary ?? false;
  }

  /** 臨時の人たち（実体はメンバーが抱えている） */
  temporaryStaff(): Staff[] {
    return this.state.members
      .map((m) => m.staff)
      .filter((staff): staff is Staff => staff !== undefined);
  }

  /**
   * 勤務表の行（並び順つきのスタッフ）を解く。
   *
   * 名簿メンバーの実体はこの群には無いので、世界に焼き付いた名簿（roster）から引く。
   * 引けなかった名簿メンバーは行に出せないので落とす（この群を後から作った勤務表など、
   * 焼き付けと群がずれている場合にだけ起こる）。臨時メンバーは実体を抱えているので常に出る。
   */
  resolve(roster: readonly Staff[]): Staff[] {
    const byId = new Map(roster.map((s) => [s.id, s]));
    return this.state.members
      .map((m) => m.resolve((staffId) => byId.get(staffId)))
      .filter((staff): staff is Staff => staff !== undefined);
  }

  /** 名簿の人を末尾に加えた新しい群を返す。既に居れば何もしない。不変。 */
  addRoster(staffId: string): WorkingStaffGroup {
    return this.withMember(staffId, WorkingStaffMember.ofRoster(staffId));
  }

  /** 臨時の人を末尾に加えた新しい群を返す。ID が衝突する人が居れば何もしない。不変。 */
  addTemporary(staff: Staff): WorkingStaffGroup {
    return this.withMember(staff.id, WorkingStaffMember.temporary(staff));
  }

  /**
   * その人をこの勤務表から外した新しい群を返す。不変。
   *
   * 名簿の人を外しても名簿は動かない（この勤務表で働かないだけ）。
   * 臨時の人を外すと、実体ごと消える（名簿には元から載っていない）。
   */
  remove(staffId: string): WorkingStaffGroup {
    return new WorkingStaffGroup({
      ...this.state,
      members: this.state.members.filter((m) => m.staffId !== staffId),
    });
  }

  /** その人を指定位置へ動かした新しい群を返す（＝行の並び替え）。不変。 */
  move(staffId: string, toIndex: number): WorkingStaffGroup {
    const from = this.state.members.findIndex((m) => m.staffId === staffId);
    if (from < 0) return this;
    const to = Math.max(0, Math.min(this.state.members.length - 1, toIndex));
    if (to === from) return this;
    const members = [...this.state.members];
    const [moved] = members.splice(from, 1);
    members.splice(to, 0, moved);
    return new WorkingStaffGroup({ ...this.state, members });
  }

  /** 臨時の人の名前を変えた新しい群を返す。名簿の人には効かない。不変。 */
  renameTemporary(staffId: string, name: string): WorkingStaffGroup {
    return this.mapMember(staffId, (m) => m.mapStaff((staff) => staff.rename(name)));
  }

  /** 臨時の人の部署を変えた新しい群を返す。名簿の人には効かない。不変。 */
  changeTemporaryDepartment(staffId: string, department: string): WorkingStaffGroup {
    return this.mapMember(staffId, (m) =>
      m.mapStaff((staff) => staff.changeDepartment(department))
    );
  }

  private memberOf(staffId: string): WorkingStaffMember | undefined {
    return this.state.members.find((m) => m.staffId === staffId);
  }

  private withMember(
    staffId: string,
    member: WorkingStaffMember
  ): WorkingStaffGroup {
    if (this.has(staffId)) return this;
    return new WorkingStaffGroup({
      ...this.state,
      members: [...this.state.members, member],
    });
  }

  private mapMember(
    staffId: string,
    fn: (member: WorkingStaffMember) => WorkingStaffMember
  ): WorkingStaffGroup {
    const current = this.memberOf(staffId);
    if (!current) return this;
    const next = fn(current);
    if (next === current) return this;
    return new WorkingStaffGroup({
      ...this.state,
      members: this.state.members.map((m) => (m.staffId === staffId ? next : m)),
    });
  }

  // ========== シリアライズ ==========

  toPlain(): WorkingStaffGroupPlain {
    return {
      id: this.state.id,
      members: this.state.members.map((m) => m.toPlain()),
    };
  }

  static fromPlain(plain: WorkingStaffGroupPlain): WorkingStaffGroup {
    return new WorkingStaffGroup({
      id: plain.id,
      members: plain.members.map((m) => WorkingStaffMember.fromPlain(m)),
    });
  }
}
