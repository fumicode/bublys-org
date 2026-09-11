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
---

## 世界線スコープ：所属・誕生・読み先

このバブリのルールは3つだけ。分岐を増やさないこと。

1. **オブジェクトの住所は1つ。** 所属は型の宣言（記述子の `membership`）だけで決まり、
   読み・保存・削除が同じ解決式を共有する。
2. **世界の誕生は1回・1ノード。** 持ち主と固定メンバーの**参照**を同じ grow に混ぜて起点に置く。
   値は読まない（CAS から追い出されていても焼き付けが欠けないため）。
3. **読みは世界線を進めない。** レンダー・effect の経路は絶対に grow しない。

### メンバーの3分類（`objects/framework.tsx` の `Membership`）

| 分類 | 意味 | 例 |
|---|---|---|
| `live` | その世界で**変化する**。編集でノードが増え、時間移動で戻る | Schedule / WorkingStaffGroup / WorkShiftSet(勤務表用) / ScheduleAvailability / ScheduleConstraints / ScheduleEditLog |
| `pinned` | 世界の**誕生時に焼き付けられ、以後動かない**。グローバル側の変更・削除は自動では波及しない | Staff |
| `external`（既定） | 世界に属さず、**世界の中から読んでも常にグローバル** | ScheduleReservationInfo / ScheduleReport / StaffMonthlyShiftWish |

```typescript
Staff:    { membership: { kind: "pinned" } }
Schedule: {
  membership: { kind: "live", homeScope: (id) => localScopeId(SCHEDULE_TYPE, id) },
  scope: { pinTypes: [STAFF_TYPE] },   // この世界が生まれるとき誰を連れてくるか
}
```

- **宣言は両側に要る**。メンバー側の `membership` が「私はどう読まれるか」、
  オーナー側の `scope.pinTypes` が「誕生時に誰を連れるか」。pinned はメンバー側だけでは
  「どのスコープへ焼くか」を言えない。
- `homeScope` の引数は **obj ではなく id**。`removeObject(type, id)` はオブジェクトを
  手に持たずに呼ばれるので、obj を要求すると削除だけ住所を解決できない。
  全 live 型で id はスコープの持ち主 ID に等しい（`ScheduleAvailability.id` は `scheduleId`）。

### 読み先（`objects/world.tsx` の `readScopeOf`）

「どの世界にいるか」（`World` / `ScheduleWorld` の Context）と「その型はどう属すか」（`membership`）の
積で決まる。だから `useObjects(type)` の呼び出し側は型しか書かない。

```typescript
if (membershipOf(type).kind === "external") return APP;   // 常にグローバル
if (!world.born) return APP;              // 誕生していない世界は存在しない（安全網）
if (live && homeScope(id) === undefined) return APP;  // その id は本籍を持たない
return world.scopeId;                     // いま居る世界。参照が無ければ「無い」
```

**書き（`homeScopeOf`）と同じ (type, id) で解く。** 型だけで解くと、勤務帯セットのように
id で本籍が変わる型（グローバル固定IDのときは本籍なし）を世界の中から読んだときに
「その世界には居ない」＝ undefined になる。相方に「無ければ既定を作って保存」があると、
そのままグローバルのテンプレートを空で上書きする経路になる。

**存在の判定も同じスコープで行う**（`absentInReadScope` / `useIsAbsent`）。
読み先と判定先が違うと、過去のノードへ時間移動したときに「読み込み中です」が
永久に解けず、そのノードからは二度と編集できない（実際に踏んだ）。

**「その世界に無ければグローバルを見る」という ref 単位のフォールバックを入れてはいけない。**
起点より前のノードへ戻ったときに、そこにグローバルの最新値が現れてしまう。
`born` は**スコープ単位**なので安全（誕生前の世界には時間移動もできない）。

バブルルートは全てトップレベルで個別に Provider に包まれる（親子にならない）ので、
勤務表に属するバブルは自分で `<ScheduleWorld scheduleId={...}>` を張る（`feature/ScheduleWorld.tsx`）。

### 誕生（`objects/commit.ts` の `ensureWorldBorn`）

- 世界を作る場所は**この1関数だけ**。`saveObject` / `saveLocalBundle` / `commitCandidates` は
  全部これを通る。誕生が部分的だと、起点に載っていない型が時間移動で戻らない（#110）。
- 勤務表を作る＝その世界が生まれる。`feature/createSchedule.ts` が1 grow で
  勤務表・勤務帯セット・可能勤務帯・固定メンバーをまとめて起点に置く。
  `repo.save` を複数回呼ぶと1回目で世界が生まれてしまい、起点が欠ける。
- 例データ投入・ファイル読み込みの直後は `bornWorldsOf(store, items)` で世界をまとめて誕生させる。

