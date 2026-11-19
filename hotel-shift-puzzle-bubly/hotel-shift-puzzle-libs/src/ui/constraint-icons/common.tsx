'use client';

/**
 * 制約アイコン共通部品。
 * 各制約を「約80×80の動的アイコン＋下の短いラベル」で表す。中身（人数・上限など）を
 * 図として描くことで、文を読まなくても制約の内容が伝わるようにする。
 */
import type { FC, HTMLAttributes } from "react";
import styled from "styled-components";
import { useNumberDraft } from "../constraints/useNumberDraft.js";

/** アイコンに渡す配色（背景・前景） */
export type IconColor = { bg: string; fg: string };

/** アイコン1辺のサイズ（px） */
export const ICON_SIZE = 80;

/** アイコン（SVG）＋キャプションを縦に積む枠。クリック可能なら is-clickable を付ける。
 *  export する styled は intrinsic props（children 等）を保つため型注釈を明示する。 */
export const IconFrame = styled.figure<HTMLAttributes<HTMLElement>>`
  width: ${ICON_SIZE}px;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  user-select: none;

  .e-icon-svg {
    display: block;
  }

  &.is-clickable {
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.1s, box-shadow 0.1s;
    &:hover {
      background: #eef1f4;
    }
  }

  /* その制約にフォーカス中（関係者を選択して解決モードに入っている）ときの強調。
     色はルールごとに --focus（役割色）で受ける。 */
  &.is-focused {
    background: color-mix(in srgb, var(--focus, #607d8b) 14%, #fff);
    box-shadow: 0 0 0 2px var(--focus, #607d8b);
  }
`;

type IconValueTextProps = {
  /** 文字の中心と基線（viewBox 80×80 の座標） */
  x: number;
  y: number;
  fill: string;
  /** 数の前に添える記号（≤ / ≥） */
  prefix: string;
  value: number;
  /** 渡されたときだけ、押してその場で数を変えられる */
  onCommit?: (value: number) => void;
};

const VALUE_FONT_SIZE = 14;

/**
 * 図の中の「≤N」。押すと同じ場所が入力欄になり、確定（blur / Enter）で1回だけ保存する。
 * バーの小さいアイコンには onCommit を渡さないので、そこではただの文字のまま。
 */
export const IconValueText: FC<IconValueTextProps> = ({ x, y, fill, prefix, value, onCommit }) => {
  const { editing, start, inputProps } = useNumberDraft(value, (n) => onCommit?.(n));
  const style = { fontSize: VALUE_FONT_SIZE, fontWeight: 700, color: fill };

  if (onCommit && editing) {
    const w = 44;
    const h = VALUE_FONT_SIZE + 6;
    return (
      <foreignObject x={x - w / 2} y={y - VALUE_FONT_SIZE - 1} width={w} height={h}>
        <input
          type="number"
          min={1}
          autoFocus
          onFocus={(e) => e.target.select()}
          {...inputProps}
          style={{ ...style, width: "100%", height: "100%", boxSizing: "border-box",
            padding: 0, textAlign: "center", border: "1px solid #90a4ae", borderRadius: 3 }}
        />
      </foreignObject>
    );
  }
  return (
    <text
      x={x}
      y={y}
      fontSize={VALUE_FONT_SIZE}
      fontWeight={700}
      fill={fill}
      textAnchor="middle"
      style={onCommit ? { cursor: "pointer" } : undefined}
      onClick={onCommit ? start : undefined}
    >
      {onCommit && <title>押して数を変える</title>}
      {prefix}
      {value}
    </text>
  );
};

/** アイコン下の中立キャプション。 */
export const IconCaption = styled.figcaption<HTMLAttributes<HTMLElement>>`
  font-size: 0.72em;
  font-weight: 600;
  color: #546e7a;
  line-height: 1.1;
  text-align: center;
`;
