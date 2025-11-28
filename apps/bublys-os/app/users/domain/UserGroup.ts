export type UserGroupState = {
  id: string;
  name: string;
  userIds: string[];
};

export class UserGroup {
  private readonly state: UserGroupState;

  constructor(id: string, name: string, userIds: string[] = []) {
    this.state = { id, name, userIds };
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get userIds(): string[] {
    return this.state.userIds;
  }

  addUser(userId: string): UserGroup {
    if (this.state.userIds.includes(userId)) {
      return this;
    }
    return new UserGroup(this.state.id, this.state.name, [...this.state.userIds, userId]);
  }

  rename(newName: string): UserGroup {
    return new UserGroup(this.state.id, newName, [...this.state.userIds]);
  }

  toJSON(): UserGroupState {
    return { ...this.state };
  }
}
