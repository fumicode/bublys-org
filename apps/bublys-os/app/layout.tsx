/**
 * ★ **ここはサーバ側のまま。**（`"use client"` を付けない）
 *
 *   App Router では `metadata` を出せるのはサーバの部品だけ。前は layout ごと
 *   client にしていたので `<title>` が**空**のまま配られていた
 *   （実測：`os.bublys.ooo` の `<title>` が空・検索結果でもタブでも名前が出ない）。
 *   中の `StoreProvider` と `StyledComponentsRegistry` はどちらも client の部品なので、
 *   サーバの layout から呼んでそのまま動く。
 */
// modern-normalize は global.css が段（reset）に入れて読む
import './global.css';
import type { Metadata, Viewport } from 'next';
import { StyledComponentsRegistry } from './registry';
import StoreProvider from './StoreProvider';

export const metadata: Metadata = {
  title: 'bublys OS',
  description:
    'アプリを「泡（バブリ）」として同じ画面に並べ、つなげて使うデスクトップ。操作の履歴は世界線として分岐・比較・巻き戻しができる。',
};

/**
 * **スマホでは、画面の幅そのままで描く。**
 *
 * これが無いと、ブラウザは幅 980px の紙に描いてから縮めて見せる ── 泡も字も
 * 岸に貼った口も 0.38 倍になって、**触る以前に読めない**（実測：iPhone の幅 375px）。
 *
 * ★ **ブラウザの拡大は切る**（`maximumScale: 1`）。この画面は 100vh に貼り付いた1枚の場で、
 *   寄るための手を**自分で持っている** ── 指 2 本を開く・閉じるで「画面2の寄り」
 *   （`useBubbleInput` の `PinchState`）。ブラウザの拡大が上に乗ると、
 *   同じ手が 2 つのものを動かして、どちらが動いたのか分からなくなる。
 * ★ Next 16 では `metadata.viewport` は非推奨で、この `viewport` を出す
 *   （`node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts` の註）。
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <StoreProvider>
          <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
