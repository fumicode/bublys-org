'use client';
/**
 * 地図の泡 ── 入れ物（slice）と OS の「最後に指したもの」を、絵（{@link MapView}）に繋ぐ。
 *
 * ★ 指すことだけを OS の文脈（`useFocusedObject`）に預ける。ここに自前の「選択中」を
 *   持つと、旅程で予定を指したときに地図が知らないままになる ── 光る仕組みが
 *   バブリごとに増えると、どれが本当の焦点か誰にも言えなくなる。
 */
import { FC, useCallback } from "react";
import { useFocusedObject } from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { MapView } from "../ui/MapView.js";
import { MapBounds_範囲 } from "../domain/MapBounds.domain.js";
import {
  selectBounds,
  selectRouteSpotIds,
  selectSearchBounds,
  selectSpots,
  setBounds,
  setSearchBounds,
} from "../slice/map-slice.js";
import { useSeedSpots } from "./useSeedSpots.js";

export const MapBubble: FC = () => {
  const dispatch = useAppDispatch();
  useSeedSpots();
  const spots = useAppSelector(selectSpots);
  const bounds = useAppSelector(selectBounds);
  const searchBounds = useAppSelector(selectSearchBounds);
  const routeSpotIds = useAppSelector(selectRouteSpotIds);
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();

  const handleBoundsChange = useCallback(
    (next: MapBounds_範囲) => dispatch(setBounds(next.toPlain())),
    [dispatch],
  );

  /**
   * 「この範囲で探す」── **押したときだけ**探す範囲が動く。
   * もう一度押すと外れる（同じ口で戻せるほうが、別に「やめる」を置くより分かりやすい）。
   */
  const handleSearchHere = useCallback(() => {
    if (searchBounds && searchBounds.equals(bounds)) {
      dispatch(setSearchBounds(null));
      return;
    }
    dispatch(setSearchBounds(bounds.toPlain()));
  }, [dispatch, bounds, searchBounds]);

  return (
    <MapView
      bounds={bounds}
      spots={spots}
      focusedSpotId={focusedObjectId}
      routeSpotIds={routeSpotIds}
      onBoundsChange={handleBoundsChange}
      onSpotFocus={setFocusedObjectId}
      onSearchHere={handleSearchHere}
      searching={!!searchBounds}
    />
  );
};
