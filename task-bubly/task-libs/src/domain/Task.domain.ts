/**
 * **タスク** ── 題と説明と、いま何処まで来ているか（ステータス）を持つ。
 *
 * 更新は必ず新しいインスタンスを返す（`withUpdatedState`）。
 * 保存するときだけ `toJSON()` で plain にする ── 保存形はドメインの形を決めない。
 */
import { enumShape, objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

/** タスクのステータス */
export type TaskStatus_ステータス = 'todo' | 'doing' | 'done';

/** Redux/JSON用のシリアライズ型 */
export type TaskJSON = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus_ステータス;
  assigneeId?: string;  // 担当者のユーザーID
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Task_タスク {
  constructor(readonly state: TaskJSON) {}

  get id(): string { return this.state.id; }
  get title(): string { return this.state.title; }
  get description(): string { return this.state.description; }
  get status(): TaskStatus_ステータス { return this.state.status; }
  get assigneeId(): string | undefined { return this.state.assigneeId; }
  get createdAt(): string { return this.state.createdAt; }
  get updatedAt(): string { return this.state.updatedAt; }

  isDone(): boolean { return this.state.status === 'done'; }
  isInProgress(): boolean { return this.state.status === 'doing'; }

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

  /** 担当者を設定 */
  withAssignee(assigneeId: string | undefined): Task_タスク {
    return this.withUpdatedState({ assigneeId });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<TaskJSON>): Task_タスク {
    return new Task_タスク({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): TaskJSON { return { ...this.state }; }

  static fromJSON(json: TaskJSON): Task_タスク {
    return new Task_タスク(json);
  }

  static getStatusLabel(status: TaskStatus_ステータス): string {
    const labels: Record<TaskStatus_ステータス, string> = {
      todo: '未着手',
      doing: '進行中',
      done: '完了',
    };
    return labels[status];
  }

  static getStatusColor(status: TaskStatus_ステータス): string {
    const colors: Record<TaskStatus_ステータス, string> = {
      todo: '#666',
      doing: '#1976d2',
      done: '#2e7d32',
    };
    return colors[status];
  }
}


/**
 * **タスクの形**（`SchemaShape`）── 他のバブリが「この型の中身は何か」を引くための申告。
 *
 * ★ **担当者（`assigneeId`）を忘れない。** 申告を OS 側に手書きで置いていたころ、
 *   モデルに担当者を足しても申告は 6 項目のままだった ── 変換エディタからは
 *   **担当者だけ繋げない**状態が残っていた。形を state の隣に置いたのはこれが理由。
 * ★ 無くてもよい項目は `required: false`。ここは**モデルの `?` と同じ**にする。
 */
export const TASK_SHAPE: SchemaShape = objectShape([
  { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
  { name: 'title', shape: primitiveShape('string'), required: true, label: 'タイトル' },
  { name: 'description', shape: primitiveShape('string'), required: true, label: '説明' },
  {
    name: 'status',
    shape: enumShape(['todo', 'doing', 'done']),
    required: true,
    label: 'ステータス',
  },
  { name: 'assigneeId', shape: primitiveShape('string'), required: false, label: '担当者 ID' },
  { name: 'createdAt', shape: primitiveShape('string'), required: true, label: '作成日時' },
  { name: 'updatedAt', shape: primitiveShape('string'), required: true, label: '更新日時' },
]);
