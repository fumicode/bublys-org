/**
 * PlacementBoard — 配置表（中心集約）
 *
 * 「何日に・どの現場へ・誰/どの機械を配置するか」を一枚で表す。
 * 縦=現場、横=日付のグリッドの裏側にあるモデル。ドメインクラスは不変で、更新メソッドは
 * 新しいインスタンスを返す。ビジネスロジック（配置・移動・伸縮・重複検知）はすべてここに生やし、
 * Redux reducer には書かない。
 *
 * 配置は期間（from..to）を持つ span。各 Assignment は id で一意（リサイズ/移動/削除の対象）。
 * 期間は from..to（両端含む）で保持する。初回は全社1枚の配置表を想定。
 */
import { Assignment, type AssignmentPlain } from "./Assignment.js";
import { ResourceRef } from "./ResourceRef.js";
import { DateRange } from "./DateRange.js";
import { WorkingDay } from "./WorkingDay.js";

export type PlacementBoardState = {
  id: string;
  from: WorkingDay;
  to: WorkingDay;
  assignments: Assignment[];
};

export type PlacementBoardPlain = {
  id: string;
  /** WorkingDay.key */
  from: string;
  /** WorkingDay.key */
  to: string;
  assignments: AssignmentPlain[];
};

/** 同一リソースが同じ日に複数現場へ配置された重複（日単位） */
export type PlacementConflict = {
  ref: ResourceRef;
  day: WorkingDay;
  siteIds: string[];
};

export class PlacementBoard {
  constructor(readonly state: PlacementBoardState) {}

  static create(params: {
    id: string;
    from: WorkingDay;
    to: WorkingDay;
  }): PlacementBoard {
    return new PlacementBoard({ ...params, assignments: [] });
  }

  get id(): string {
    return this.state.id;
  }

  get from(): WorkingDay {
    return this.state.from;
  }

  get to(): WorkingDay {
    return this.state.to;
  }

  get assignments(): Assignment[] {
    return this.state.assignments;
  }

  /** 期間内の日付を列挙する（両端含む） */
  days(): WorkingDay[] {
    return WorkingDay.range(this.state.from, this.state.to);
  }

  // --- 更新（不変・新インスタンスを返す） ---

  /**
   * リソースを現場へ期間で配置する（span を1件追加）。id は feature 層が採番する。
   * 別現場の同期間への配置も許す（＝重複配置として conflicts() で検知する対象になる）。
   */
  assign(
    id: string,
    ref: ResourceRef,
    siteId: string,
    from: WorkingDay,
    to: WorkingDay
  ): PlacementBoard {
    const next = new Assignment({ id, ref, siteId, range: DateRange.of(from, to) });
    return new PlacementBoard({
      ...this.state,
      assignments: [...this.state.assignments, next],
    });
  }

  /** id で配置を外す */
  unassignById(id: string): PlacementBoard {
    const assignments = this.state.assignments.filter((a) => a.id !== id);
    if (assignments.length === this.state.assignments.length) return this;
    return new PlacementBoard({ ...this.state, assignments });
  }

  /** 配置の期間を変更する（端ドラッグでの伸縮） */
  resizeAssignment(id: string, from: WorkingDay, to: WorkingDay): PlacementBoard {
    return this.mapAssignment(id, (a) => a.withRange(DateRange.of(from, to)));
  }

  /** 配置を別現場・別期間へ移動する（本体ドラッグ） */
  moveAssignment(
    id: string,
    siteId: string,
    from: WorkingDay,
    to: WorkingDay
  ): PlacementBoard {
    return this.mapAssignment(id, (a) =>
      a.withSite(siteId).withRange(DateRange.of(from, to))
    );
  }

  private mapAssignment(id: string, fn: (a: Assignment) => Assignment): PlacementBoard {
    let changed = false;
    const assignments = this.state.assignments.map((a) => {
      if (a.id !== id) return a;
      changed = true;
      return fn(a);
    });
    if (!changed) return this;
    return new PlacementBoard({ ...this.state, assignments });
  }

  // --- クエリ ---