### 「読めない」と「無い」を分ける（`isAbsentInScope`）

メモリ上の CAS は 300 件で頭打ちなので、値が読めない理由は「本当に無い」と
「追い出された」の2つある。**既定値を作って保存してよいのは前者だけ。**
後者でやると中身のあるオブジェクトを空で上書きする（＝見ているだけでデータが壊れる）。
判定は必ず参照（グラフ）で行う。参照は追い出されない。
`useObjectsPending()` は「いま状態が揃っていない」を返すので、
「無ければ作る」effect はこれで待つこと。

### 時間移動

読みもその世界からなので、**`scope.moveTo(nodeId)` だけで画面が変わる**。
以前あった restore（ローカルの状態をアプリ全体スコープへ書き戻す橋渡し）は撤去した。
世界線ビューは共通の `WorldLineScopeView`（既定 `onSelectNode` ＋ `moveToSiblingBranch`）を
そのまま使う。囲碁など他のバブリと同じ形。

### 世界線ビューアに答える（`objects/worldLineViewQueries.ts`）

世界線ビューア（`docs/world-line-viewer.md`）は汎用ライブラリなので、`Staff` も
`Membership` も `APP_SCOPE_ID` も知らない。このバブリの規約は**純粋なクエリ2本**で答える。

```typescript
hotelNestedScope(ref, currentScopeId)  // この参照はどの世界に属すか（本籍がそのまま答え）
hotelCellRole(ref, currentScopeId)     // その世界でどういう立場か: live / pinned / external / null
```

- **対になる2つは同じファイルに置く。** 片方だけ app 層にあると、規約を直すときに
  片方を直し忘れる。app 層（`bubbleRoutes.tsx`）は名前を渡すだけ。
- **どちらも読むだけ。** ストアにも CAS にも触らないので module トップレベルの `const` に
  でき、ビューアの `useMemo` の依存が毎レンダー変わってレイアウトを作り直す事故が起きない。
- **`null` は「分からない／該当しない」。** グローバル台帳は「世界」ではない（誕生も
  焼き付けも無い）ので、そこでは全部 `null`。ここを `live` に倒すと、図が
  「全部この世界のもの」と断言してしまう。
- 立場の語彙は `Membership`（`live` / `pinned` / `external`）と**揃えてある**。
  ライブラリ側の `CellRole` も同じ3語。

### 古い形式の世界線の作り直し（`objects/migrateLegacyScopes.ts`）

固定メンバーを入れる前に生まれた世界線を、空に戻して誕生し直す。
**「固定メンバーが載っていない」だけでは旧形式の証拠にならない。** 名簿が空のときに
作った世界も、正しく生まれたうえで0件になる。決め手は**生まれた時刻**で、焼き付ける
べきものが世界の誕生より前から台帳にあったときだけ旧形式とみなす。
取り違えると試行錯誤の履歴が黙って消えるので、迷ったら触らない側に倒す。

### モデルのクラス図（`src/model-graph/`）

このバブリのモデルの構造を図にするバブル（`hotel-shift-puzzle/model-class-diagram`）。
読み方と生成し直し方は `docs/model-class-diagram.md`。

- 構造（クラス・フィールド・メソッド・つながり）は **TypeScript のソースから生成**する。
  `modelGraph.generated.ts` は**手で編集しない**。モデルか記述子を直したら生成し直す。
  忘れると `modelGraph.staleness.test.ts` が落ちる
- 世界線での所属（live / pinned / external）だけは**記述子から実行時に**重ねる。
  型からは分からないので、知っている側（記述子）に聞く
- 登録されていないクラス（集約の中の部品）には所属を描かない。
  「所属が無い」のではなく「所属という概念の対象ではない」ので、`external` と読ませたら嘘になる
- **焼き付けメンバー（Staff）は、枠の外と中の両方に描く。** 外の台帳にも居るので、
  片方にしか描くとどちらかが嘘になる。同じものだと分かる点線で結ぶ

### グローバル台帳（`APP_SCOPE_ID = "hotel"`）

`saveObject` は本籍のローカル世界線に加えて**必ずここにも書く**。ここは
「全世界の最新値インデックス」で、勤務表一覧やスタッフ詳細のような
**世界をまたぐ問い合わせ**がこれを読む。時間移動はしない（常に最新）。

**`removeObject` も同じ住所へ届く。** 保存が両方へ書くなら削除も両方へ書く。台帳にだけ
墓標を置くと、消したはずのオブジェクトが自分の世界では生き続け、そこで1回編集すると
台帳へ書き戻されて**復活する**（実際に踏んだ。`objects/addressSymmetry.test.ts` が見張る）。
固定メンバー（pinned）は本籍を持たないので台帳だけが動く。これは仕様どおりで、
「グローバルの名簿から消しても、焼き付けた世界からは消えない」がまさに固定の意味。

