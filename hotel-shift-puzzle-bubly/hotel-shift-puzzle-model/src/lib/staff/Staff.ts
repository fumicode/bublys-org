/**
 * Staff — スタッフ（従業員）ドメインモデル
 *
 * ドメインクラスは不変。更新メソッドは新しいインスタンスを返す。
 * department は省略可能（既存データとの互換性を保つため）。
 */

export type StaffState = {
  id: string;
  name: string;
  /** 所属部署。未設定のスタッフは空文字列として扱う */
  department?: string;
  /**
   * このスタッフが持つ責任者ロールのキー（例: "early"＝早責 / "night"＝夜責）。
   * 役割ごとに boolean を生やさず、汎用のキー集合で持つ（責任者ルールは ShiftLeaderRule に
   * 一元化されており、どのロールも同じコードで扱う）。ロールを増やしてもこの形のまま。
   */
  leaderRoleKeys?: string[];
};

export class Staff {
  constructor(readonly state: StaffState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 所属部署。未設定のスタッフは空文字列 */
  get department(): string {
    return this.state.department ?? "";
  }

  /** このスタッフが持つ責任者ロールのキー一覧 */
  get leaderRoleKeys(): string[] {
    return this.state.leaderRoleKeys ?? [];
  }

  /** このスタッフが指定の責任者ロール（roleKey）を持つか */
  isLeaderOf(roleKey: string): boolean {
    return this.leaderRoleKeys.includes(roleKey);
  }

  /** 名前を変更した新しい Staff を返す */
  rename(name: string): Staff {
    return new Staff({ ...this.state, name });
  }

  /** 部署を変更した新しい Staff を返す */
  changeDepartment(department: string): Staff {
    return new Staff({ ...this.state, department });
  }

  /** 責任者ロールのキー一覧を差し替えた新しい Staff を返す */
  withLeaderRoleKeys(keys: string[]): Staff {
    return new Staff({ ...this.state, leaderRoleKeys: keys });
  }
}
