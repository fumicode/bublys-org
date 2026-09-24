'use client';
/**
 * 対局の名前 ── **押すと、その場で書き換えられる見出し**。
 *
 * ★ 名前を決める場所は**対局の画面**に置く。札（一覧の中の泡）はダブルクリックで
 *   開く口なので、そこを入力にすると**開けなくなる**。
 * ★ 押したことは層へ流さない（`bl-close` と同じ）── 流すと枠が「泡を掴んだ」と読んで、
 *   書こうとしただけで泡が動きだす。
 */
import { useEffect, useRef, useState } from 'react';

type Props = {
  /** いまの名前（付いていなければ空） */
  readonly name: string;
  /** 名前が無いときに出す字。押せることが分かる言い方にする */
  readonly placeholder?: string;
  readonly onRename: (name: string) => void;
};

export function IgoGameName({ name, placeholder = '無題', onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement | null>(null);

  // 外で名前が変わったら（世界線を戻った・別の対局になった）下書きも合わせる
  useEffect(() => { setDraft(name); }, [name]);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== name) onRename(draft);
  };

  const style = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold' as const,
    // 地は空間がそのまま透けるので、字は暗い空間で読める明るさにする
    color: '#e6ebf5',
    lineHeight: 1.3,
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        autoFocus
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();   // ← 囲碁の世界線は ← → ↑ ↓ を見ているので、字を書くあいだは渡さない
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(name); setEditing(false); }
        }}
        style={{
          ...style,
          minWidth: 0,
          flex: '1 1 auto',
          background: 'rgba(255,255,255,.10)',
          border: '1px solid rgba(255,255,255,.35)',
          borderRadius: 6,
          padding: '2px 6px',
          outline: 'none',
        }}
      />
    );
  }

  return (
    <h2
      title="押すと名前を付けられる"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={() => setEditing(true)}
      style={{
        ...style,
        cursor: 'text',
        padding: '2px 6px',
        borderRadius: 6,
        // 名前が無いうちは薄く ── 「まだ決まっていない」が見えるように
        opacity: name ? 1 : 0.55,
      }}
    >
      {name || placeholder}
    </h2>
  );
}
