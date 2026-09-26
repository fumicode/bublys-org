/**
 * @bublys-org/bubble-layout-feature ── 泡のならべかたを、url とオブジェクトにつなぐ。
 *
 *   <BubbleSpace routes={routes} initialUrls={['csv-importer/sheets']} viewport={{w,h}} />
 *   <ObjectView url={...} label={...}>…</ObjectView>   // ダブルクリックで隣に開く
 *
 * 模型は @bublys-org/bubble-layout、描く・触るは @bublys-org/bubble-layout-ui。
 */
export * from './lib/feature/index.js';
