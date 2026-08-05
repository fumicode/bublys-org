/**
 * Assignment — 配置（1件・期間）
 *
 * 「あるリソース（社員/機械）を、ある現場へ、ある期間（from..to）配置する」の1レコード。
 * 配置表（PlacementBoard）が Assignment の集合を持つ。不変。
 *
 * id を持つ = リサイズ/移動/削除の対象を一意に特定するため（id の採番は feature 層の責務）。
 * state に ResourceRef / DateRange のインスタンスを入れ子に持つため、保存用に plain 変換を明示する。
 */
import { ResourceRef, type ResourceRefState } from "./ResourceRef.js";
import { DateRange } from "./DateRange.js";
import { WorkingDay } from "./WorkingDay.js";

export type AssignmentState = {
  id: string;
  ref: ResourceRef;
  siteId: string;
  range: DateRange;
};

export type AssignmentPlain = {
  id: string;
  ref: ResourceRefState;
  siteId: string;
  /** WorkingDay.key */
  from: string;
  /** WorkingDay.key */
  to: string;
};

/** 旧形式（1日単位）plain の後方互換用 */
type LegacyAssignmentPlain = {
  ref: ResourceRefState;
  siteId: string;
  day: string;
};

export class Assignment {
  constructor(readonly state: AssignmentState) {}

  get id(): string {
    return this.state.id;
  }

  get ref(): ResourceRef {
    return this.state.ref;
  }

  get siteId(): string {
    return this.state.siteId;
  }

  get range(): DateRange {
    return this.state.range;
  }

  /** その日を覆うか */
  covers(day: WorkingDay): boolean {
    return this.state.range.contains(day);
  }

  /** 期間が重なるか */
  overlaps(range: DateRange): boolean {
    return this.state.range.overlaps(range);
  }

  withRange(range: DateRange): Assignment {
    return new Assignment({ ...this.state, range });
  }

  withSite(siteId: string): Assignment {
    return new Assignment({ ...this.state, siteId });
  }

  toPlain(): AssignmentPlain {
    return {
      id: this.state.id,
      ref: { ...this.state.ref.state },
      siteId: this.state.siteId,
      from: this.state.range.from.key,
      to: this.state.range.to.key,
    };
  }

  static fromPlain(plain: AssignmentPlain | LegacyAssignmentPlain): Assignment {
    // 後方互換: 旧形式 { ref, siteId, day } は from=to=day として読む
    if ("day" in plain) {
      const ref = new ResourceRef(plain.ref);
      return new Assignment({
        id: `${ref.key}@${plain.siteId}#${plain.day}`,
        ref,
        siteId: plain.siteId,
        range: DateRange.single(WorkingDay.fromKey(plain.day)),
      });
    }
    return new Assignment({
      id: plain.id,
      ref: new ResourceRef(plain.ref),
      siteId: plain.siteId,
      range: DateRange.of(WorkingDay.fromKey(plain.from), WorkingDay.fromKey(plain.to)),
    });
  }
}
