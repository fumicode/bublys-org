/**
 * タスク管理ドメインモデル
 */

// ========== 型定義 ==========

/** タスクのステータス */
export type TaskStatus_ステータス = 'todo' | 'doing' | 'done';

/** タスクの状態 */
export interface TaskState {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus_ステータス;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type TaskJSON = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus_ステータス;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Task_タスク {
  constructor(readonly state: TaskState) {}

  get id(): string {
    return this.state.id;
  }

  get title(): string {
    return this.state.title;
  }

  get description(): string {
    return this.state.description;
  }

  get status(): TaskStatus_ステータス {
    return this.state.status;
  }

  get createdAt(): string {
    return this.state.createdAt;
  }

  get updatedAt(): string {
    return this.state.updatedAt;
  }

  /** 完了しているかどうか */
  isDone(): boolean {
    return this.state.status === 'done';
  }

  /** 進行中かどうか */
  isInProgress(): boolean {
    return this.state.status === 'doing';
  }

  // ========== 状態変更メソッド ==========

  /** 作業を開始する */
  start(): Task_タスク {
    return this.withUpdatedState({ status: 'doing' });
  }

  /** 完了する */
  complete(): Task_タスク {
    return this.withUpdatedState({ status: 'done' });
  }

  /** 未完了に戻す */
  reopen(): Task_タスク {
    return this.withUpdatedState({ status: 'todo' });
  }

  /** タイトルを更新 */
  withTitle(title: string): Task_タスク {
    return this.withUpdatedState({ title });
  }

  /** 説明を更新 */
  withDescription(description: string): Task_タスク {
    return this.withUpdatedState({ description });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<TaskState>): Task_タスク {
    return new Task_タスク({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  /** Redux/JSON用にシリアライズ */
  toJSON(): TaskJSON {
    return {
      id: this.state.id,
      title: this.state.title,
      description: this.state.description,
      status: this.state.status,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  /** JSONからドメインオブジェクトを復元 */
  static fromJSON(json: TaskJSON): Task_タスク {
    return new Task_タスク(json);
  }

  // ========== 静的メソッド ==========

  /** ステータスの日本語ラベルを取得 */
  static getStatusLabel(status: TaskStatus_ステータス): string {
    const labels: Record<TaskStatus_ステータス, string> = {
      todo: '未着手',
      doing: '進行中',
      done: '完了',
    };
    return labels[status];
  }

  /** ステータスの色を取得 */
  static getStatusColor(status: TaskStatus_ステータス): string {
    const colors: Record<TaskStatus_ステータス, string> = {
      todo: '#666',
      doing: '#1976d2',
      done: '#2e7d32',
    };
    return colors[status];
  }

  /** 新しいタスクを作成 */
  static create(
    data: Pick<TaskState, 'title'> & Partial<Pick<TaskState, 'description'>>
  ): Task_タスク {
    const now = new Date().toISOString();
    return new Task_タスク({
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description ?? '',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    });
  }
}
