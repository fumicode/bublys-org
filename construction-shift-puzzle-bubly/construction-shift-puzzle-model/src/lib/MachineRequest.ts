/**
 * MachineRequest — 機械希望
 *
 * 現場の人が「この特定の機械を、この期間に使いたい」と表明する希望。不変。
 * 「叶ったか（fulfilled）」は保存しない。実際に配置されたかは PlacementBoard から導出する
 *   （board.coversResource(ResourceRef.machine(machineId), siteId, range)）。
 * これにより希望と実配置の間で状態がズレない。
 *
 * state は完全 plain（instanceof を持つ入れ子なし）なので、記述子の serialize は省略できる。
 */
import { WorkingDay } from "./WorkingDay.js";
import { DateRange } from "./DateRange.js";

export type MachineRequestState = {
  id: string;
  siteId: string;
  machineId: string;
  /** WorkingDay.key */
  from: string;
  /** WorkingDay.key */
  to: string;
};

export class MachineRequest {
  constructor(readonly state: MachineRequestState) {}

  static create(params: {
    id: string;
    siteId: string;
    machineId: string;
    from: WorkingDay;
    to: WorkingDay;
  }): MachineRequest {
    const range = DateRange.of(params.from, params.to);
    return new MachineRequest({
      id: params.id,
      siteId: params.siteId,
      machineId: params.machineId,
      from: range.from.key,
      to: range.to.key,
    });
  }

  get id(): string {
    return this.state.id;
  }

  get siteId(): string {
    return this.state.siteId;
  }

  get machineId(): string {
    return this.state.machineId;
  }

  range(): DateRange {
    return DateRange.of(
      WorkingDay.fromKey(this.state.from),
      WorkingDay.fromKey(this.state.to)
    );
  }

  /** 期間を変更した新しい希望を返す */
  resize(from: WorkingDay, to: WorkingDay): MachineRequest {
    const range = DateRange.of(from, to);
    return new MachineRequest({
      ...this.state,
      from: range.from.key,
      to: range.to.key,
    });
  }

  /** 現場・期間を変更した新しい希望を返す */
  moveTo(siteId: string, from: WorkingDay, to: WorkingDay): MachineRequest {
    const range = DateRange.of(from, to);
    return new MachineRequest({
      ...this.state,
      siteId,
      from: range.from.key,
      to: range.to.key,
    });
  }
}