---

- **グローバル型を origin スコープへ取り込むパターン**（テンプレート → 世界線独自コピー）：
  「グローバルにもテンプレートがあり、新しい origin（勤務表など＝世界線の起点）が作られるとき、
  グローバルのものをその origin のスコープ内へコピーして独自版にする」よくある形。
  **固定メンバー（pinned）とは別物**。こちらは **id を差し替えて別オブジェクトにする**
  （勤務表ごとの独自セット）。pinned は同じオブジェクトの参照をそのまま焼き付ける
  （スタッフは勤務表ごとに別人にはならない）。
  - 取り込む型は、id が origin 用のときだけ origin のローカル世界線へ束ねるよう `homeScope` を
    宣言する（グローバル固定IDのときは `undefined`）。例（`objects/hotelObjects.tsx` の `WorkShiftSet`）:
    `homeScope: (id) => id === GLOBAL_WORKSHIFT_SET_ID ? undefined : localScopeId(SCHEDULE_TYPE, id)`
  - グローバルのテンプレートは固定ID（例 `"global"`）で1つ持ち、専用バブルで編集する。
  - origin 作成時に **`adoptGlobalValue(store, TYPE, g => g.withId(originId), GLOBAL_ID)`**
    （`objects/commit.ts`）でグローバル現在値を読み、id を origin 用へ差し替えた値を得る。
    **これは保存しない。** 得た値は `ensureWorldBorn` の seed に混ぜて、持ち主・固定メンバーと
    一緒に**1ノードで**起点に置く（`feature/createSchedule.ts` がその形）。
    ここで `saveObject` を先に呼ぶと1回目の保存で世界が生まれてしまい、起点が欠ける
    （「世界の誕生は1回・1ノード」に反する）。
  - 集約側には id を差し替えつつ中身（子の id 等）を保つコピー用メソッド（例 `WorkShiftSet.withId`）を
    生やす。ドメインは新規 id を採番しない（採番は feature 層）。
  - 例: 勤務帯は `WorkShiftSet`（勤務帯の集約）1つにまとめ、グローバル（id=`global`）と
    勤務表ごと（id=scheduleId）の2通りで存在する。勤務表は勤務帯を `workShiftIds` で持たず、
    自分の `WorkShiftSet` を唯一の真実とする。

---

## 勤務表の行は「勤務スタッフ群」が決める

勤務表はスタッフを直接持たない。間に **勤務スタッフ群（`WorkingStaffGroup`）** が入る。

```
勤務表 ──workingStaffGroupId──▶ 勤務スタッフ群 ──▶ メンバー
                                                  ├ roster    : 名簿の人（世界に焼き付いた Staff を id で指す）
                                                  └ temporary : この勤務表の中だけの臨時の人（実体を群が抱える）
```

- **名簿（`Staff`）は pinned、群は live。** 名簿は世界の誕生で焼き付いて動かない。
  「誰が働くか」はその世界の中で変わるので、群は親 Schedule の世界線に相乗りする（case B）。
  id は `scheduleId`（＝`workingStaffGroupId` の既定値）。
- **臨時の人の実体は群の中にしか居ない。** `Staff` を新しく作るとグローバルの名簿に載って
  しまうので、臨時の人は群が値として抱える。だから時間移動で一緒に現れたり消えたりする。
- 群を持たない勤務表（この集約より前に作られたもの）は、これまで通り
  「この世界に居るスタッフ全員」が行になる。**編集しようとした瞬間に**その顔ぶれから群ができる
  （読みの経路では作らない）。

### 顔ぶれが変わると連れて動くもの（`feature/membershipChange.ts`）

1回の変更で複数の集約が動く。**同じ1ノードに載せる**こと（別々だと、その間のノードへ
時間移動したときに中途半端な世界が現れる＝#110 と同じ事故）。

| 変化 | 連れて動くもの | 載せないとどうなるか |
|---|---|---|
| 人が入る | 可能勤務帯に席を用意（`allowAllIfUnset`） | その人のセルに何も入れられない |
| 人が外れる | 勤務表からその人の割当を消す（`clearStaff`） | 表に居ない人をフッターの集計が数え続ける |
| 人が外れる | 責任者候補から外す（`ScheduleConstraints.removeStaff`） | どう埋めても満たせない日ができる |

組み立ては純粋関数 `buildMembershipChange`（React も store も通さない＝テストで固定できる）、
記録は `recordMembershipEdit`（`saveLocalBundle` で1ノード＋操作履歴に `membershipEdit` を積む）。

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
