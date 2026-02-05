import { BubbleRoute } from "./BubbleRouting.js";
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
   * ルートを登録
   */
  registerRoutes(routes: BubbleRoute[]): void {
    this.routes.push(...routes);
    this.ensureResolverRegistered();
    this.notifyListeners();
    console.log(`[BubbleRouteRegistry] Registered ${routes.length} routes. Total: ${this.routes.length}`);
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
        bubbleOptions: route.bubbleOptions,
      };
    });
  }

  /**
   * 登録されているすべてのルートを取得
   */
  getRoutes(): BubbleRoute[] {
    return [...this.routes];
  }

  /**
   * URLに一致するルートを検索
   */
  matchRoute(url: string): BubbleRoute | undefined {
    return this.routes.find((route) => route.pattern.test(url));
  }

  /**
   * 変更リスナーを登録
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

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
    this.notifyListeners();
  }
}

// シングルトンインスタンス
export const BubbleRouteRegistry = new BubbleRouteRegistryClass();
