/**
 * PlacementBoard — 配置表（中心集約）
 *
 * 「何日に・どの現場へ・誰/どの機械を配置するか」を一枚で表す。
 * 縦=現場、横=日付のグリッドの裏側にあるモデル。ドメインクラスは不変で、更新メソッドは
 * 新しいインスタンスを返す。ビジネスロジック（配置・移動・重複検知）はすべてここに生やし、
 * Redux reducer には書かない。
 *
 * 期間は from..to（両端含む）で保持する。初回は全社1枚の配置表を想定。
 */
import { Assignment, type AssignmentPlain } from "./Assignment.js";
import { ResourceRef } from "./ResourceRef.js";
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

/** 同一リソースが同じ日に複数現場へ配置された重複 */
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
   * リソースを現場へ配置する。同一 (ref, siteId, day) が既にあれば何もしない（冪等）。
   * 別現場の同日への配置は許す（＝重複配置として conflicts() で検知する対象になる）。
   */
  assign(ref: ResourceRef, siteId: string, day: WorkingDay): PlacementBoard {
    if (this.state.assignments.some((a) => a.matches(ref, siteId, day))) {
      return this;
    }
    const next = new Assignment({ ref, siteId, day });
    return new PlacementBoard({
      ...this.state,
      assignments: [...this.state.assignments, next],
    });
  }

  /** 指定の (ref, siteId, day) の配置を外す */
  unassign(ref: ResourceRef, siteId: string, day: WorkingDay): PlacementBoard {
    const assignments = this.state.assignments.filter(
      (a) => !a.matches(ref, siteId, day)
    );
    if (assignments.length === this.state.assignments.length) return this;
    return new PlacementBoard({ ...this.state, assignments });
  }

  /** ある日のリソースを現場から現場へ移す（unassign + assign） */
  move(
    ref: ResourceRef,
    day: WorkingDay,
    fromSiteId: string,
    toSiteId: string
  ): PlacementBoard {
    return this.unassign(ref, fromSiteId, day).assign(ref, toSiteId, day);
  }

  // --- クエリ ---

  /** ある現場の全配置 */
  assignmentsForSite(siteId: string): Assignment[] {
    return this.state.assignments.filter((a) => a.siteId === siteId);
  }

  /** ある現場×ある日に配置されたリソース一覧 */
  resourcesOn(siteId: string, day: WorkingDay): ResourceRef[] {
    return this.state.assignments
      .filter((a) => a.siteId === siteId && a.day.equals(day))
      .map((a) => a.ref);
  }

  /** あるリソースが、ある日に配置されている現場ID一覧（重複なし） */
  sitesOf(ref: ResourceRef, day: WorkingDay): string[] {
    const ids = this.state.assignments
      .filter((a) => a.ref.equals(ref) && a.day.equals(day))
      .map((a) => a.siteId);
    return [...new Set(ids)];
  }

  /** 重複配置（同一リソースが同じ日に複数現場）を列挙する */
  conflicts(): PlacementConflict[] {
    // key: `${refKey}\n${dayKey}` -> siteIds
    const map = new Map<string, { ref: ResourceRef; day: WorkingDay; siteIds: Set<string> }>();
    for (const a of this.state.assignments) {
      const k = `${a.ref.key}\n${a.day.key}`;
      const entry = map.get(k);
      if (entry) {
        entry.siteIds.add(a.siteId);
      } else {
        map.set(k, { ref: a.ref, day: a.day, siteIds: new Set([a.siteId]) });
      }
    }
    const out: PlacementConflict[] = [];
    for (const { ref, day, siteIds } of map.values()) {
      if (siteIds.size > 1) {
        out.push({ ref, day, siteIds: [...siteIds] });
      }
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
        .filter((a) => a.day.equals(day))
        .map((a) => a.ref.key)
    );
    return allRefs.filter((r) => !busy.has(r.key));
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
