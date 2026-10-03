/**
 * オブジェクト型の動的レジストリ
 * アプリケーション側から型を登録する仕組みを提供
 *
 * DragType は ObjectType を kebab-case に変換して 'type/' 接頭辞を付けたもの
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop API の仕様により、type は小文字に変換されるため kebab-case を使用
 */

import type { ReactNode } from 'react';

/**
 * **何かへの指** ── 型名と id の組。
 *
 * > id だけでは、誰に訊けばよいか分からない。
 *
 * バブリをまたいで「あれ」を指すには、これだけあればよい
 * （{@link resolveObjectPlain} に渡せば中身が引ける）。
 * id だけを持たせていたころは、持ち主の型を使う側が決め打ちするしかなかった。
 */
export type ObjectRef = {
  readonly type: string;
  readonly id: string;
};

/**
 * **その型のものは、どこに開くか。**
 *
 * ★ もとは泡のスライス（`bubbles-ui` の `bubbles-slice`）に居たが、これは
 *   「型ごとに前もって名乗っておくこと」なので、この登録簿と同じ棚に置く。
 *   （`bubbles-ui` は今までどおりここから受け取って再輸出する）
 */
export type OpeningPosition =
  | "bubble-side-right"
  | "bubble-side-left"
  | "bubble-side-top"
  | "bubble-side-bottom"
  | "origin-side"
  | "dropped-place";

// 登録された型名のセット
const registeredTypes: Set<string> = new Set();

// 型名（kebab-case）に対応するアイコンのマップ
const registeredIcons: Map<string, ReactNode> = new Map();

// 型名（kebab-case）に対応するラベル解決関数のマップ
export type LabelResolver = (id: string) => string | undefined;
const registeredLabelResolvers: Map<string, LabelResolver> = new Map();

/**
 * PascalCase を kebab-case に変換
 * 例: 'UserGroup' → 'user-group'
 */
const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

export type ObjectTypeOptions = {
  icon?: ReactNode;
  labelResolver?: LabelResolver;
};

/**
 * オブジェクト型を登録する
 */
export const registerObjectType = (typeName: string, iconOrOptions?: ReactNode | ObjectTypeOptions): void => {
  registeredTypes.add(typeName);
  const kebab = toKebabCase(typeName);
  if (iconOrOptions !== undefined && iconOrOptions !== null) {
    // ObjectTypeOptions か ReactNode（アイコン）かを判定
    if (typeof iconOrOptions === 'object' && ('icon' in iconOrOptions || 'labelResolver' in iconOrOptions)) {
      const opts = iconOrOptions as ObjectTypeOptions;
      if (opts.icon !== undefined) {
        registeredIcons.set(kebab, opts.icon);
      }
      if (opts.labelResolver !== undefined) {
        registeredLabelResolvers.set(kebab, opts.labelResolver);
      }
    } else {
      registeredIcons.set(kebab, iconOrOptions as ReactNode);
    }
  }
};

/**
 * 複数のオブジェクト型を一括登録する
 */
export const registerObjectTypes = (typeNames: string[]): void => {
  for (const typeName of typeNames) {
    registerObjectType(typeName);
  }
};

/**
 * 登録されている全てのオブジェクト型名を取得
 */
export const getRegisteredObjectTypes = (): string[] => {
  return [...registeredTypes];
};

/**
 * ObjectType から DragType を生成
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop APIはtypeを小文字に変換するため、kebab-caseを使用
 */
export const getDragType = (typeName: string): string => {
  return `type/${toKebabCase(typeName)}`;
};

/**
 * DragType から ObjectType（kebab-case）を取得
 * 例: 'type/user' → 'user'
 */
export const getObjectType = (dragType: string): string | null => {
  if (!dragType.startsWith('type/')) return null;
  return dragType.slice(5);
};

/**
 * ObjectType（kebab-case）に対応するアイコンを取得
 */
export const getObjectTypeIcon = (objectType: string): ReactNode | null => {
  return registeredIcons.get(objectType) ?? null;
};

