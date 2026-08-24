/**
 * ソースオブジェクト → ドメインオブジェクト変換のマッピングルール
 *
 * ソース・ターゲットとも「path（dot-notation）」で指定する。
 * これにより、ネストしたオブジェクト同士のマッピングも表現できる。
 */

export type ValueTransform =
  | { type: "identity" }
  | { type: "toNumber" }
  | { type: "toBoolean"; trueValues: string[] }
  | { type: "dictionary"; map: Record<string, string> };

export type FieldMapping = {
  /** ソース側の path（dot-notation）。例: "name" / "address.city" */
  readonly sourcePath: string;
  /** ターゲット側の path（dot-notation） */
  readonly targetPath: string;
  readonly transform: ValueTransform;
};

export type MappingRuleState = {
  readonly id: string;
  readonly name: string;
  readonly targetSchemaId: string;
  readonly mappings: FieldMapping[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export class MappingRule {
  constructor(readonly state: MappingRuleState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get targetSchemaId(): string {
    return this.state.targetSchemaId;
  }

  get mappings(): FieldMapping[] {
    return this.state.mappings;
  }

  addMapping(mapping: FieldMapping): MappingRule {
    const filtered = this.state.mappings.filter(
      (m) => m.targetPath !== mapping.targetPath
    );
    return new MappingRule({
      ...this.state,
      mappings: [...filtered, mapping],
      updatedAt: new Date().toISOString(),
    });
  }

  removeMapping(targetPath: string): MappingRule {
    return new MappingRule({
      ...this.state,
      mappings: this.state.mappings.filter((m) => m.targetPath !== targetPath),
      updatedAt: new Date().toISOString(),
    });
  }

  getMappingForTarget(targetPath: string): FieldMapping | undefined {
    return this.state.mappings.find((m) => m.targetPath === targetPath);
  }

  getMappingForSource(sourcePath: string): FieldMapping | undefined {
    return this.state.mappings.find((m) => m.sourcePath === sourcePath);
  }

  get mappedSourcePaths(): string[] {
    return this.state.mappings.map((m) => m.sourcePath);
  }

  get mappedTargetPaths(): string[] {
    return this.state.mappings.map((m) => m.targetPath);
  }

  toJSON(): MappingRuleState {
    return this.state;
  }

  static fromJSON(json: MappingRuleState): MappingRule {
    return new MappingRule(json);
  }

  static create(
    name: string,
    targetSchemaId: string,
    mappings: FieldMapping[] = []
  ): MappingRule {
    const now = new Date().toISOString();
    return new MappingRule({
      id: globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}`,
      name,
      targetSchemaId,
      mappings,
      createdAt: now,
      updatedAt: now,
    });
  }
}
