/**
 * PlaneObject → ドメインオブジェクト変換のマッピングルール
 */

export type ValueTransform =
  | { type: "identity" }
  | { type: "toNumber" }
  | { type: "toBoolean"; trueValues: string[] }
  | { type: "dictionary"; map: Record<string, string> };

export type FieldMapping = {
  readonly sourceKey: string;
  readonly targetProperty: string;
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
    // 同じtargetPropertyが既にあれば上書き
    const filtered = this.state.mappings.filter(
      (m) => m.targetProperty !== mapping.targetProperty
    );
    return new MappingRule({
      ...this.state,
      mappings: [...filtered, mapping],
      updatedAt: new Date().toISOString(),
    });
  }

  removeMapping(targetProperty: string): MappingRule {
    return new MappingRule({
      ...this.state,
      mappings: this.state.mappings.filter(
        (m) => m.targetProperty !== targetProperty
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  getMappingForTarget(targetProperty: string): FieldMapping | undefined {
    return this.state.mappings.find(
      (m) => m.targetProperty === targetProperty
    );
  }

  getMappingForSource(sourceKey: string): FieldMapping | undefined {
    return this.state.mappings.find((m) => m.sourceKey === sourceKey);
  }

  /** マッピング済みのソースキー一覧 */
  get mappedSourceKeys(): string[] {
    return this.state.mappings.map((m) => m.sourceKey);
  }

  /** マッピング済みのターゲットプロパティ一覧 */
  get mappedTargetProperties(): string[] {
    return this.state.mappings.map((m) => m.targetProperty);
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
      id: crypto.randomUUID(),
      name,
      targetSchemaId,
      mappings,
      createdAt: now,
      updatedAt: now,
    });
  }
}
