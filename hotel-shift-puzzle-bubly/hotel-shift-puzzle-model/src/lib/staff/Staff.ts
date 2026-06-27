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
   * 早番責任者（早責）かどうか。
   * 「早番には早番責任者が各稼働日に最低1人いる」責任者要件で参照する。
   */
  isEarlyShiftLeader?: boolean;
  /**
   * 夜番責任者（夜責）かどうか。
   * 「夜番（運用上は遅番）には夜番責任者が各稼働日に最低1人いる」責任者要件で参照する。
   */
  isNightShiftLeader?: boolean;
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

  /** 早番責任者（早責）かどうか */
  get isEarlyShiftLeader(): boolean {
    return this.state.isEarlyShiftLeader ?? false;
  }

  /** 夜番責任者（夜責）かどうか */
  get isNightShiftLeader(): boolean {
    return this.state.isNightShiftLeader ?? false;
  }

  /** 名前を変更した新しい Staff を返す */
  rename(name: string): Staff {
    return new Staff({ ...this.state, name });
  }

  /** 部署を変更した新しい Staff を返す */
  changeDepartment(department: string): Staff {
    return new Staff({ ...this.state, department });
  }

  /** 早番責任者（早責）フラグを変更した新しい Staff を返す */
  withEarlyShiftLeader(value: boolean): Staff {
    return new Staff({ ...this.state, isEarlyShiftLeader: value });
  }

  /** 夜番責任者（夜責）フラグを変更した新しい Staff を返す */
  withNightShiftLeader(value: boolean): Staff {
    return new Staff({ ...this.state, isNightShiftLeader: value });
  }
}
