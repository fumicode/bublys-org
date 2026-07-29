/**
 * Employee — 社員
 *
 * 現場に配置されるリソースの1種。ドメインクラスは不変。
 * role（職種・役割）は省略可能。
 */

export type EmployeeState = {
  id: string;
  name: string;
  /** 職種・役割（例: 職長、オペレーター）。未設定は空文字列として扱う */
  role?: string;
};

export class Employee {
  constructor(readonly state: EmployeeState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 職種・役割。未設定は空文字列 */
  get role(): string {
    return this.state.role ?? "";
  }

  rename(name: string): Employee {
    return new Employee({ ...this.state, name });
  }

  changeRole(role: string): Employee {
    return new Employee({ ...this.state, role });
  }
}
