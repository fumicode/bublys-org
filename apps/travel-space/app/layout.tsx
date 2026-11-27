/**
 * ★ **ここはサーバ側のまま。**（`"use client"` を付けない）
 *   App Router では `metadata` を出せるのはサーバの部品だけ。client にすると
 *   `<title>` が空のまま配られる（OS で踏んだ）。
 */
// modern-normalize は global.css が段（reset）に入れて読む
import './global.css';
import type { Metadata, Viewport } from 'next';
import { StyledComponentsRegistry } from './registry';
import StoreProvider from './StoreProvider';

export const metadata: Metadata = {
  title: '旅の空間',
  description:
    '旅程・地図・アクティビティを泡として同じ画面に並べ、掴んで渡してつなげる。操作の履歴は世界線として巻き戻せる。',
};

/**
 * **スマホでは、画面の幅そのままで描く。**（OS の layout と同じ理由）
 * ブラウザの拡大は切る ── 寄るための手はこの空間が自分で持っている（指 2 本）ので、
 * ブラウザの拡大が上に乗るとどちらが動いたのか分からなくなる。
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
