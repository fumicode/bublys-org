/**
 * Machine — 機械
 *
 * トラック・ショベルカーなど、現場に配置されるリソースの1種。ドメインクラスは不変。
 * kind は種別を表す文字列。代表値を定数で用意するが、拡張しやすいよう文字列型にしておく。
 */

/** 機械種別の代表値（自由文字列だが、UI やシードでこれらを使う） */
export const MachineKind = {
  Truck: "truck",
  Excavator: "excavator",
  Crane: "crane",
  Roller: "roller",
  Other: "other",
} as const;
export type MachineKind = string;

export type MachineState = {
  id: string;
  name: string;
  /** 機械種別（例: "truck", "excavator"） */
  kind: MachineKind;
};

export class Machine {
  constructor(readonly state: MachineState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get kind(): MachineKind {
    return this.state.kind;
  }

  rename(name: string): Machine {
    return new Machine({ ...this.state, name });
  }

  changeKind(kind: MachineKind): Machine {
    return new Machine({ ...this.state, kind });
  }
}
