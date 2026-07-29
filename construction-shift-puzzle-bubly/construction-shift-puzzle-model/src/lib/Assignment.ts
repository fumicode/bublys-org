/**
 * Assignment — 配置（1件）
 *
 * 「あるリソース（社員/機械）を、ある現場へ、ある日に配置する」の1レコード。
 * 配置表（PlacementBoard）が Assignment の集合を持つ。不変。
 *
 * state に ResourceRef / WorkingDay のインスタンスを入れ子に持つため、保存用に plain 変換を明示する。
 */
import { ResourceRef, type ResourceRefState } from "./ResourceRef.js";
import { WorkingDay } from "./WorkingDay.js";

export type AssignmentState = {
  ref: ResourceRef;
  siteId: string;
  day: WorkingDay;
};

export type AssignmentPlain = {
  ref: ResourceRefState;
  siteId: string;
  /** WorkingDay.key（"2026-07-01"） */
  day: string;
};

export class Assignment {
  constructor(readonly state: AssignmentState) {}

  get ref(): ResourceRef {
    return this.state.ref;
  }

  get siteId(): string {
    return this.state.siteId;
  }

  get day(): WorkingDay {
    return this.state.day;
  }

  /** 同じ (ref, siteId, day) か */
  matches(ref: ResourceRef, siteId: string, day: WorkingDay): boolean {
    return (
      this.state.ref.equals(ref) &&
      this.state.siteId === siteId &&
      this.state.day.equals(day)
    );
  }

  toPlain(): AssignmentPlain {
    return {
      ref: { ...this.state.ref.state },
      siteId: this.state.siteId,
      day: this.state.day.key,
    };
  }

  static fromPlain(plain: AssignmentPlain): Assignment {
    return new Assignment({
      ref: new ResourceRef(plain.ref),
      siteId: plain.siteId,
      day: WorkingDay.fromKey(plain.day),
    });
  }
}
