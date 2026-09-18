/**
 * @bublys-org/bubble-layout-ui ── 泡のならべかたを React で描く。
 *
 * 正：docs/bubble-space-prototype/v4/RULES.md
 * 模型：@bublys-org/bubble-layout（domain。React も Redux も DOM も入っていない）
 *
 *   const layout = useMemo(() => resolveWorld(world, viewport), [world, viewport]);
 *   <BubbleField world={world} layout={layout} viewport={viewport} />
 *
 * いまは ui だけ。feature（Redux・世界線・ObjectView）はまだ無い。
 */
export * from './lib/ui/index.js';
