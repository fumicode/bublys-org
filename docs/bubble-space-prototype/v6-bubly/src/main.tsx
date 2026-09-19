/**
 * v6 ── 本物のバブリ（csv-importer）の画面を、新しいライブラリの上で動かす。
 *
 * 見るのは4つ：
 *   ① バブリの画面のファイルを、何行変えずに済むか
 *   ② 一覧の項目をダブルクリックしたら、隣に詳細が開いて、リストが小さくなるか（X 魚眼）
 *   ③ 泡の中の本物の UI（選択欄・ボタン・スクロール）が触れるか
 *   ④ 規則がどこで足りなくなるか（★ 当たったら止めて報告する）
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BubbleSpace, useBubbleSpace } from '@bublys-org/bubble-layout-feature';
import { routes } from './routes.js';

const VIEWPORT = { w: 1440, h: 809.5 };

/** 検査のための口（本番の配線ではない） */
function Probe() {
  const space = useBubbleSpace();
  (window as unknown as { __v6: unknown }).__v6 = {
    open: (url: string, opener?: string | null) => space.openBubble(url, opener ?? null),
    canOpen: (url: string) => space.canOpen(url),
    urlOf: (id: string) => space.urlOf(id),
    bubbles: () => [...document.querySelectorAll<HTMLElement>(".bl-layer .bub")].map((el) => ({
      id: el.dataset["id"], cls: el.className, tf: el.style.transform,
      w: el.style.width, h: el.style.height, disp: el.style.display,
    })),
  };
  return null;
}

function App() {
  const [drawMin, setDrawMin] = useState(5);
  return (
    <>
      <div id="bar">
        <span className="lbl">v6 ── csv-importer の「一覧 → 詳細」を、新しいライブラリで</span>
        <span className="sep" />
        <label htmlFor="dm">描く下限</label>
        <input id="dm" type="range" min="0" max="20" step="0.5" value={drawMin}
               onChange={(e) => setDrawMin(+e.target.value)} />
        <span className="read">{drawMin.toFixed(1)}px</span>
        <span className="sep" />
        <span className="hint">項目をダブルクリック → 隣に開く　／　ヘッダで掴む　／　背景を引くと視点　／　ホイールで奥行き</span>
      </div>
      <BubbleSpace
        routes={routes}
        initialUrls={['csv-importer/sheets/demo/objects']}
        viewport={VIEWPORT}
        drawMin={drawMin}
      >
        <Probe />
      </BubbleSpace>
    </>
  );
}

const host = document.getElementById('root');
if (host) createRoot(host).render(<App />);
