/**
 * Worldに乗せられるバブリ（bubly）の基底インターフェース
 * Counter、Timer、その他のバブリはこのインターフェースを実装する
 */
export interface BaseBubly {
  /** バブリのタイプ（'counter', 'timer', など） */
  readonly type: string;
  
  /** バブリの識別子 */
  readonly id: string;
  
  /** JSON形式に変換 */
  toJson(): any;
}

/**
 * バブリのファクトリー関数の型
 */
export type BublyFactory = (data: any) => BaseBubly;

/**
 * バブリのレジストリー
 */
export class BublyRegistry {
  private static factories = new Map<string, BublyFactory>();
  
  /**
   * バブリタイプを登録
   */
  static register(type: string, factory: BublyFactory): void {
    this.factories.set(type, factory);
  }
  
  /**
   * JSONからバブリを復元
   */
  static fromJson(json: any): BaseBubly {
    const factory = this.factories.get(json.type);
    if (!factory) {
      throw new Error(`Unknown bubly type: ${json.type}`);
    }
    return factory(json);
  }
}

