/**
 * 変換先ドメインオブジェクトのスキーマ定義
 */

export type PropertyType = "string" | "number" | "boolean" | "enum";

export type SchemaProperty = {
  readonly name: string;
  readonly type: PropertyType;
  readonly required: boolean;
  readonly enumValues?: string[];
  readonly label?: string;
};

export type DomainSchemaState = {
  readonly id: string;
  readonly name: string;
  readonly properties: SchemaProperty[];
};

export class DomainSchema {
  constructor(readonly state: DomainSchemaState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get properties(): SchemaProperty[] {
    return this.state.properties;
  }

  getProperty(name: string): SchemaProperty | undefined {
    return this.state.properties.find((p) => p.name === name);
  }

  get requiredProperties(): SchemaProperty[] {
    return this.state.properties.filter((p) => p.required);
  }

  toJSON(): DomainSchemaState {
    return this.state;
  }

  static fromJSON(json: DomainSchemaState): DomainSchema {
    return new DomainSchema(json);
  }
}
