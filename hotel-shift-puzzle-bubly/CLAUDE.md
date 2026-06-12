# hotel-shift-puzzle-bubly — 開発者ガイド

shift-puzzle-bubly を複製して中身を空にした **ブランクテンプレート**。
ここからドメインモデル（まずは `Staff`）を作り込んでいく。

> 注: ドメイン固有のモデル・UI・feature・バブルルートは全て削除済み。
> 3層 DDD の骨格と bubly 登録の配線、スライス自動注入・世界線初期化の仕組みだけが残っている。

---

## モノレポ構造

```
hotel-shift-puzzle-bubly/
  hotel-shift-puzzle-model/   # ドメイン層（純粋 TypeScript、外部依存なし）
  hotel-shift-puzzle-libs/    # 機能・UI 層（React + Redux）
  hotel-shift-puzzle-app/     # アプリ層（バブルルート登録、エントリーポイント）
```

### 依存方向

```
hotel-shift-puzzle-model（依存なし）
    ↑
hotel-shift-puzzle-libs（model + bubbles-ui + state-management + world-line-graph）
    ↑
hotel-shift-puzzle-app（libs + bubbles-ui + state-management）
```

---

## 現在のファイル構成（空の骨格）

```
hotel-shift-puzzle-model/src/
  index.ts                     # lib/index を再エクスポート
  lib/index.ts                 # ← ドメインモデルをここに追加（export {} のみ）

hotel-shift-puzzle-libs/src/
  index.ts                     # 各バレル + 副作用 import をまとめる
  object-type-registration.ts  # ObjectView 用の型登録（空）
  domain/index.ts              # model を再エクスポート
  ui/index.ts                  # プレゼンテーショナル component（空）
  feature/index.ts             # Redux 接続 component（空）
  slice/index.ts               # Redux スライス（空）
  data/index.ts                # サンプルデータ（空）
  world-line/init.ts           # initWorldLineGraph() のみ（汎用世界線初期化）

hotel-shift-puzzle-app/src/
  main.tsx                     # React エントリー
  app/app.tsx                  # BublyStoreProvider + BublyApp（menuItems 空）
  bubly.ts                     # スタンドアロン bubly 登録（routes/menu 空）
  registration/bubbleRoutes.tsx# バブルルート定義（空配列）
```

---

## 設計ルール（維持すべき方針）

- **ドメインクラスは不変**。更新メソッドは `new MyClass({ ...this.state, field })` を返す
- **状態は `state` オブジェクトを介して管理**する
  ```typescript
  class Staff {
    constructor(readonly state: StaffState) {}
    rename(name: string): Staff {
      return new Staff({ ...this.state, name });
    }
  }
  ```
- **層の依存方向を守る**：domain ← ui ← feature。ui は Redux を直接触らない
- スライスは `slice.injectInto(rootReducer)` を副作用で実行し、bublys-os の store に自動注入される

---

## 新機能の追加手順

### 1. ドメインモデル（hotel-shift-puzzle-model/src/lib/）
新クラスを追加し、`lib/index.ts` から export する。
```bash
cd hotel-shift-puzzle-bubly/hotel-shift-puzzle-model && npm run build
```

### 2. Redux スライス（hotel-shift-puzzle-libs/src/slice/）
`createSlice` → `slice.injectInto(rootReducer)` を書き、`slice/index.ts` から export。
`declare module "@bublys-org/state-management"` で `LazyLoadedSlices` を拡張する。

### 3. UI component（hotel-shift-puzzle-libs/src/ui/）
Redux を使わず props で受ける純粋な表示 component。`ui/index.ts` から export。

### 4. Feature component（hotel-shift-puzzle-libs/src/feature/）
`useAppSelector` / `useAppDispatch` で Redux と UI をつなぐ。`feature/index.ts` から export。

### 5. バブルルート（hotel-shift-puzzle-app/src/registration/bubbleRoutes.tsx）
`hotelShiftPuzzleBubbleRoutes` 配列にルートを追加。必要なら `app/app.tsx` の `menuItems` と
`bubly.ts` の `menuItems` / `initialBubbleUrls` にもエントリーを足す。

### 6. ObjectView ダブルクリック展開（hotel-shift-puzzle-libs/src/object-type-registration.ts）
```typescript
registerObjectType('Staff', <StaffIcon fontSize="small" />);
registerObjectBubble('Staff', { openingPosition: 'bubble-side' });
```
UI 側は `<ObjectView type="Staff" url={...}>` とするだけで自動展開。

---

## コマンド

```bash
# ビルド
npx nx build @bublys-org/hotel-shift-puzzle-model
npx nx build @bublys-org/hotel-shift-puzzle-libs

# テスト
npx nx test @bublys-org/hotel-shift-puzzle-libs

# bublys-os 経由の開発サーバー
npx nx dev bublys-os
```
