"use client";
import { FC, memo, useId } from "react";
import type { Size2 } from "@bublys-org/bubbles-ui-util";
import {
  TUBE_COLOR,
  TUBE_CORE_WIDTH,
  TUBE_GLOW_FAR,
  TUBE_GLOW_NEAR,
  TUBE_THICKNESS,
  TUBE_RADIUS,
  seaCapWidth,
  seaCaps,
  seaPath,
  type TubeSea,
} from "./tube.js";

export type ShowreTubesProps = {
  /** 海（このユニバースの見えている範囲）の大きさ */
  viewport: Size2;
  /**
   * 描く海たち。**管は海そのものの形をなぞる** ── 岸に着いたものは切り抜かれている。
   * 入れ子の海（窓）も、この 1 枚にまとめて描く。
   */
  seas: readonly TubeSea[];
  thickness?: number;
  radius?: number;
  color?: string;
  glowNear?: number;
  glowFar?: number;
};


/**
 * 岸の光（ネオン管）を**まとめて 1 枚に**描く層。
 *
 * ここが「1 本の網」の肝。海の縁の管も、岸に着いたバブルの管も、**同じ 1 枚の絵**
 * として描く。要素を分けて重ねると、接ぎ目がその境界として必ず出てしまう
 * （帯が二度塗りになって濃くなり、芯の白線も 2 本並んで谷ができる）。
 * 1 枚に描けば、T 字の交わりも輪郭が溶けて 1 峰になる。
 *
 * 重ねるのは 3 枚とも**同じ 1 本の線**:
 *   1. 遠い滲み（`glowFar`）  … 海へ広く落ちる光
 *   2. 近い滲み（`glowNear`） … 管のすぐまわりの濃い光
 *   3. 管と芯                  … 帯（太い線）と、その真ん中を走る白い細線
 *
 * 光は海の側へ伸び、アプリの中には入らない（`keepOut` で刳り抜く）。
 */
export const ShowreTubes: FC<ShowreTubesProps> = memo(
  ({
    viewport,
    seas,
    thickness = TUBE_THICKNESS,
    radius = TUBE_RADIUS,
    color = TUBE_COLOR,
    glowNear = TUBE_GLOW_NEAR,
    glowFar = TUBE_GLOW_FAR,
  }) => {
    const id = useId();
    const nearId = `${id}-near`;
    const farId = `${id}-far`;
    const maskId = `${id}-keepout`;

    if (viewport.width <= 0 || viewport.height <= 0) return null;

    /**
     * ★ **ネオンは海そのものの形をなぞる。** 岸に着いたものは海から切り抜かれているので、
     *   「箱の輪 ＋ 貼り物ごとの輪」を重ねるのではなく、**引き算した形の縁**を 1 本で描く。
     *   帯も芯も**同じ 1 本**なので、継ぎ目も角の突き合わせも、そもそも存在しない。
     */
    const paths = seas
      .map((s) => seaPath(s.rect, s.holes, { thickness, radius, open: s.open }))
      .filter(Boolean);
    /**
     * ★ **蓋は帯だけ。** 止める相手がいない端に重ねる短い線で、**芯（白）は通さない**
     *   ── 白い芯がその青に囲まれて、閉じて見える（`seaCaps`）。
     */
    const caps = seas
      .map((s) => seaCaps(s.rect, { thickness, open: s.open, extend: s.extend }))
      .filter(Boolean);
    const keepOuts = seas.flatMap((s) => s.keepOut ?? []);

    const stroke = { fill: "none", strokeLinecap: "butt" as const, strokeLinejoin: "round" as const };

    return (
      <svg
        data-showre-tubes=""
        width={viewport.width}
        height={viewport.height}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}
        aria-hidden
      >
        <defs>
          <filter id={nearId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowNear / 2} />
          </filter>
          <filter id={farId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowFar / 2} />
          </filter>
          {/*
            アプリの中身には光を入れない。

            ★ **抜く形も角丸にする。** 中身の箱は角が丸いのに、抜く矩形が直角のままだと
              **角の外側だけ光が抜けて暗い四角が残る**（実測で踏んだ：丸みの外に黒い角）。
              丸みは管の内側の縁に合わせる（管の半径から厚みの半分を引いたもの）。
          */}
          <mask id={maskId}>
            <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
            {keepOuts.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                rx={Math.max(0, Math.min(radius, r.width / 2, r.height / 2))}
                fill="black"
              />
            ))}
          </mask>
        </defs>

        <g mask={`url(#${maskId})`}>
          <g filter={`url(#${farId})`} opacity={0.9}>
            {paths.map((d, i) => (
              <path key={i} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
            ))}
            {caps.map((d, i) => (
              <path key={`c${i}`} d={d} stroke={color} strokeWidth={seaCapWidth(thickness)} {...stroke} />
            ))}
          </g>
          <g filter={`url(#${nearId})`}>
            {paths.map((d, i) => (
              <path key={i} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
            ))}
            {caps.map((d, i) => (
              <path key={`c${i}`} d={d} stroke={color} strokeWidth={seaCapWidth(thickness)} {...stroke} />
            ))}
          </g>
        </g>

        {/* 管そのもの（くっきり）。帯 → 芯の順に重ねる ── どちらも同じ 1 本 */}
        {paths.map((d, i) => (
          <path key={`band-${i}`} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
        ))}
        {caps.map((d, i) => (
          <path key={`cap-${i}`} d={d} stroke={color} strokeWidth={seaCapWidth(thickness)} {...stroke} />
        ))}
        {/*
          ★ 芯の端だけ **square** にする。芯は相手の中心線まで伸びているが、そこで切ると
            重なりが**半芯ぶんしかなく、角の 1 ピクセルが薄くなって切れて見える**
            （実測：芯 1.5px で重なり 0.75px）。square は端を半芯ぶん延ばすので、
            中心線を越えて角が埋まる。端は必ず継ぎ目（接している辺・通さない区間）なので、
            延ばして困る所が無い。帯は太いので butt のままで隙間なく重なる。
        */}
        {paths.map((d, i) => (
          <path
            key={`core-${i}`}
            d={d}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={TUBE_CORE_WIDTH}
            {...stroke}
          />
        ))}
      </svg>
    );
  },
);
ShowreTubes.displayName = "ShowreTubes";
