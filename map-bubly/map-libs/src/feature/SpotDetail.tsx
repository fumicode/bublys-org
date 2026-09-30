'use client';
/** 地点 1 つの詳細。名前と種類と、どこに在るか */
import { ComponentPropsWithoutRef, FC, FormEvent, useState } from "react";
import styled from "styled-components";
import { EditableText, useFocusedObject } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Spot_地点 } from "../domain/Spot.domain.js";
import { selectSpotById, updateSpot } from "../slice/map-slice.js";

export const SpotDetail: FC<{ spotId: string }> = ({ spotId }) => {
  const dispatch = useAppDispatch();
  const spot = useAppSelector(selectSpotById(spotId));
  const { setFocusedObjectId } = useFocusedObject();
  const [urlDraft, setUrlDraft] = useState("");

  if (!spot) return <StyledSpotDetail>この地点は見つかりませんでした。</StyledSpotDetail>;

  const savePhotoUrls = (photoUrls: string[]) =>
    dispatch(updateSpot(spot.withPhotoUrls(photoUrls).toPlain()));

  const addPhoto = (e: FormEvent) => {
    e.preventDefault();
    const url = urlDraft.trim();
    if (!url) return;
    savePhotoUrls([...spot.photoUrls, url]);
    setUrlDraft("");
  };

  const removePhoto = (index: number) =>
    savePhotoUrls(spot.photoUrls.filter((_, i) => i !== index));

  return (
    <StyledSpotDetail onClick={() => setFocusedObjectId(spot.id)}>
      <div className="e-head">
        <span className="e-dot" style={{ background: Spot_地点.categoryColor(spot.category) }} />
        <h3 className="e-name">
          <EditableText
            value={spot.name}
            onSave={(name) => dispatch(updateSpot(spot.withName(name).toPlain()))}
          />
        </h3>
      </div>
      <dl className="e-rows">
        <dt>種類</dt>
        <dd>{Spot_地点.categoryLabel(spot.category)}</dd>
        <dt>緯度</dt>
        <dd>{spot.lat.toFixed(4)}</dd>
        <dt>経度</dt>
        <dd>{spot.lng.toFixed(4)}</dd>
      </dl>

      {spot.photoUrls.length > 0 && (
        <ul className="e-photos">
          {spot.photoUrls.map((url, i) => (
            <li key={`${i}-${url}`} className="e-photo">
              <img src={url} alt="" loading="lazy" />
              <button
                type="button"
                className="e-remove"
                onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                aria-label="この写真を外す"
              >×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="e-add" onSubmit={addPhoto} onClick={(e) => e.stopPropagation()}>
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="写真の URL を貼る"
        />
        <button type="submit" disabled={!urlDraft.trim()}>足す</button>
      </form>

      <p className="e-hint">掴んで旅程に落とすと、立ち寄り先として予定に入ります。</p>
    </StyledSpotDetail>
  );
};

const StyledSpotDetail = styled.div<ComponentPropsWithoutRef<'div'>>`
  padding: 12px 14px;
  font: 13px/1.6 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .e-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .e-name { margin: 0; font-size: 15px; }

  .e-rows { display: grid; grid-template-columns: 4em 1fr; gap: 2px 10px; margin: 0; }
  dt { color: #666; }
  dd { margin: 0; }

  .e-photos {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }
  .e-photo {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: 6px;
    background: #f0f0f0;
  }
  .e-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .e-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }
  .e-remove:hover { background: rgba(0, 0, 0, 0.75); }

  .e-add {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .e-add input {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    font: inherit;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .e-add button {
    padding: 4px 10px;
    font: inherit;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
  }
  .e-add button:disabled { color: #aaa; cursor: default; }

  .e-hint { margin: 12px 0 0; color: #666; font-size: 0.85em; }
`;
