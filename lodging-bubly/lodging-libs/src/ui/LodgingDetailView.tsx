'use client';
/**
 * 宿 1 軒の詳細 ── 名前だけが直せる。
 *
 * ★ **調べ物から来た所は直させない**（住所・電話・座標）。直せるようにすると、
 *   出所を作り直したときにどちらが本当か言えなくなる。名前だけは、人が
 *   自分の呼び方を付けたくなるので通す。
 */
import { FC } from "react";
import styled from "styled-components";
import { EditableText } from "@bublys-org/bubbles-ui";
import { Lodging_宿 } from "../domain/Lodging.domain.js";

export type LodgingDetailViewProps = {
  readonly lodging: Lodging_宿;
  readonly onRename: (name: string) => void;
};

export const LodgingDetailView: FC<LodgingDetailViewProps> = ({ lodging, onRename }) => (
  <StyledDetail>
    <h3 className="e-name">
      <EditableText value={lodging.name} onSave={onRename} />
    </h3>
    <dl className="e-rows">
      {lodging.kind && (<><dt>区分</dt><dd>{lodging.kind}</dd></>)}
      {lodging.area && (<><dt>エリア</dt><dd>{lodging.area}</dd></>)}
      {(lodging.city || lodging.region) && (
        <><dt>市町村</dt><dd>{[lodging.region, lodging.city].filter(Boolean).join(' / ')}</dd></>
      )}
      {lodging.address && (<><dt>住所</dt><dd>{lodging.address}</dd></>)}
      {lodging.tel && (
        <><dt>電話</dt><dd><a href={`tel:${lodging.tel}`}>{lodging.tel}</a></dd></>
      )}
      <dt>座標</dt><dd>{lodging.lat.toFixed(5)}, {lodging.lng.toFixed(5)}</dd>
    </dl>
  </StyledDetail>
);

const StyledDetail = styled.div`
  padding: 10px 12px;
  font: 13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-name { margin: 0 0 8px; font-size: 15px; }
  .e-rows { display: grid; grid-template-columns: 4.5em 1fr; gap: 2px 8px; margin: 0; }
  dt { color: #718096; font-size: 0.85em; }
  dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  a { color: #2f7fd6; }
`;
