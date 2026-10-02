'use client';
/**
 * 付箋 1 枚の泡。**中身は自分の型の持ち主に訊く**（`NoteItem` の resolver）。
 *
 * ★ メモが書き換われば読み解きも変わるので、付箋の中身もその場で変わる
 *   ── 書き足して日付を入れれば、この付箋は「いつの話か書かれていない」と
 *   言わなくなる。
 */
import { FC } from "react";
import { resolveObjectPlain } from "@bublys-org/bubbles-ui";
import { getSchema, readRoleText } from "@bublys-org/domain-registry/schema";
import { useAppSelector } from "@bublys-org/state-management";
import { NoteItemCard } from "../ui/NoteItemCard.js";
import type { NoteItemPlain } from "../domain/read/NoteItemPlain.js";

export const NoteItemBubble: FC<{ lineId: string }> = ({ lineId }) => {
  const item = useAppSelector(
    (state) => resolveObjectPlain("NoteItem", lineId, state) as NoteItemPlain | undefined,
  );
  /** 場所の名前は、その場所の持ち主に訊く */
  const placeName = useAppSelector((state) =>
    item?.place
      ? readRoleText(getSchema(item.place.type), resolveObjectPlain(item.place.type, item.place.id, state), "title")
      : undefined,
  );

  if (!item) {
    return <div style={{ padding: 8, color: "#666", fontSize: 12 }}>この付箋のもとになった行は、もうありません。</div>;
  }
  return <NoteItemCard item={item} placeName={placeName} />;
};
