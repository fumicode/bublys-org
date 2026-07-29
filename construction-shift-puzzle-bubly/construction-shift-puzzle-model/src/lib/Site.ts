/**
 * Site — 現場
 *
 * 建設会社が社員・機械を配置する対象。ドメインクラスは不変。
 */

export type SiteState = {
  id: string;
  name: string;
};

export class Site {
  constructor(readonly state: SiteState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 名前を変更した新しい Site を返す */
  rename(name: string): Site {
    return new Site({ ...this.state, name });
  }
}
