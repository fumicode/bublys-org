/**
 * 役のテスト。
 *
 * ここが狂うと、**繋がらなかったことが誰にも見えないまま**繋がらなくなるので、
 * 「引けない」と「0 が引けた」を取り違えない所を厚めに見る。
 */
import { describe, expect, it } from "vitest";
import { arrayShape, objectShape, primitiveShape } from "./SchemaShape.js";
import {
  collectPlaces,
  getRoleField,
  hasRole,
  objectRefShape,
  readLatLng,
  readPlaceRef,
  readRole,
  readRoleNumber,
  readRoleText,
} from "./roles.js";

/** 名前は違うが、役は名乗っている型（綴りに頼らないことの見本） */
const TASK_SHAPE = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true },
  { name: "subject", shape: primitiveShape("string"), required: true, role: "title" },
  { name: "estimateMinutes", shape: primitiveShape("number"), required: false, role: "duration" },
]);

const task = { id: "t1", subject: "コードレビュー", estimateMinutes: 45 };

const SPOT_SHAPE = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true },
  { name: "name", shape: primitiveShape("string"), required: true, role: "title" },
  { name: "lat", shape: primitiveShape("number"), required: true, role: "latitude" },
  { name: "lng", shape: primitiveShape("number"), required: true, role: "longitude" },
]);

const spot = { id: "s1", name: "箱根神社", lat: 35.2049, lng: 139.0257 };

describe("役から値を引く", () => {
  it("項目の綴りが違っても引ける", () => {
    expect(readRoleText(TASK_SHAPE, task, "title")).toBe("コードレビュー");
    expect(readRoleNumber(TASK_SHAPE, task, "duration")).toBe(45);
  });

  it("名乗っていない役は undefined（既定に落とすのは受け取る側の仕事）", () => {
    expect(readRole(TASK_SHAPE, task, "money")).toBeUndefined();
    expect(hasRole(TASK_SHAPE, "money")).toBe(false);
    expect(hasRole(TASK_SHAPE, "duration")).toBe(true);
  });

  it("0 は「無い」ではない ── 黙って undefined にしない", () => {
    const shape = objectShape([
      { name: "price", shape: primitiveShape("number"), required: true, role: "money" },
    ]);
    expect(readRoleNumber(shape, { price: 0 }, "money")).toBe(0);
  });

  it("読めない値は undefined ── 黙って 0 にしない", () => {
    const shape = objectShape([
      { name: "price", shape: primitiveShape("number"), required: true, role: "money" },
    ]);
    expect(readRoleNumber(shape, { price: "むりょう" }, "money")).toBeUndefined();
    expect(readRoleNumber(shape, {}, "money")).toBeUndefined();
  });

  it("数で書かれた文字も数として読む（表から来たものは文字のことがある）", () => {
    const shape = objectShape([
      { name: "cost", shape: primitiveShape("string"), required: true, role: "money" },
    ]);
    expect(readRoleNumber(shape, { cost: "1500" }, "money")).toBe(1500);
  });

  it("題名が数でも文字として読める", () => {
    const shape = objectShape([
      { name: "no", shape: primitiveShape("number"), required: true, role: "title" },
    ]);
    expect(readRoleText(shape, { no: 7 }, "title")).toBe("7");
  });

  it("空の題名は undefined（空文字を名前として通さない）", () => {
    expect(readRoleText(TASK_SHAPE, { ...task, subject: "" }, "title")).toBeUndefined();
  });

  it("同じ役が 2 つあれば、先に書いたほうを使う", () => {
    const shape = objectShape([
      { name: "a", shape: primitiveShape("string"), required: true, role: "title" },
      { name: "b", shape: primitiveShape("string"), required: true, role: "title" },
    ]);
    expect(getRoleField(shape, "title")?.name).toBe("a");
  });

  it("形が無い・object でない・中身が object でないときも落ちない", () => {
    expect(readRole(undefined, task, "title")).toBeUndefined();
    expect(readRole(primitiveShape("string"), task, "title")).toBeUndefined();
    expect(readRole(TASK_SHAPE, null, "title")).toBeUndefined();
    expect(readRole(TASK_SHAPE, "文字", "title")).toBeUndefined();
  });
});

