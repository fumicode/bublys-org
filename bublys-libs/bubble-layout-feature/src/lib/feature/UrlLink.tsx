/**
 * **この泡の url** ── 帯の右端の鎖。
 *
 * > 帯には「何の型か」を出す。「どこに居るか（url）」は、鎖に訊けば出る。
 *
 * ★ 乗せると url のパスが吹き出しで出る。押すとそのパスをコピーする。
 * ★ 帯は泡を掴む所なので、押しても掴み始めない（`pointerdown` を止める。閉じると同じ）。
 * ★ 吹き出しは CSS だけで出す（`data-url` を `::after` で読む）── 乗せるたびに
 *   描き直さない。コピーした合図だけは、しばらく出すので状態に持つ。
 */
import { useCallback, useEffect, useRef, useState, type FC } from 'react';

/** コピーした合図を出しておく長さ（ms） */
const COPIED_MS = 1400;

/** 鎖（14×14。色は currentColor ── × やロックと同じ扱い） */
const LinkIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <path d="M6 8a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.8.8" />
    <path d="M8 6a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.8-.8" />
  </svg>
);

/**
 * 字をコピーする。
 * ★ `navigator.clipboard` は安全な場所（https / localhost）でしか使えないので、
 *   使えなければ昔のやり方（見えない欄に入れて選んで copy）に落とす。
 */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
};

export const UrlLink: FC<{ readonly url: string }> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClick = useCallback(async () => {
    if (!(await copyText(url))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [url]);

  return (
    <button
      type="button"
      className="bl-link"
      aria-label={`url をコピー: ${url}`}
      data-url={copied ? 'コピーしました' : url}
      data-copied={copied ? 'true' : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <LinkIcon />
    </button>
  );
};
