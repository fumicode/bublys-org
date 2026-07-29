/**
 * ResourceRef — 配置対象（社員 or 機械）への参照
 *
 * 配置表のセルは社員も機械も同じように扱いたい。両者を「種別 + id」で統一的に指す値オブジェクト。
 * 不変。id だけでは社員と機械が衝突しうるので、必ず種別とセットで同一性を判定する。
 */

export type ResourceKind = "employee" | "machine";

export type ResourceRefState = {
  kind: ResourceKind;
  id: string;
};

export class ResourceRef {
  constructor(readonly state: ResourceRefState) {}

  static employee(id: string): ResourceRef {
    return new ResourceRef({ kind: "employee", id });
  }

  static machine(id: string): ResourceRef {
    return new ResourceRef({ kind: "machine", id });
  }

  /** key（"employee:e1"）から復元する */
  static fromKey(key: string): ResourceRef {
    const idx = key.indexOf(":");
    const kind = key.slice(0, idx) as ResourceKind;
    const id = key.slice(idx + 1);
    return new ResourceRef({ kind, id });
  }

  get kind(): ResourceKind {
    return this.state.kind;
  }

  get id(): string {
    return this.state.id;
  }

  /** 一意キー "employee:e1" / "machine:m1"（Map のキーや辞書順ソートに使える） */
  get key(): string {
    return `${this.state.kind}:${this.state.id}`;
  }

  get isEmployee(): boolean {
    return this.state.kind === "employee";
  }

  get isMachine(): boolean {
    return this.state.kind === "machine";
  }

  equals(other: ResourceRef): boolean {
    return this.key === other.key;
  }
}
