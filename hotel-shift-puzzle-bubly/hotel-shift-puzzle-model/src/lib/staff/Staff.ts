/**
 * Staff — スタッフ（従業員）ドメインモデル
 *
 * いったん id と名前だけを持つ最小モデル。
 * ドメインクラスは不変。更新メソッドは新しいインスタンスを返す。
 */

export type StaffState = {
  id: string;
  name: string;
};

export class Staff {
  constructor(readonly state: StaffState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 名前を変更した新しい Staff を返す */
  rename(name: string): Staff {
    return new Staff({ ...this.state, name });
  }
}
