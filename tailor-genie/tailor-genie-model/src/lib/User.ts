/**
 * ユーザードメインオブジェクト
 */
export type UserState = {
  readonly id: string;
  readonly name: string;
};

export class User {
  constructor(readonly state: UserState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  rename(name: string): User {
    return new User({ ...this.state, name });
  }
}