  /** ある現場の全配置 */
  assignmentsForSite(siteId: string): Assignment[] {
    return this.state.assignments.filter((a) => a.siteId === siteId);
  }

  /** ある現場×ある日に配置されたリソース一覧 */
  resourcesOn(siteId: string, day: WorkingDay): ResourceRef[] {
    return this.state.assignments
      .filter((a) => a.siteId === siteId && a.covers(day))
      .map((a) => a.ref);
  }

  /** あるリソースが、ある日に配置されている現場ID一覧（重複なし） */
  sitesOf(ref: ResourceRef, day: WorkingDay): string[] {
    const ids = this.state.assignments
      .filter((a) => a.ref.equals(ref) && a.covers(day))
      .map((a) => a.siteId);
    return [...new Set(ids)];
  }

  /** 重複配置（同一リソースが同じ日に複数現場）を日単位で列挙する */
  conflicts(): PlacementConflict[] {
    // key: `${refKey}\n${dayKey}` -> { ref, day, siteIds }
    const map = new Map<
      string,
      { ref: ResourceRef; day: WorkingDay; siteIds: Set<string> }
    >();
    for (const a of this.state.assignments) {
      for (const day of a.range.days()) {
        const k = `${a.ref.key}\n${day.key}`;
        const entry = map.get(k);
        if (entry) {
          entry.siteIds.add(a.siteId);
        } else {
          map.set(k, { ref: a.ref, day, siteIds: new Set([a.siteId]) });
        }
      }
    }
    const out: PlacementConflict[] = [];
    for (const { ref, day, siteIds } of map.values()) {
      if (siteIds.size > 1) out.push({ ref, day, siteIds: [...siteIds] });
    }
    return out;
  }

  /** あるリソースが、ある日に重複配置されているか */
  isConflicted(ref: ResourceRef, day: WorkingDay): boolean {
    return this.sitesOf(ref, day).length > 1;
  }

  /** ある日、どこにも配置されていないリソース（空き）を返す */
  freeResourcesOn(day: WorkingDay, allRefs: ResourceRef[]): ResourceRef[] {
    const busy = new Set(
      this.state.assignments
        .filter((a) => a.covers(day))
        .map((a) => a.ref.key)
    );
    return allRefs.filter((r) => !busy.has(r.key));
  }

  /**
   * あるリソースが、どの現場にも配置されていない（＝本社にある）期間を、
   * 配置表の窓 [from,to] 内で連続する最大区間の配列として返す。
   */
  freeSpans(ref: ResourceRef): DateRange[] {
    const days = this.days();
    const spans: DateRange[] = [];
    let start: WorkingDay | null = null;
    let prev: WorkingDay | null = null;
    for (const day of days) {
      const free = this.sitesOf(ref, day).length === 0;
      if (free) {
        if (start === null) start = day;
        prev = day;
      } else if (start !== null && prev !== null) {
        spans.push(DateRange.of(start, prev));
        start = null;
        prev = null;
      }
    }
    if (start !== null && prev !== null) spans.push(DateRange.of(start, prev));
    return spans;
  }

  /**
   * あるリソースが、ある現場で、期間 range の全日を覆って配置されているか。
   * 機械希望（MachineRequest）が叶ったかの導出に使う。
   */
  coversResource(ref: ResourceRef, siteId: string, range: DateRange): boolean {
    const spans = this.state.assignments.filter(
      (a) => a.ref.equals(ref) && a.siteId === siteId
    );
    return range.days().every((day) => spans.some((a) => a.covers(day)));
  }

  // --- plain 変換（入れ子インスタンスありなので明示） ---

  toPlain(): PlacementBoardPlain {
    return {
      id: this.state.id,
      from: this.state.from.key,
      to: this.state.to.key,
      assignments: this.state.assignments.map((a) => a.toPlain()),
    };
  }

  static fromPlain(plain: PlacementBoardPlain): PlacementBoard {
    return new PlacementBoard({
      id: plain.id,
      from: WorkingDay.fromKey(plain.from),
      to: WorkingDay.fromKey(plain.to),
      assignments: plain.assignments.map(Assignment.fromPlain),
    });
  }
}