/**
 * ObjectType（kebab-case）に対応するラベル解決関数でラベルを取得
 */
export const resolveObjectTypeLabel = (objectType: string, id: string): string | undefined => {
  const resolver = registeredLabelResolvers.get(objectType);
  return resolver?.(id);
};

/**
 * 全ての登録済み DragType のリストを取得
 */
export const getAllDragTypes = (): string[] => {
  return getRegisteredObjectTypes().map(getDragType);
};

// 後方互換性のための型エイリアス
export type ObjectType = string;

// オブジェクト型ごとのバブル展開設定
type ObjectBubbleConfig = { openingPosition?: OpeningPosition };
const registeredBubbleConfigs = new Map<string, ObjectBubbleConfig>();

export const registerObjectBubble = (typeName: string, config: ObjectBubbleConfig): void => {
  registeredBubbleConfigs.set(toKebabCase(typeName), config);
};

export const getObjectBubbleConfig = (typeName: string): ObjectBubbleConfig | undefined => {
  return registeredBubbleConfigs.get(toKebabCase(typeName));
};

// オブジェクト型ごとの「デフォルトで開くバブルURL」ビルダー（id → url）
// 開く対象（どのバブルか）は型に固有なので事前登録する。
const registeredUrlBuilders = new Map<string, (id: string) => string>();

export const registerObjectUrl = (typeName: string, builder: (id: string) => string): void => {
  registeredUrlBuilders.set(toKebabCase(typeName), builder);
  urlTypeNames.set(toKebabCase(typeName), typeName);
};

/** 開く先を名乗った型の、名乗ったときの綴り（kebab-case → 元の名前） */
const urlTypeNames = new Map<string, string>();

/** 型 + id から登録済みのデフォルト開きURLを導出する（未登録なら undefined） */
export const getObjectUrl = (typeName: string, id: string): string | undefined => {
  return registeredUrlBuilders.get(toKebabCase(typeName))?.(id);
};

/**
 * **この url の泡は、どの型のものか。** 開く先（{@link registerObjectUrl}）を逆に読む。
 *
 * > 開く先から始まれば、その型の泡。開く先から id を抜いたものなら、その型の一覧。
 *
 *   notes/abc          → Note（開く先そのもの）
 *   notes/abc/card     → Note（札も、同じものの別の見え方）
 *   itineraries/x/plan → Itinerary（盤も同じ）
 *   notes              → Note の一覧
 *   map                → undefined（どの型の開く先でもない）
 *
 * ★ 泡の側に「私は Note です」と書かせない。開く先はもう名乗ってあるので、
 *   同じことを 2 か所に書くと、片方だけ直したときにずれる。
 * ★ 当たる開く先が 2 つあれば、長く一致したほうを採る。
 * ★ `type` は名乗ったときの綴り（`Note`）、`kind` は kebab-case（`note`）。
 *   アイコンやラベルを引く口（`getObjectTypeIcon` など）は `kind` で引く。
 */
