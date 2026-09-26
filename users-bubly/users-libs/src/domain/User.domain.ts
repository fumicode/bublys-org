import { objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

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

/**
 * **ユーザーの形**（`SchemaShape`）── 他のバブリが「この型の中身は何か」を引くための申告。
 *
 * ★ **形は state の隣に置く。** 前は OS の `object-type-registration.ts` に手書きで
 *   並べていたので、モデルに項目を足しても申告だけが古いまま残った
 *   （実測：タスクの担当者が申告に無く、変換エディタから繋げなかった）。
 *   同じ画面に居れば、`UserState` を触ったときに必ず目に入る。
 */
export const USER_SHAPE: SchemaShape = objectShape([
  { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
  { name: 'name', shape: primitiveShape('string'), required: true, label: '名前' },
  { name: 'birthday', shape: primitiveShape('string'), required: true, label: '誕生日' },
]);
