/**
 * @deprecated TimeSlot は廃止されました。Shift を直接使用してください。
 *
 * このファイルは後方互換性のため残していますが、
 * model/index.ts からはエクスポートされていません。
 */

// 型だけ残す（既存コードのコンパイルエラーを防ぐため）
export type DayType = '準準備日' | '準備日' | '1日目' | '2日目' | '片付け日';

export interface TaskRequirementState {
  readonly taskId: string;
  readonly requiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
  readonly startTime?: string;
  readonly endTime?: string;
}

export interface TimeSlotState {
  readonly id: string;
  readonly dayType: DayType;
  readonly startTime: string;
  readonly endTime: string;
  readonly label: string;
  readonly taskRequirements: readonly TaskRequirementState[];
}

export class TaskRequirement {
  constructor(
    readonly state: TaskRequirementState,
    readonly timeSlotId: string,
    private readonly _slotStartTime: string,
    private readonly _slotEndTime: string,
  ) {}

  get id(): string { return `${this.timeSlotId}_${this.state.taskId}`; }
  get taskId(): string { return this.state.taskId; }
  get requiredCount(): number { return this.state.requiredCount; }
  get minCount(): number { return this.state.minCount; }
  get maxCount(): number { return this.state.maxCount; }
  get startTime(): string { return this.state.startTime ?? this._slotStartTime; }
  get endTime(): string { return this.state.endTime ?? this._slotEndTime; }
}

export class TimeSlot {
  private readonly _requirements: readonly TaskRequirement[];

  constructor(readonly state: TimeSlotState) {
    this._requirements = state.taskRequirements.map(
      (req) => new TaskRequirement(req, state.id, state.startTime, state.endTime)
    );
  }

  get id(): string { return this.state.id; }
  get dayType(): DayType { return this.state.dayType; }
  get startTime(): string { return this.state.startTime; }
  get endTime(): string { return this.state.endTime; }
  get label(): string { return this.state.label; }
  get taskRequirements(): readonly TaskRequirement[] { return this._requirements; }

  getRequirementForTask(taskId: string): TaskRequirement | undefined {
    return this._requirements.find((req) => req.taskId === taskId);
  }

  overlaps(other: TimeSlot): boolean {
    return this.state.id === other.state.id;
  }

  getDurationHours(): number {
    const [startH, startM] = this.state.startTime.split(':').map(Number);
    const [endH, endM] = this.state.endTime.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  }
}
