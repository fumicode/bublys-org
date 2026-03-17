/**
 * タスクドメインモデル
 */

// ========== 型定義 ==========

/** タスクの状態 */
export interface TaskState {
  readonly id: string;
  readonly name: string;
  readonly task: string;                   // タスク内容
  readonly responsibleDepartment: string;  // 管轄局
  readonly description?: string;
}

// ========== ドメインクラス ==========

export class Task {
  constructor(readonly state: TaskState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get task(): string {
    return this.state.task;
  }

  get responsibleDepartment(): string {
    return this.state.responsibleDepartment;
  }

  get description(): string | undefined {
    return this.state.description;
  }

  // Taskはマスターデータのため、更新メソッドは提供しない
}
