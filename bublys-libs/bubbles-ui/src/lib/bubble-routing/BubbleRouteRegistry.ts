import { BubbleRoute, matchesPattern, extractParams } from "./BubbleRouting.js";
import { registerBubblePropsResolver } from "../Bubble.domain.js";

/**
 * 動的バブルルートレジストリ
 * プラグインから動的にルートを登録できる
 */
class BubbleRouteRegistryClass {
  private routes: BubbleRoute[] = [];
  private listeners: Set<() => void> = new Set();
  private resolverRegistered = false;
  /**
   * **外に見せる一覧の写し。** 増減したときだけ作り直す。
   *
   * ★ 毎回新しい配列を返すと、これを見て描く側（`useBubbleRoutes` →
   *   `useSyncExternalStore`）が**いつも「変わった」と思って描き直し続ける**。
   *   変わっていない間は同じ配列を返すことが、外部ストアとしての約束。
   */
  private snapshot: readonly BubbleRoute[] = [];

  /**
   * ルートを登録
   */
  registerRoutes(routes: BubbleRoute[]): void {
    this.routes.push(...routes);
    this.snapshot = [...this.routes];
    this.ensureResolverRegistered();
    this.notifyListeners();
    console.log(`[BubbleRouteRegistry] Registered ${routes.length} routes. Total: ${this.routes.length}`);
  }

  /**
   * 登録済みのルートを取り消す。
   *
   * `registerRoutes` に渡したのと同じルートオブジェクトを渡すこと
   * （同一性で消すので、同じ内容の別オブジェクトでは消えない）。
   * バブリを OS から外すときに、そのバブリが登録したルートだけを剥がすために使う。
   */
  unregisterRoutes(routes: BubbleRoute[]): void {
    if (routes.length === 0) return;
    const removing = new Set(routes);
    const before = this.routes.length;
    this.routes = this.routes.filter((route) => !removing.has(route));
    this.snapshot = [...this.routes];
    this.notifyListeners();
    console.log(
      `[BubbleRouteRegistry] Unregistered ${before - this.routes.length} routes. Total: ${this.routes.length}`,
    );
  }

  /**
   * BubblePropsResolver を登録（一度だけ）
   */
  private ensureResolverRegistered(): void {
    if (this.resolverRegistered) return;
    this.resolverRegistered = true;

    registerBubblePropsResolver((url: string) => {
      const route = this.matchRoute(url);
      if (!route) return undefined;
      return {
        type: route.type,
        params: extractParams(url, route.pattern),
        bubbleOptions: route.bubbleOptions,
      };
    });
  }

  /**
   * 登録されているすべてのルートを取得。
   * 増減していない間は**同じ配列**が返る（{@link snapshot} の註）。
   */
  getRoutes = (): readonly BubbleRoute[] => this.snapshot;

  /**
   * URLに一致するルートを検索
   */
  matchRoute(url: string): BubbleRoute | undefined {
    return this.routes.find((route) => matchesPattern(url, route.pattern));
  }

  /**
   * 変更リスナーを登録
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * リスナーに変更を通知
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * レジストリをクリア（テスト用）
   */
  clear(): void {
    this.routes = [];
    this.snapshot = [];
    this.notifyListeners();
  }
}

// シングルトンインスタンス
export const BubbleRouteRegistry = new BubbleRouteRegistryClass();
