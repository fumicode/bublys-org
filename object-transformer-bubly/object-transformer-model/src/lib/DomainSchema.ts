/**
 * 変換先ドメインオブジェクトのスキーマ定義（再帰型）
 *
 * ルートは通常 object。ネストしたオブジェクトも再帰的に表現される。
 * SchemaShape は domain-registry の共通型（バブリ横断で共有される言語）を使う。
 */

import {
  getFieldAtPath,
  walkLeafFields,
  type SchemaField,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";

export type DomainSchemaState = {
  readonly id: string;
  readonly name: string;
  readonly root: SchemaShape;
};

export class DomainSchema {
  constructor(readonly state: DomainSchemaState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get root(): SchemaShape {
    return this.state.root;
  }

  /** ルートが object の場合の直下フィールド。そうでなければ空配列 */
  get rootFields(): readonly SchemaField[] {
    return this.state.root.kind === "object" ? this.state.root.fields : [];
  }

  /**
   * ネストを平坦化した「リーフ（プリミティブ・enum・配列）」の path 一覧。
   * マッピング可能な項目 = リーフ、という前提で使う。
   */
  get leafFields(): { readonly path: readonly string[]; readonly field: SchemaField }[] {
    return walkLeafFields(this.state.root);
  }

  /** path に対応するフィールドを引く */
  getFieldAt(path: readonly string[]): SchemaField | undefined {
    return getFieldAtPath(this.state.root, path);
  }

  toJSON(): DomainSchemaState {
    return this.state;
  }

  static fromJSON(json: DomainSchemaState): DomainSchema {
    return new DomainSchema(json);
  }

  /** shape + 名前から DomainSchema を組み立てるショートカット */
  static of(id: string, name: string, root: SchemaShape): DomainSchema {
    return new DomainSchema({ id, name, root });
  }
}
