/**
 * 泡の見た目 ── docs/bubble-space-prototype/v5-dom/lab.html の <style> のうち、泡の所だけ。
 *
 * ★ ラボのツールバー・右の欄・ヘルプは入れていない（あれはラボの体裁）。
 * ★ 名前を変えたのは入れ物だけ（`#layer` → `.bl-layer`、`#hnd` → `.bl-hnd`）。
 *   泡そのもののクラス名（`bub` `hd` `ttl` `bd` `inner` `mk` `fr` `lb` `rg`）はラボのまま
 *   ── `draw.ts` が書く文字列と、突き合わせの相手（ラボ）を、どちらもずらさないため。
 *
 * 使い方：`<style>{FIELD_CSS}</style>` か、ホスト側の CSS に貼る。
 */
export const FIELD_CSS = `
.bl-layer{position:absolute;inset:0;z-index:1;--f:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
/* 泡は DOM なので、引くと字が選択されてしまう。canvas には無かった代金。ここで止める */
.bl-layer{user-select:none;-webkit-user-select:none;touch-action:none}
/* 泡。素の大きさは箱（bw×bh）のまま。毎フレーム書くのは transform だけ。
   画面で固定の量は逆 scale（--k）で戻す。border-width や font-size を毎フレーム書かない */
.bub{position:absolute;left:0;top:0;--k:1;--h:210;--rw:1.1px;--rr:10px;--rc:hsl(var(--h) 62% 58% / .8);
  box-sizing:border-box;transform-origin:0 0;border-radius:var(--rr);
  background:hsl(var(--h) 30% 13%);box-shadow:0 5px 18px rgba(0,0,0,.5)}
.bub *{box-sizing:border-box}
.bub.chip{--rr:6px}
.bub.sel{--rw:2.4px;--rc:#6ee7ff}
/* ★ 枠は「子より上」に描く。inset の box-shadow は背景のレイヤなので、ヘッダ（.hd）が上から塗ってしまい、
   選択中のシアンがヘッダの帯の所だけ濁る。canvas 版はヘッダを塗ったあとに輪を引く。
   太さの半分ずつ内と外（canvas の stroke と同じ置き方） */
.bub::after{content:"";position:absolute;pointer-events:none;
  inset:calc(var(--rw) * var(--k) / -2);border-radius:calc(var(--rr) + var(--rw) * var(--k) / 2);
  box-shadow:inset 0 0 0 calc(var(--rw) * var(--k)) var(--rc)}
/* ★ 当たりを 1.5px 外へ広げ、丸い角も四角で拾う。可否は当たり判定が模型の矩形で決め直す
   （DOM は要素の矩形を画素に丸めて当てるので、右端・下端の1列が落ち、左端・上端の外 1px が拾われる） */
.bub::before{content:"";position:absolute;inset:calc(-1.5px * var(--k));border-radius:0}
.bub>*{pointer-events:none}
/* ★ 掴めるかどうかは vis から作る。opacity（補間した alpha）とは別の数 */
.bub.off,.bub.off *{pointer-events:none!important}
.hd{position:absolute;left:0;top:0;right:0;height:24px;background:hsl(var(--h) 55% 42% / .55);
  border-radius:10px 10px 0 0}
.chip .hd{height:100%;border-radius:6px;background:hsl(var(--h) 55% 42% / .5)}
.ttl{position:absolute;left:8px;top:0;height:24px;display:flex;align-items:center;
  font:600 12px/1 var(--f);color:#eaf1ff;white-space:nowrap;max-width:calc(100% - 14px);overflow:hidden}
.chip .ttl{height:100%}
.bub.nt .ttl{display:none}
/* 中身の仮の行：太さ 3.5・間隔 11・幅は中身の 82%、★最後の1本だけ 50%（canvas 版と同じ数）。
   本数 --rows は箱の大きさが変わったときだけ書く（canvas 版と同じ min(6, floor((h-24-12)/11))） */
.bd{position:absolute;left:10px;right:10px;top:33px;opacity:.5;
  height:max(0px,var(--rows,0) * 11px - 7.5px);
  background-image:linear-gradient(#9fb0cc,#9fb0cc),
    repeating-linear-gradient(to bottom,#9fb0cc 0 3.5px,transparent 3.5px 11px);
  background-position:0 calc(var(--rows,0) * 11px - 11px),0 0;
  background-size:50% 3.5px,82% max(0px,var(--rows,0) * 11px - 18.5px);
  background-repeat:no-repeat}
.bub.host .bd,.bub.chip .bd,.bub.nb .bd{display:none}
.inner{position:absolute;left:4px;top:27px;right:4px;bottom:4px;border-radius:6px;opacity:.5;
  outline:calc(1px * var(--k)) dashed hsl(var(--h) 60% 62% / .45);outline-offset:calc(-1px * var(--k))}
.bub:not(.host) .inner{display:none}
.mk{position:absolute;right:9px;top:0;height:24px;display:flex;align-items:center;
  font:600 10px/1 var(--f);color:#7ee2a8;white-space:nowrap}
.bub.mfix .mk{color:#ff9db1}
.bub:not(.host) .mk,.bub.nm .mk{display:none}
.bub.mk2 .mk{top:24px;height:14px;right:6px;padding:0 3px;background:hsl(var(--h) 30% 13%);
  font-size:var(--mkfs,10px)}
/* 大きさの角：選択中の泡ひとつだけ。★泡の中ではなく層の兄弟に置く。
   泡の中に置くと、遠い泡の opacity（0.15〜1）に角まで薄まる（canvas 版は角だけ globalAlpha 1 で塗る）。
   四角は 8px、当たりは 16px */
.bl-hnd{position:absolute;left:0;top:0;width:16px;height:16px;display:none;cursor:nwse-resize;transform-origin:0 0}
.bl-hnd::after{content:"";position:absolute;left:2px;top:2px;width:8px;height:8px;background:#6ee7ff;border-radius:2px}
/* ③ 見えない親は体を持たない：枠は pointer-events:none。当たるのは外周 12px の4本の帯だけ */
.bub.imp{background:none;box-shadow:none;border-radius:0;pointer-events:none}
.bub.imp::before,.bub.imp::after{content:none}
/* ★ 点線の枠は「箱の外 5px の道」の上に、太さの半分ずつ内と外（canvas の stroke と同じ）。
   CSS の border は箱の内側に引かれるので、そのぶん外へ出しておかないと 1px 内へずれる */
.fr{position:absolute;--fw:1.2px;opacity:.55;
  left:calc((-5px - var(--fw) / 2) * var(--k));top:calc((-5px - var(--fw) / 2) * var(--k));
  right:calc((-5px - var(--fw) / 2) * var(--k));bottom:calc((-5px - var(--fw) / 2) * var(--k));
  border:calc(var(--fw) * var(--k)) dashed #cdd8ee;border-radius:calc((12px + var(--fw) / 2) * var(--k))}
.bub.imp.sel .fr{--fw:1.8px}
.bub.imp.on .fr{border-color:#6ee7ff;opacity:.95}
/* 札の字：canvas は座布団の上端から 2.5px 下に字の上を置く。flex の中央ぞろえだけだと 2px 下がる */
.lb{position:absolute;left:calc(-4px * var(--k));top:calc(100% + 7px * var(--k));
  height:calc(15px * var(--k));display:flex;align-items:center;
  padding:0 calc(3px * var(--k)) calc(4px * var(--k));
  font-family:var(--f);font-weight:600;font-size:calc(10px * var(--k));line-height:1;white-space:nowrap;
  color:#cdd8ee;background:rgba(8,10,17,.92);border-radius:calc(3px * var(--k));opacity:.8}
.bub.imp.on .lb{color:#6ee7ff;opacity:.95}
.bub.imp.lbup .lb{top:auto;bottom:calc(100% + 7px * var(--k))}
.rg{position:absolute}
.bub.imp .rg{pointer-events:auto}
/* 縁は 12px。DOM の画素まるめで外側 1px を取りこぼさないよう 13px 敷き、当たり判定が 12px に削る */
.rt{left:calc(-13px * var(--k));top:calc(-13px * var(--k));width:calc(100% + 26px * var(--k));height:calc(13px * var(--k))}
.rb{left:calc(-13px * var(--k));bottom:calc(-13px * var(--k));width:calc(100% + 26px * var(--k));height:calc(13px * var(--k))}
.rl{left:calc(-13px * var(--k));top:0;width:calc(13px * var(--k));height:100%}
.rr{right:calc(-13px * var(--k));top:0;width:calc(13px * var(--k));height:100%}
`;