describe("緯度経度", () => {
  it("両方名乗っていれば引ける", () => {
    expect(readLatLng(SPOT_SHAPE, spot)).toEqual({ lat: 35.2049, lng: 139.0257 });
  });

  it("片方しか名乗っていなければ引けない（半端な点を地図に出さない）", () => {
    const shape = objectShape([
      { name: "lat", shape: primitiveShape("number"), required: true, role: "latitude" },
    ]);
    expect(readLatLng(shape, { lat: 35.2 })).toBeUndefined();
  });

  it("名乗っていても値が無ければ引けない", () => {
    expect(readLatLng(SPOT_SHAPE, { id: "s2", name: "どこか" })).toBeUndefined();
  });
});

describe("渡されたものの中を歩いて、場所を拾う", () => {
  /** 予定 1 件（立ち寄り先を「指す」） */
  const ITEM = objectShape([
    { name: "title", shape: primitiveShape("string"), required: true, role: "title" },
    { name: "ref", shape: objectRefShape(), required: false, role: "place" },
  ]);
  /** 旅程（日 → 予定 の 2 段入れ子） */
  const ITINERARY = objectShape([
    { name: "id", shape: primitiveShape("string"), required: true },
    {
      name: "days",
      shape: arrayShape(
        objectShape([
          { name: "date", shape: primitiveShape("string"), required: true },
          { name: "items", shape: arrayShape(ITEM), required: true },
        ]),
      ),
      required: true,
    },
  ]);

  it("場所そのものは 1 つとして出る", () => {
    expect(collectPlaces(SPOT_SHAPE, spot)).toEqual([
      { title: "箱根神社", latLng: { lat: 35.2049, lng: 139.0257 }, ref: undefined },
    ]);
  });

  it("入れ子の奥まで歩いて、**書いてある順に**出す", () => {
    const itinerary = {
      id: "t1",
      days: [
        {
          date: "2026-05-17",
          items: [
            { title: "朝の散歩", ref: { type: "Spot", id: "s1" } },
            { title: "昼食", ref: { type: "Spot", id: "s2" } },
          ],
        },
        { date: "2026-05-18", items: [{ title: "参拝", ref: { type: "Spot", id: "s3" } }] },
      ],
    };
    expect(collectPlaces(ITINERARY, itinerary).map((p) => p.ref?.id)).toEqual(["s1", "s2", "s3"]);
    expect(collectPlaces(ITINERARY, itinerary).map((p) => p.title)).toEqual([
      "朝の散歩",
      "昼食",
      "参拝",
    ]);
  });

  it("場所を名乗っていない段は飛ばす（関係ないものをピンにしない）", () => {
    const itinerary = {
      id: "t1",
      days: [{ date: "2026-05-17", items: [{ title: "休憩" }, { title: "昼食", ref: { type: "Spot", id: "s2" } }] }],
    };
    expect(collectPlaces(ITINERARY, itinerary)).toHaveLength(1);
  });

  it("形の無い所へは入らない", () => {
    expect(collectPlaces(undefined, { lat: 1, lng: 2 })).toEqual([]);
    expect(collectPlaces(ITINERARY, null)).toEqual([]);
    expect(collectPlaces(ITINERARY, { id: "t1", days: "日々" })).toEqual([]);
  });

  it("壊れた指は読まない（型か id が欠けていれば場所と見なさない）", () => {
    expect(readPlaceRef(ITEM, { title: "x", ref: { type: "Spot" } })).toBeUndefined();
    expect(readPlaceRef(ITEM, { title: "x", ref: { type: "", id: "s1" } })).toBeUndefined();
    expect(readPlaceRef(ITEM, { title: "x", ref: "s1" })).toBeUndefined();
  });
});
