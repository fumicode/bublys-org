'use client';
/**
 * 宿 1 軒の札 ── 一覧や、ほかのバブリの中に置かれる小さな姿。
 *
 * > **指したものは、どこに写っていても一緒に光る。**
 *
 * ★ 指すことは OS の文脈（`useFocusedObject`）に預ける。札が自前の「選択中」を持つと、
 *   同じ宿が地図のピンと一覧の札の 2 か所に写っているのに、**片方だけ光る**。
 * ★ 押したら指す。地図のピン・旅程の行・一覧の札、どれを押しても同じ所へ書く。
 */
import { ComponentPropsWithoutRef, FC } from "react";
import styled from "styled-components";
import { ObjectView, useFocusedObject } from "@bublys-org/bubbles-ui";
import { Lodging_宿 } from "../domain/Lodging.domain.js";

export const LodgingCard: FC<{ lodging: Lodging_宿 }> = ({ lodging }) => {
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();
  return (
  <StyledLodging
    className={focusedObjectId === lodging.id ? "is-focused" : ""}
    onClick={() => setFocusedObjectId(lodging.id)}
  >
    <ObjectView
      type="Lodging"
      url={`lodgings/${lodging.id}`}
      label={lodging.name}
      openingPosition="bubble-side-right"
      draggable
      fullWidth
    >
      <span className="e-body">
        <span className="e-name">{lodging.name}</span>
        {lodging.kind && <span className="e-kind">{lodging.kind}</span>}
        <span className="e-place">{lodging.placeLabel}</span>
      </span>
    </ObjectView>
  </StyledLodging>
  );
};

const StyledLodging = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 6px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-body { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
  .e-name { flex: 1; min-width: 0; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-kind { flex-shrink: 0; padding: 0 6px; border-radius: 8px; background: #edf2f7; color: #4a5568; font-size: 0.75em; }
  .e-place { flex-shrink: 0; color: #718096; font-size: 0.8em; }

  /* 指されている札。旅程の行・地点の札と同じ色で光る */
  &.is-focused {
    background: #fffbe6;
    box-shadow: inset 0 0 0 2px #f0b429;
    border-radius: 6px;
  }
`;
