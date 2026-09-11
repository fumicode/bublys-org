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

  /** 名前を変更した新しい Staff を返す。変わらなければ自分自身。 */
  rename(name: string): Staff {
    if (name === this.state.name) return this;
    return new Staff({ ...this.state, name });
  }

  /** 部署を変更した新しい Staff を返す。変わらなければ自分自身。 */
  changeDepartment(department: string): Staff {
    if (department === this.department) return this;
    return new Staff({ ...this.state, department });
  }
}
