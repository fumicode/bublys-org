'use client';

/**
 * 制約アイコン共通部品。
 * 各制約を「約80×80の動的アイコン＋下の短いラベル」で表す。中身（人数・上限など）を
 * 図として描くことで、文を読まなくても制約の内容が伝わるようにする。
 */
import type { HTMLAttributes } from "react";
import styled from "styled-components";

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

/** アイコン下の中立キャプション。 */
export const IconCaption = styled.figcaption<HTMLAttributes<HTMLElement>>`
  font-size: 0.72em;
  font-weight: 600;
  color: #546e7a;
  line-height: 1.1;
  text-align: center;
`;
