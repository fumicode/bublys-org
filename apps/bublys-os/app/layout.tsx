/**
 * ★ **ここはサーバ側のまま。**（`"use client"` を付けない）
 *
 *   App Router では `metadata` を出せるのはサーバの部品だけ。前は layout ごと
 *   client にしていたので `<title>` が**空**のまま配られていた
 *   （実測：`os.bublys.ooo` の `<title>` が空・検索結果でもタブでも名前が出ない）。
 *   中の `StoreProvider` と `StyledComponentsRegistry` はどちらも client の部品なので、
 *   サーバの layout から呼んでそのまま動く。
 */
import 'modern-normalize';
import './global.css';
import type { Metadata } from 'next';
import { StyledComponentsRegistry } from './registry';
import StoreProvider from './StoreProvider';

export const metadata: Metadata = {
  title: 'bublys OS',
  description:
    'アプリを「泡（バブリ）」として同じ画面に並べ、つなげて使うデスクトップ。操作の履歴は世界線として分岐・比較・巻き戻しができる。',
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
