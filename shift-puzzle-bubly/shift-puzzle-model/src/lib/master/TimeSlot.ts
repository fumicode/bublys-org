/**
 * 時間帯ドメインモデル
 * TaskRequirement（必要人数）を集約として含む
 */

// ========== 型定義 ==========

/** 日種別（5日分） */
export type DayType = '準準備日' | '準備日' | '1日目' | '2日目' | '片付け日';

/** タスク必要人数の状態（TimeSlot集約の一部） */
export interface TaskRequirementState {
  readonly taskId: string;
  readonly requiredCount: number;
  readonly minCount: number;
  readonly maxCount: number;
}

/** 時間帯の状態 */
export interface TimeSlotState {
  readonly id: string;
  readonly dayType: DayType;
  readonly startTime: string;  // "09:00"
  readonly endTime: string;    // "12:00"
  readonly label: string;
  readonly taskRequirements: readonly TaskRequirementState[];
}

// ========== タスク必要人数クラス ==========

export class TaskRequirement {
  constructor(
    readonly state: TaskRequirementState,
    readonly timeSlotId: string
  ) {}

  get id(): string {
    return `${this.timeSlotId}_${this.state.taskId}`;
  }

  get taskId(): string {
    return this.state.taskId;
  }

  get requiredCount(): number {
    return this.state.requiredCount;
  }

  get minCount(): number {
    return this.state.minCount;
  }

  get maxCount(): number {
    return this.state.maxCount;
  }
}

// ========== 時間帯クラス ==========

export class TimeSlot {
  private readonly _requirements: readonly TaskRequirement[];

  constructor(readonly state: TimeSlotState) {
    this._requirements = state.taskRequirements.map(
      (req) => new TaskRequirement(req, state.id)
    );
  }

  get id(): string {
    return this.state.id;
  }

  get dayType(): DayType {
    return this.state.dayType;
  }

  get startTime(): string {
    return this.state.startTime;
  }

  get endTime(): string {
    return this.state.endTime;
  }

  get label(): string {
    return this.state.label;
  }

  /** この時間帯のタスク必要人数設定一覧 */
  get taskRequirements(): readonly TaskRequirement[] {
    return this._requirements;
  }

  /** 特定のタスクの必要人数を取得 */
  getRequirementForTask(taskId: string): TaskRequirement | undefined {
    return this._requirements.find((req) => req.taskId === taskId);
  }

  /** この時間帯と重複するかどうか */
  overlaps(other: TimeSlot): boolean {
    return this.state.id === other.state.id;
  }

  /** 時間帯の長さ（時間単位） */
  getDurationHours(): number {
    const [startH, startM] = this.state.startTime.split(':').map(Number);
    const [endH, endM] = this.state.endTime.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  }

  // TimeSlotはマスターデータのため、更新メソッドは提供しない
}
