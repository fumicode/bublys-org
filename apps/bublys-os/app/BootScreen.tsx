/**
 * **最初の画面** ── JS が届くまでのあいだ、ここが出ている。
 *
 * ★ **サーバでも描ける形にしておく。** 前は `PersistGate` の `loading` が `null`、
 *   バブリの復元待ちも `null` だったので、**サーバが配る HTML に文字が 1 つも無かった**
 *   ── JS を落として走らせ終わるまで、画面は完全な白。何のページかも分からない。
 *   ここを渡しておけば、HTML が届いた時点で名前と一行が出る（検索の見え方も同じ理由で直る）。
 * ★ 作りは**素の要素とインラインの見た目**だけ。CSS-in-JS も画像も待たずに出したいので、
 *   読み込みの順番に依存するものを持ち込まない。
 */
export function BootScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: 'radial-gradient(120% 120% at 50% 0%, #16204a 0%, #0b1020 60%, #070a16 100%)',
        color: '#e6ebf5',
        font: '400 16px/1.7 -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif',
        letterSpacing: '0.02em',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ font: '600 26px/1.3 inherit', letterSpacing: '0.04em' }}>bublys OS</div>
      <div style={{ opacity: 0.78, maxWidth: 30 * 16 }}>泡で並べるデスクトップ</div>
      <div style={{ opacity: 0.45, fontSize: 13 }}>読み込んでいます…</div>
    </div>
  );
}

export default BootScreen;
