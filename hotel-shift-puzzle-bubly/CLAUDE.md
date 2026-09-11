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
- **Reduxスライスは集約のリポジトリに徹する**：スライスは集約の保存・取得のみ
  （`setList` / `add` / `update`（IDで丸ごと置換）/ `remove(id)`）。
  ドメインのビジネスロジックは集約オブジェクトのメソッドに生やし、reducer には書かない。
  更新は feature 層で「集約をセレクタで取得 → 集約のメソッドで新インスタンス → `toPlain()`
  → `update` reducer で保存」する。
  例: `dispatch(updateSchedule(schedule.setCell(staffId, day, to).toPlain()))`
  （`setCell` は `MonthlyStaffSchedule` のメソッド。スライスに `setCell` を書かない）
- **バブル URL スキームは app 層に置く**（オブジェクトの正規 URL も含む）。
  libs（domain/ui/feature）に `hotel-shift-puzzle/...` の URL 文字列を書かない。
  - ルート/サブビューの URL ビルダーは `registration/bubbleUrls.ts` に定義し、route の
    pattern（`bubbleRoutes.tsx`）と隣り合わせる。feature へは props で注入する
  - オブジェクトの正規 URL（Staff/Schedule 等）も app から `registerObjectUrl(type, …)`
    で登録する（記述子 `defineObjects` の `url` は使わない）。`url` は型固有の属性ではなく
    routing 束縛なので app の関心事。`getId`/`serialize` 等の intrinsic な側面だけ libs に残す
  - UI 側は `ObjectView` に URL を渡すだけ。展開・data-url・openBubble・opener 解決は
    ObjectView に一任する（自前で UrledPlace＋openBubble を組まない）
- **グローバル型を origin スコープへ取り込むパターン**（テンプレート → 世界線独自コピー）：
  「グローバルにもテンプレートがあり、新しい origin（勤務表など＝世界線の起点）が作られるとき、
  グローバルのものをその origin のスコープ内へコピーして独自版にする」よくある形。
  - 取り込む型は、id が origin 用のときだけ origin のローカル世界線へ束ねるよう `localScope` を
    宣言する（グローバル固定IDのときは `undefined`）。例（`objects/hotelObjects.tsx` の `WorkShiftSet`）:
    `localScope: (s) => s.id === GLOBAL_WORKSHIFT_SET_ID ? undefined : localScopeId(SCHEDULE_TYPE, s.id)`
  - グローバルのテンプレートは固定ID（例 `"global"`）で1つ持ち、専用バブルで編集する。
  - origin 作成時に **`adoptGlobalObject(store, TYPE, g => g.withId(originId), GLOBAL_ID)`**
    （`objects/commit.ts`）を呼ぶ。これはグローバル現在値を読み、id を origin 用へ差し替えて
    `saveObject` するだけ。`saveObject` が `localScope` を見て origin スコープ＋APP_SCOPE の両方へ
    記録するので、以後その型の編集は origin の世界線に載る（時間移動で一緒に戻る）。
  - 集約側には id を差し替えつつ中身（子の id 等）を保つコピー用メソッド（例 `WorkShiftSet.withId`）を
    生やす。ドメインは新規 id を採番しない（採番は feature 層）。
  - 例: 勤務帯は `WorkShiftSet`（勤務帯の集約）1つにまとめ、グローバル（id=`global`）と
    勤務表ごと（id=scheduleId）の2通りで存在する。勤務表は勤務帯を `workShiftIds` で持たず、
    自分の `WorkShiftSet` を唯一の真実とする。

---

## 勤務表ファイル（世界線ごとローカルファイルへ保存・読み込み）

デバッグ用のデータパターンを `src/data/*.ts` に書き足す代わりに、アプリ上で作った状態を
そのままファイルに保存し、開き直せるようにしたもの。実装は `libs/src/world-file/`。

- **形式**: JSON（`.hsp.json`）。中身は `{ format, formatVersion, savedAt, note, graphs, cas }`。
  `graphs` は スコープID → 世界線グラフ、`cas` は ハッシュ → 状態データ。
  エディタで開いて 1 箇所だけ書き換えて読み直す・git で差分を見る、という使い方ができる。
- **入れる範囲**: `hotel` スコープと `Schedule:<id>` スコープの**履歴・分岐すべて**。
  `root`（バブル配置）と他バブリのスコープは入れない（`world-file/documentScopes.ts`）。
- **読み込みは全置き換え**。ファイルに無いスコープは空グラフで上書きする。
  `deleteScope` は使わない（キーごと消すと `useCasScope` の initialObjects 経路で
  新しい世界が生えうるため）。
- **CAS の本体は Redux ではない**。Redux の `cas` は 300 件で間引かれ、溢れた分は
  IndexedDB にだけ残る。だから保存時は IndexedDB から取り直し（`collectWorldFile`）、
  読み込み時は先に IndexedDB へ書いてから Redux に載せる（`applyWorldFile`）。
- **dispatch 順は CAS → グラフ、かつ await をまたがない**。逆にすると
  「全オブジェクトが消えた世界」が 1 フレーム観測される。
- **例データは自動で入らない**。ファイルバブルの「例データ読み込み」ボタンで明示的に投入する
  （`objects/seed.ts` の `buildSampleItems()`）。初回起動は空。
  自動投入をやめたので「まだ無いものだけ足す」差分ロジックも不要になった
  （読み込みは開くのと同じ全置き換え。足し込みだと今の状態しだいで結果が変わり、
  「このパターンを再現する」用途に使えない）。
- File System Access API（Chromium 系）を使い、「保存」は同じファイルへ上書きする。
  ハンドルは IndexedDB に覚えてリロードをまたぐ。非対応ブラウザは
  ダウンロード／`<input type=file>` に落ちる。

UI は `hotel-shift-puzzle/file` バブル（`WorldFilePanel` / `WorldFileView`）。

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
`hotelShiftPuzzleBubbleRoutes` 配列にルートを追加。URL ビルダーは `registration/bubbleUrls.ts`
に書き（pattern と隣り合わせる）、オブジェクトの URL なら同ファイルで `registerObjectUrl` 登録、
サブビューの URL なら feature へ props で注入する。必要なら `app/app.tsx` の `menuItems`
（スタンドアロン起動時のサイドバー）と `bubly.ts` の `initialBubbleUrls` にもエントリーを足す。

> `Bubly` の `menuItems` は廃止した。OS にロードしたバブリは universe のアイコン 1 個だけを
> サイドバーに出し、中身は universe に囲われた中から開く。

### 6. ObjectView ダブルクリック展開（hotel-shift-puzzle-libs/src/object-type-registration.ts）
```typescript
registerObjectType('Staff', <StaffIcon fontSize="small" />);
registerObjectBubble('Staff', { openingPosition: 'bubble-side-right' });
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
