/**
 * UserTaskShells
 * 関連を持つShellの例：UserShellとTaskShell
 *
 * この例では、以下の関連を実装：
 * - UserShell.ownedTasks: TaskShell[]  // ユーザーが所有するタスク
 * - UserShell.friends: UserShell[]     // 友達関係（循環参照の例）
 * - TaskShell.owner: UserShell | undefined  // タスクの所有者
 * - TaskShell.assignees: UserShell[]   // タスクの担当者
 */

import { BaseShell } from '../domain/BaseShell';
import { DomainEntity } from '../domain/ObjectShell';

// ============================================
// ドメインオブジェクト（例示用）
// ============================================

/**
 * User ドメインオブジェクト
 */
export class User implements DomainEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string
  ) {}

  updateName(newName: string): User {
    return new User(this.id, newName, this.email);
  }

  updateEmail(newEmail: string): User {
    return new User(this.id, this.name, newEmail);
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
    };
  }

  static fromJson(data: any): User {
    return new User(data.id, data.name, data.email);
  }
}

/**
 * Task ドメインオブジェクト
 */
export class Task implements DomainEntity {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly completed: boolean = false
  ) {}

  complete(): Task {
    return new Task(this.id, this.title, true);
  }

  uncomplete(): Task {
    return new Task(this.id, this.title, false);
  }

  updateTitle(newTitle: string): Task {
    return new Task(this.id, newTitle, this.completed);
  }

  toJson() {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
    };
  }

  static fromJson(data: any): Task {
    return new Task(data.id, data.title, data.completed);
  }
}

// ============================================
// Shell実装
// ============================================

/**
 * User専用Shell（関連を持つ例）
 *
 * 関連：
 * - ownedTasks: このユーザーが所有するタスク
 * - friends: 友達関係（循環参照の例）
 */
export class UserShell extends BaseShell<User> {
  // メモリ上の直接参照
  ownedTasks: TaskShell[] = [];
  friends: UserShell[] = [];

  /**
   * 関連IDを取得（シリアライズ用）
   */
  protected getRelationIds(): Record<string, string[]> {
    return {
      ownedTasks: this.ownedTasks.map(t => t.id),
      friends: this.friends.map(f => f.id),
    };
  }

  /**
   * 関連を復元（デシリアライズ用）
   */
  restoreRelations(
    shellMap: Map<string, BaseShell<any>>,
    relationIds: Record<string, string[]>
  ): void {
    // ownedTasksを復元
    this.ownedTasks = (relationIds.ownedTasks || [])
      .map(id => shellMap.get(id))
      .filter((s): s is TaskShell => s instanceof TaskShell);

    // friendsを復元
    this.friends = (relationIds.friends || [])
      .map(id => shellMap.get(id))
      .filter((s): s is UserShell => s instanceof UserShell);
  }

  /**
   * タスクをリンク
   */
  linkTask(task: TaskShell): void {
    if (!this.ownedTasks.includes(task)) {
      this.ownedTasks.push(task);
      // 逆方向の関連も設定
      task.owner = this;
    }
  }

  /**
   * タスクのリンクを解除
   */
  unlinkTask(taskId: string): void {
    const index = this.ownedTasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      const task = this.ownedTasks[index];
      this.ownedTasks.splice(index, 1);
      // 逆方向の関連も解除
      if (task.owner === this) {
        task.owner = undefined;
      }
    }
  }

  /**
   * 友達をリンク
   */
  linkFriend(friend: UserShell): void {
    if (!this.friends.includes(friend)) {
      this.friends.push(friend);
      // 双方向の関連を設定
      if (!friend.friends.includes(this)) {
        friend.friends.push(this);
      }
    }
  }

  /**
   * 友達のリンクを解除
   */
  unlinkFriend(friendId: string): void {
    const index = this.friends.findIndex(f => f.id === friendId);
    if (index >= 0) {
      const friend = this.friends[index];
      this.friends.splice(index, 1);
      // 双方向の関連を解除
      const reverseIndex = friend.friends.findIndex(f => f.id === this.id);
      if (reverseIndex >= 0) {
        friend.friends.splice(reverseIndex, 1);
      }
    }
  }
}

/**
 * Task専用Shell（関連を持つ例）
 *
 * 関連：
 * - owner: タスクの所有者
 * - assignees: タスクの担当者
 */
export class TaskShell extends BaseShell<Task> {
  // メモリ上の直接参照
  owner?: UserShell;
  assignees: UserShell[] = [];

  /**
   * 関連IDを取得（シリアライズ用）
   */
  protected getRelationIds(): Record<string, string[]> {
    return {
      owner: this.owner ? [this.owner.id] : [],
      assignees: this.assignees.map(a => a.id),
    };
  }

  /**
   * 関連を復元（デシリアライズ用）
   */
  restoreRelations(
    shellMap: Map<string, BaseShell<any>>,
    relationIds: Record<string, string[]>
  ): void {
    // ownerを復元
    if (relationIds.owner && relationIds.owner.length > 0) {
      const ownerShell = shellMap.get(relationIds.owner[0]);
      if (ownerShell instanceof UserShell) {
        this.owner = ownerShell;
      }
    }

    // assigneesを復元
    this.assignees = (relationIds.assignees || [])
      .map(id => shellMap.get(id))
      .filter((s): s is UserShell => s instanceof UserShell);
  }

  /**
   * 担当者をリンク
   */
  linkAssignee(user: UserShell): void {
    if (!this.assignees.includes(user)) {
      this.assignees.push(user);
    }
  }

  /**
   * 担当者のリンクを解除
   */
  unlinkAssignee(userId: string): void {
    const index = this.assignees.findIndex(a => a.id === userId);
    if (index >= 0) {
      this.assignees.splice(index, 1);
    }
  }
}
