export type UserState = {
  id: string;
  name: string;
  birthday: string;
};

export class User {
  private readonly state: UserState;

  constructor(id: string, name: string, birthday: string) {
    this.state = { id, name, birthday };
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get birthday(): string {
    return this.state.birthday;
  }

  get birthDate(): Date {
    return new Date(this.state.birthday);
  }

  getAge(referenceDate: Date = new Date()): number {
    const birth = this.birthDate;
    let age = referenceDate.getFullYear() - birth.getFullYear();

    const hasNotHadBirthdayThisYear =
      referenceDate.getMonth() < birth.getMonth() ||
      (referenceDate.getMonth() === birth.getMonth() &&
        referenceDate.getDate() < birth.getDate());

    if (hasNotHadBirthdayThisYear) {
      age -= 1;
    }

    return age;
  }

  toJSON() {
    return {
      id: this.state.id,
      name: this.state.name,
      birthday: this.state.birthday,
    };
  }
}
