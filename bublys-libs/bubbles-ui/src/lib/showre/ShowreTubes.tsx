"use client";
import { FC, memo, useId } from "react";
import type { Size2 } from "@bublys-org/bubbles-ui-util";
import type { ScreenRect } from "./Showre.domain.js";
import {
  TUBE_COLOR,
  TUBE_CORE_WIDTH,
  TUBE_GLOW_FAR,
  TUBE_GLOW_NEAR,
  TUBE_THICKNESS,
  TUBE_RADIUS,
  tubePath,
  type TubeOutline,
} from "./tube.js";

export type ShowreTubesProps = {
  /** 海（このユニバースの見えている範囲）の大きさ */
  viewport: Size2;
  /** 管が囲む矩形たち。海の縁、岸に着いたバブル…… すべてまとめて 1 枚に描く */
  outlines: readonly ShowreTubeOutline[];
  thickness?: number;
  radius?: number;
  color?: string;
  glowNear?: number;
  glowFar?: number;
};

export type ShowreTubeOutline = TubeOutline & {
  /** 光を入れたくない領域（アプリの中身）。無ければ内側も海 */
  readonly keepOut?: ScreenRect;
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
    outlines,
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

    // 帯は矩形の縁まで、芯は相手の中心線まで伸ばす。
    // こうすると帯は隙間なく重なり、芯は T 字で出会って 1 本に見える
    const bands = outlines.map((o) => tubePath(o, { thickness, radius, joinAt: "edge" })).filter(Boolean);
    const cores = outlines.map((o) => tubePath(o, { thickness, radius, joinAt: "center" })).filter(Boolean);
    const keepOuts = outlines.flatMap((o) => (o.keepOut ? [o.keepOut] : []));

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
            {bands.map((d, i) => (
              <path key={i} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
            ))}
          </g>
          <g filter={`url(#${nearId})`}>
            {bands.map((d, i) => (
              <path key={i} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
            ))}
          </g>
        </g>

        {/* 管そのもの（くっきり）。帯 → 芯の順に重ねる */}
        {bands.map((d, i) => (
          <path key={`band-${i}`} d={d} stroke={color} strokeWidth={thickness} {...stroke} />
        ))}
        {/*
          ★ 芯の端だけ **square** にする。芯は相手の中心線まで伸びているが、そこで切ると
            重なりが**半芯ぶんしかなく、角の 1 ピクセルが薄くなって切れて見える**
            （実測：芯 1.5px で重なり 0.75px）。square は端を半芯ぶん延ばすので、
            中心線を越えて角が埋まる。端は必ず継ぎ目（接している辺・通さない区間）なので、
            延ばして困る所が無い。帯は太いので butt のままで隙間なく重なる。
        */}
        {cores.map((d, i) => (
          <path
            key={`core-${i}`}
            d={d}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={TUBE_CORE_WIDTH}
            {...stroke}
            strokeLinecap="square"
          />
        ))}
      </svg>
    );
  },
);
ShowreTubes.displayName = "ShowreTubes";