export const objectTypeOfUrl = (
  url: string,
): { readonly type: string; readonly kind: string; readonly list: boolean } | undefined => {
  const path = url.split(/[?#]/)[0];
  /** id の代わりに差し込む印。url に出てくることのない字 */
  const MARK = '\u0000';
  let best: { type: string; kind: string; list: boolean; len: number } | undefined;
  for (const [kebab, build] of registeredUrlBuilders) {
    const shape = build(MARK);
    const at = shape.indexOf(MARK);
    if (at < 0) continue;
    const head = shape.slice(0, at);
    const tail = shape.slice(at + MARK.length);
    const type = urlTypeNames.get(kebab) ?? kebab;
    const take = (list: boolean, len: number) => {
      if (!best || len > best.len) best = { type, kind: kebab, list, len };
    };
    // その型のもの：頭 ＋ id（/ を含まない）＋ 尻尾、そのあとは終わりか / で続く
    if (path.startsWith(head)) {
      const rest = path.slice(head.length);
      const cut = rest.indexOf('/');
      const id = cut < 0 ? rest : rest.slice(0, cut);
      const after = cut < 0 ? '' : rest.slice(cut);
      if (id && after.startsWith(tail) && (after.length === tail.length || after[tail.length] === '/')) {
        take(false, head.length + tail.length);
      }
    }
    // その型の一覧：開く先から id を抜いたもの（`notes/:id` なら `notes`）
    const listPath = head.replace(/\/$/, '');
    if (tail === '' && listPath && path === listPath) take(true, listPath.length);
  }
  return best && { type: best.type, kind: best.kind, list: best.list };
};

/**
 * **この型の、この id は何か** ── 持ち主に中身を訊く口。
 *
 * > バブリどうしの通り道は「ものを渡すこと」だけ。他のバブリの引き出しは覗かない。
 *
 * これが無かったころ、受け取った側が持てるのは url だけだったので、
 * 値を読むには**持ち主を import するしかなかった**（旅程が地図とアクティビティを
 * 名指ししていた理由）。名指しすると、その 2 つが無いと旅程が成り立たなくなる
 * ── 部品として 1 つずつ選べない。
 *
 * ★ 返すのは**保存形（plain）**。形の申告（`registerSchema`）が説明しているのは
 *   保存形なので、役から項目を引くには同じものでなければ噛み合わない。
 * ★ **状態を引数で受け取る。** 登録は読み込んだ時点の副作用なので、その時にはまだ
 *   store が無い。読むのは呼ぶ側（セレクタの中）なので、そちらから渡してもらう
 *   ── こうすると `useAppSelector(s => resolveObjectPlain(型, id, s))` と書けて、
 *   中身が変われば読んだ側も描き直る（渡した瞬間の写しにならない）。
 * ★ この lib は state-management を知らない（いちばん下の棚なので）。
 *   状態の形は `unknown` のまま受けて、名乗った持ち主が自分で読む。
 */
export type ObjectResolver = (id: string, state: unknown) => unknown | undefined;

const registeredResolvers = new Map<string, ObjectResolver>();

/** 「この型の中身は、こう引く」を名乗る（名乗るのは持ち主） */
export const registerObjectResolver = (typeName: string, resolve: ObjectResolver): void => {
  registeredResolvers.set(toKebabCase(typeName), resolve);
};

/** 型 + id から保存形を引く。名乗っていない型・見つからない id なら `undefined` */
export const resolveObjectPlain = (
  typeName: string,
  id: string,
  state: unknown,
): unknown | undefined => registeredResolvers.get(toKebabCase(typeName))?.(id, state);

/** 中身を訊ける型かどうか */
export const canResolveObject = (typeName: string): boolean =>
  registeredResolvers.has(toKebabCase(typeName));

/** 中身を訊ける型の一覧（kebab-case）。地図が「場所を名乗る型」を探すのに使う */
export const getResolvableObjectTypes = (): string[] => [...registeredResolvers.keys()];

// オブジェクト型ごとの同一性解決（class による型判定・getId）
type ObjectIdentity = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class?: new (...args: any[]) => unknown;
  getId?: (obj: unknown) => string;
};
const registeredIdentities = new Map<string, ObjectIdentity>();

/** 型の同一性（class・getId）を登録する。ObjectView にオブジェクトを渡して解決させるのに使う */
export const registerObjectIdentity = (typeName: string, identity: ObjectIdentity): void => {
  registeredIdentities.set(typeName, identity);
};

/** オブジェクトから型名を解決する（登録済み class への instanceof 判定） */
export const resolveObjectType = (obj: unknown): string | undefined => {
  for (const [type, identity] of registeredIdentities) {
    if (identity.class && obj instanceof identity.class) return type;
  }
  return undefined;
};

/** 型 + オブジェクトから id を取得する */
export const getObjectId = (typeName: string, obj: unknown): string | undefined => {
  return registeredIdentities.get(typeName)?.getId?.(obj);
};
