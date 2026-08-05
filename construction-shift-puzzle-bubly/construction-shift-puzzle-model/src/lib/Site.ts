/**
 * Site — 現場
 *
 * 建設会社が社員・機械を配置する対象。ドメインクラスは不変。
 * position は地図上の座標（km 相当）。現場間の距離計算に使う（省略可）。
 */

export type SitePosition = { x: number; y: number };

export type SiteState = {
  id: string;
  name: string;
  /** 地図上の座標（km 相当）。距離計算に使う。未設定は原点扱い。 */
  position?: SitePosition;
};

export class Site {
  constructor(readonly state: SiteState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 地図上の座標（未設定は原点） */
  get position(): SitePosition {
    return this.state.position ?? { x: 0, y: 0 };
  }

  /** 名前を変更した新しい Site を返す */
  rename(name: string): Site {
    return new Site({ ...this.state, name });
  }

  /** 座標を変更した新しい Site を返す */
  moveTo(position: SitePosition): Site {
    return new Site({ ...this.state, position });
  }

  /** 別の現場までの直線距離（座標系の単位＝km 相当） */
  distanceTo(other: Site): number {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
