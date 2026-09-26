'use client';
import { FC, memo, useEffect, useRef, useState } from "react";
import { Bubble, BubbleBoxContext, CurrentBubbleContext } from "@bublys-org/bubbles-ui";
import { matchBubbleRoute } from "../registration/bubbleRoutes";

/**
 * BubbleContentコンポーネント
 * memo化して、bubbleのid・url・大きさが同じなら再レンダリングをスキップ。
 * paramsはBubble作成時に解決済み。
 *
 * 大きさを見るのは、中身が「描ける大きさ」で見せ方を変えることがあるから
 * （ランチャーは幅が足りなければアイコンだけにし、縦横も入る数で決める）。
 * 位置やレイヤーが変わっただけでは描き直さない。
 *
 * ★ **描ける大きさは、ここで測って配る**（`BubbleBoxContext`）。中身ごとに
 *   ResizeObserver を持つと同じ十数行が何枚も並ぶ ── 測るのは泡の通り道 1 か所でいい。
 *   新しい海では橋渡し（`legacyRouteBridge` の `LegacyScreen`）が同じことをする。
 * ★ 配るのは**枠を引いたあとの内側**。`bubble.size`（枠込みの外側）とは別の口にして、
 *   どちらの海でも同じ意味で読めるようにしてある。
 */
/**
 * 中身と同じ広さの箱。測って配るだけで、見た目には何も足さない。
 * 測れるまでは配らない（`null`）── 読む側は「広いもの」として始めればよい。
 */
const MeasuredBox: FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 大きさは**レイアウトの px**で見る（泡に掛かる倍率の影響を受けない側）
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setBox((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}>
      <BubbleBoxContext.Provider value={box && box.width > 0 && box.height > 0 ? box : null}>
        {children}
      </BubbleBoxContext.Provider>
    </div>
  );
};

export const BubbleContent: FC<{ bubble: Bubble }> = memo(function BubbleContent({ bubble }) {
  const route = matchBubbleRoute(bubble.url);
  const Renderer = route?.Component;

  if (Renderer) {
    return (
      <CurrentBubbleContext.Provider value={bubble.id}>
        <MeasuredBox>
          <Renderer bubble={bubble} />
        </MeasuredBox>
      </CurrentBubbleContext.Provider>
    );
  }

  return <div>Unknown bubble type: {bubble.type}</div>;
}, (prevProps, nextProps) => {
  // id・url・大きさが同じなら再レンダリング不要
  const prev = prevProps.bubble;
  const next = nextProps.bubble;
  return prev.id === next.id &&
         prev.url === next.url &&
         prev.size?.width === next.size?.width &&
         prev.size?.height === next.size?.height;
});
