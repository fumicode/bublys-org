/**
 * WorkingStaffGroup — 勤務スタッフ群（その勤務表で働く人たちの集約）
 *
 * 勤務表とスタッフの**間に噛ませる入れ物**。以前は勤務表の行が「その世界に居る
 * スタッフ全員」だったので、勤務表の側からは誰も足せず・外せず・並べ替えられなかった。
 * 「誰が働くか」を持つ集約を独立させると、その3つが勤務表の中で完結する。
 *
 * メンバーは2種類あり、**出自で区別する**:
 *   - roster    … 名簿から来た人。実体は世界に焼き付いた Staff（pinned）で、ここは id で指す。
 *                 名簿側の改名・削除はこの世界には届かない（固定メンバーの意味）。
 *   - temporary … この勤務表の中だけで足した臨時の人。名簿には載らないので、
 *                 実体そのものをこの群が抱える。群は勤務表と同じ世界線に載るので、
 *                 臨時の人は時間移動で一緒に現れたり消えたりする。
 *
 * 並び順は members の順そのもの（＝勤務表の行順）。
 * state は入れ子まで完全に plain（StaffState は plain）なので、世界線記録の codec は不要。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { Staff, type StaffState } from "./Staff.js";

/** メンバー1人。出自（名簿から来たか、この勤務表で足したか）で形が違う */
export type WorkingStaffMemberState =
  | { origin: "roster"; staffId: string }
  | { origin: "temporary"; staff: StaffState };

export type WorkingStaffGroupState = {
  /** この集約のID。勤務表が workingStaffGroupId で指す（勤務表1つにつき群1つ） */
  id: string;
  /** 働く人たち。**この配列の順が勤務表の行順** */
  members: WorkingStaffMemberState[];
};

/** メンバーのスタッフID（出自によらず引ける） */
function memberStaffId(member: WorkingStaffMemberState): string {
  return member.origin === "roster" ? member.staffId : member.staff.id;
}

export class WorkingStaffGroup {
  constructor(readonly state: WorkingStaffGroupState) {}

  /** 名簿から来た人だけで群を作る（勤務表が生まれるとき＝焼き付けたメンバーそのまま） */
  static ofRoster(id: string, staffIds: readonly string[]): WorkingStaffGroup {
    return new WorkingStaffGroup({
      id,
      members: staffIds.map((staffId) => ({ origin: "roster", staffId })),
    });
  }

  get id(): string {
    return this.state.id;
  }

  get members(): readonly WorkingStaffMemberState[] {
    return this.state.members;
  }

  /** 働く人のID一覧（並び順のまま） */
  staffIds(): string[] {
    return this.state.members.map(memberStaffId);
  }

  /** その人がこの勤務表で働くか */
  has(staffId: string): boolean {
    return this.state.members.some((m) => memberStaffId(m) === staffId);
  }

  /** その人がこの勤務表の中だけで足した臨時の人か */
  isTemporary(staffId: string): boolean {
    return this.state.members.some(
      (m) => m.origin === "temporary" && m.staff.id === staffId
    );
  }

  /** 臨時の人たち（実体はこの群が持っている） */
  temporaryStaff(): Staff[] {
    return this.state.members
      .filter((m) => m.origin === "temporary")
      .map((m) => new Staff((m as { staff: StaffState }).staff));
  }

  /**
   * 勤務表の行（並び順つきのスタッフ）を解く。
   *
   * 名簿メンバーの実体はこの群には無いので、世界に焼き付いた名簿（roster）から引く。
   * 引けなかった名簿メンバーは行に出せないので落とす（この群を後から作った勤務表など、
   * 焼き付けと群がずれている場合にだけ起こる）。臨時メンバーは群が実体を持っているので
   * 常に出る。
   */
  resolve(roster: readonly Staff[]): Staff[] {
    const byId = new Map(roster.map((s) => [s.id, s]));
    const resolved: Staff[] = [];
    for (const member of this.state.members) {
      if (member.origin === "temporary") {
        resolved.push(new Staff(member.staff));
        continue;
      }
      const staff = byId.get(member.staffId);
      if (staff) resolved.push(staff);
    }
    return resolved;
  }

  /** 名簿の人を末尾に加えた新しい群を返す。既に居れば何もしない。不変。 */
  addRoster(staffId: string): WorkingStaffGroup {
    if (this.has(staffId)) return this;
    return new WorkingStaffGroup({
      ...this.state,
      members: [...this.state.members, { origin: "roster", staffId }],
    });
  }

  /** 臨時の人を末尾に加えた新しい群を返す。ID が衝突する人が居れば何もしない。不変。 */
  addTemporary(staff: Staff): WorkingStaffGroup {
    if (this.has(staff.id)) return this;
    return new WorkingStaffGroup({
      ...this.state,
      members: [...this.state.members, { origin: "temporary", staff: staff.state }],
    });
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
      members: this.state.members.filter((m) => memberStaffId(m) !== staffId),
    });
  }

  /** その人を指定位置へ動かした新しい群を返す（＝行の並び替え）。不変。 */
  move(staffId: string, toIndex: number): WorkingStaffGroup {
    const from = this.state.members.findIndex((m) => memberStaffId(m) === staffId);
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
    return this.mapTemporary(staffId, (staff) => staff.rename(name));
  }

  /** 臨時の人の部署を変えた新しい群を返す。名簿の人には効かない。不変。 */
  changeTemporaryDepartment(staffId: string, department: string): WorkingStaffGroup {
    return this.mapTemporary(staffId, (staff) => staff.changeDepartment(department));
  }

  private mapTemporary(
    staffId: string,
    fn: (staff: Staff) => Staff
  ): WorkingStaffGroup {
    if (!this.isTemporary(staffId)) return this;
    return new WorkingStaffGroup({
      ...this.state,
      members: this.state.members.map((m) =>
        m.origin === "temporary" && m.staff.id === staffId
          ? { origin: "temporary", staff: fn(new Staff(m.staff)).state }
          : m
      ),
    });
  }
}
