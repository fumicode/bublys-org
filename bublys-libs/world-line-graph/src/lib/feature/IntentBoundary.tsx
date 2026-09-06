"use client";
import { FC, useEffect } from "react";
import { beginIntent } from "./intent";

/**
 * 「ユーザーが手を下した瞬間」に意図を開くだけの、何も描画しないコンポーネント。
 *
 * pointerdown / keydown を capture フェーズで拾う。ここで開いた意図は次の入力まで閉じないので、
 * 1 ジェスチャ（クリック → 位置確定 → 子 universe のアドレス書き戻し…）で配置が何回変わっても
 * 世界線のノードは 1 つに畳まれる。
 *
 * **wheel は扱わない。** wheel には終端イベントが無く「1 フリック」の切れ目を作れない。
 * target からキーを作る手も、レイヤー移動でカーソル下の要素が入れ替わる（wheelLayerLock が
 * まさにそのために存在する）ので、1 フリックが複数ノードに割れる。両方向に壊れるため、
 * ホイール由来の変化は従来どおり grow に任せる。
 */
export const IntentBoundary: FC = () => {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!e.isTrusted) return;
      beginIntent();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      if (e.repeat) return; // 押しっぱなしは 1 意図
      if (e.isComposing || e.keyCode === 229) return; // IME 変換中は意図の切れ目ではない
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      beginIntent();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
};
