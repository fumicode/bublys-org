/**
 * **最初の画面** ── JS が届くまでのあいだ、ここが出ている。
 *
 * ★ **サーバでも描ける形にしておく。** 何も返さないと、サーバが配る HTML に文字が
 *   1 つも無く、JS を落として走らせ終わるまで完全な白画面になる（OS で踏んだ）。
 * ★ 作りは**素の要素とインラインの見た目**だけ ── 読み込みの順番に依存するものを持ち込まない。
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
        background: 'radial-gradient(120% 120% at 50% 0%, #14324a 0%, #0b1a28 60%, #070d16 100%)',
        color: '#e6ebf5',
        font: '400 16px/1.7 -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif',
        letterSpacing: '0.02em',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ font: '600 26px/1.3 inherit', letterSpacing: '0.04em' }}>旅の空間</div>
      <div style={{ opacity: 0.78, maxWidth: 30 * 16 }}>旅程・地図・アクティビティを並べて組み立てる</div>
      <div style={{ opacity: 0.45, fontSize: 13 }}>読み込んでいます…</div>
    </div>
  );
}

export default BootScreen;
