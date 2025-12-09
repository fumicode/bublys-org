/**
 * ポケットに保存されるアイテム
 * bubble typeと同じ形式を使用
 */
export type PocketItemType = 'user' | 'users' | 'user-group' | 'user-groups' | 'memo' | 'memos' | 'generic';

export type PocketItemState = {
  id: string;
  url: string;
  type: PocketItemType;
  label?: string;
  icon?: string;
  addedAt: number;
};

export class PocketItem {
  constructor(readonly state: PocketItemState) {}

  static create(url: string, type: PocketItemType = 'generic', label?: string): PocketItem {
    return new PocketItem({
      id: crypto.randomUUID(),
      url,
      type,
      label,
      addedAt: Date.now(),
    });
  }

  updateLabel(newLabel: string): PocketItem {
    return new PocketItem({
      ...this.state,
      label: newLabel,
    });
  }

  get id(): string {
    return this.state.id;
  }

  get url(): string {
    return this.state.url;
  }

  get type(): PocketItemType {
    return this.state.type;
  }

  get label(): string | undefined {
    return this.state.label;
  }

  get addedAt(): number {
    return this.state.addedAt;
  }
}
