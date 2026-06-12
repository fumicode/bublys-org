# bublys の思想

このドキュメントは、リポジトリ全体のコード・設計ドキュメント・設計判断の履歴から読み取れる
**bublys の根底にある思想**をまとめたものです。個々の実装仕様ではなく「なぜそう作るのか」を中心に記述します。

> 注意: `docs/` 配下には探索段階のメモ（object-shell の統合パターン A/B/C など、まだ採用が確定していない案）が混在しています。
> このドキュメントは、それらのうち**実コードに定着し、設計の背骨になっている思想**だけを抽出しています。

---

## 0. 一言でいうと

> **ドメインモデルを中心に置き、UI も履歴も「モデルを別の角度から見たもの」として派生させる。**
> **そして Web そのものの仕組み（URL・リンク・ナビゲーション）を、ブラウザの中にもう一段小さく作り直す。**

- **UI** は、ドメインモデルを画面に射影したもの。
- **履歴（世界線）** は、ドメインモデルの時系列変化そのもの。

bublys は単なるアプリではなく、**バブル（bubble）という単位でアプリを組み合わせて動かす小さな OS** を志向しています。
その土台にあるのが、以下の 4 つの柱です。

1. シンプルなルールで自然な動作を生む（設計哲学）
2. model 中心の 3 層アーキテクチャ（domain → ui → feature）
3. バブル = URL を基盤とした「Web の縮小再現」
4. 世界線いじり = 状態のバージョン管理とタイムトラベル

---

## 1. シンプルなルールで自然な動作を生む

bublys の設計哲学の肝は、

> **言語化しやすいシンプルなルールに基づいて、動作が自然と行われるようにする。
> そのために、実装の前に徹底して議論する。**

ことです。「どういうルールに基づくべきか」を納得いくまで議論し、
そのルールを置くことで一貫性のある予測可能な振る舞いを生む——これが出発点です。

例として CLAUDE.md が挙げているのは:

- 「**レイヤーが変わったらフォーカスを解除する**」というルールを 1 つ決めておけば、
  `popChild` で親バブルが奥に下がったとき、明示的なイベント処理なしにフォーカスが自然に外れる。

その結果として、**イベントハンドラごとに個別の処理を書き散らさずに済む**——
これはルール駆動を貫いたことの帰結であって、目的そのものではありません。

この「ルール駆動」の発想は、後述するすべての柱に通底します。

- バブルは「**URL が変われば view が変わる**」というルールだけで、開閉もネストもナビゲーションも成立する。
- 世界線は「**id を持ち JSON 化できるものは何でも追跡できる**」という 1 つのルールで、
  会話・ゲーム・さらには世界線グラフ自体まで再帰的に巻き戻せる。
- ドメインは「**更新は必ず新インスタンスを返す**」という不変性ルールで、React の再描画も履歴記録も自然に乗る。

**実装の前に「どういうルールに基づくべきか」を議論して納得する**——これが bublys の開発スタイルです。

---

## 2. model 中心の 3 層アーキテクチャ

### 2.1 依存の向き

bublys は DDD の 3 層構造を採り、依存は一方向に流れます。

```
domain (依存なし: 純粋 TypeScript)
  ↑
  ui (domain にのみ依存。Redux を知らない)
  ↑
feature (domain + ui + Redux に依存。両者を橋渡しする)
```

- **domain 層**: ビジネスロジックと型。React も Redux もインポートしない。
- **ui 層**: ドメインオブジェクトを受け取って表示するだけの純粋なプレゼンテーション。Redux に触らない。
- **feature 層**: **「機能を実現する」層**。domain と ui を Redux につなぎ、副作用を扱い、
  ひとつのまとまった機能として動くようオーケストレーションする。

実例（`gakkai-shift-libs`）:

```
src/
├── domain/   # = @bublys-org/gakkai-shift-model の再エクスポート
├── slice/    # Redux スライス
├── feature/  # StaffCollection.tsx (Redux 接続 + フィルタロジック)
└── ui/       # StaffListView.tsx (Staff_スタッフ[] を受け取って描画するだけ)
```

`StaffListView`（ui）は `Staff_スタッフ` というドメイン型にしか依存せず、
`StaffCollection`（feature）が Redux からデータを取り、フィルタを掛け、UI に渡します。

### 2.2 なぜ class + 不変オブジェクトなのか

bublys のドメインは、プレーンな JSON ではなく **class** で表現し、
**メソッドは内部状態を変更せず新しいインスタンスを返す**不変オブジェクトとして実装します。

```typescript
export class Staff_スタッフ {
  constructor(readonly state: StaffState) {}

  // 不変更新: self を mutate せず新しい Staff を返す
  accept(): Staff_スタッフ {
    return this.withUpdatedState({ status: 'accepted' });
  }

  protected withUpdatedState(partial: Partial<StaffState>): Staff_スタッフ {
    return new Staff_スタッフ({ ...this.state, ...partial });
  }
}
```

ポイントは、状態を **`state` オブジェクト 1 つに集約**し、`readonly` で保持すること
（`constructor(readonly state: {...})`）。class + 不変オブジェクトを選ぶ理由は次の通りです。

1. **ドメインロジックの置き場所を作る。**
   現実のドメインには non-trivial なルールが多数あります。たとえば学会シフト（gakkai-shift）なら
   「このスタッフはこの時間帯に参加可能か（`staff.isAvailableAt(slotId)`）」「各時間帯の必要人数を満たしているか」
   「同一人物を重複配置していないか」といった制約です。
   これらをプレーンオブジェクト + 各所の関数で扱うとルールが散らばり、どこが最新か分からなくなる。
   class にすれば「`Staff_スタッフ` インスタンスを持っていれば、それは常に正しい計算結果を返す」という保証になります。

2. **通信せず、フロントだけで結果が分かる。**
   ドメインの計算ロジックがクラスのメソッドに載っているので、サーバーに問い合わせる必要がありません。
   学会シフトなら、保存ボタンを押す前の「下書き状態のまま」、
   `staff.isAvailableAt(slot)` や必要人数の充足判定をその場で評価して、
   配置の妥当性をリアルタイムに画面へ返せます。

3. **不変性が、再描画と履歴記録に自然に乗る。**
   更新は必ず新インスタンスを返す = 既存インスタンスは変わらない。
   → React の参照比較で再描画が効き、Redux state にもそのまま入り、
   さらに「変更前後が別オブジェクト」という性質が世界線（第 4 章）の履歴記録ともそのまま噛み合う。

4. **不正な状態が生まれにくい。**
   コンストラクタを通った時点で「正しいオブジェクト」であることが保証でき、
   壊れた中間状態を持ち回らずに済む。

### 2.3 Redux は「オブジェクトの保管庫」＝リポジトリ

Redux は、DDD でいう **リポジトリ（Repository）**——ドメインオブジェクトの保管庫——にあたります。
feature 層はここからドメインオブジェクトを取り出し、操作し、また保管します。

ドメインは class、保管庫の中身は JSON-serializable——この溝を埋めるのが
各ドメインの `toJSON()` / `fromJSON()` と、それを一元管理する **domain-registry** です。

```typescript
// DomainRegistry: 型文字列 → { class, fromJSON, toJSON, getId, icon, labelResolver }
export interface DomainObjectConfig<T> {
  class: new (...args: any[]) => T;  // instanceof / 型復元のため
  fromJSON: (json: any) => T;        // JSON → ドメイン
  toJSON: (obj: T) => any;           // ドメイン → JSON
  // ...
}
```

domain-registry に「このアプリにはこういうドメイン型がある」と 1 箇所登録するだけで、
シリアライズ・型復元・UI 用アイコン・ラベル解決がまとめて効くようになります。

> データフロー: `[localStorage JSON] → fromJSON → domain class → ui` 。
> 保管庫（Redux/localStorage）から取り出した瞬間に不変オブジェクトへ復元され、
> 「ここから先は不変オブジェクト」という境界が明確になっています。

---

## 3. バブル = URL を基盤とした「Web の縮小再現」

bublys の UI の中核は**バブル（bubble）**です。
バブルの思想を一言でいえば、**「ブラウザがやっていることを、ブラウザの中にもう一度作る」**ことです。

### 3.1 バブルは「画面に浮かぶコンポーネント」、その状態が URL を持つ

**バブル**とは、画面に表示された UI コンポーネントそのものを指します。
そのバブルの状態を表すのが `BubbleState` で、その中に `url` フィールドがあります。

```typescript
export type BubbleState = {
  id: string;
  url: string;          // どのページを映しているか (例: "users/123")
  type: string;         // url を解決した結果で決まる
  params: BubbleParams; // url パターンから抽出 (例: { id: "123" })
  position?: Point2;
  // ...
};
```

URL が view を決める——これは Web そのものの原理です。bublys では:

```typescript
// URL パターン → React コンポーネント のマッピング
export const usersBubbleRoutes: BubbleRoute[] = [
  { pattern: /^users$/,                       type: "users", Component: UsersBubble },
  { pattern: /^users\/[^/]+$/,                type: "user",  Component: UserBubble },
  { pattern: /^users\/[^/]+\/delete-confirm$/, type: "user-delete-confirm", Component: UserDeleteConfirmBubble },
];
```

`BubbleRouteRegistry.matchRoute(url)` が URL に一致するルートを探し、
`BubbleContent` がその `Component` を描画する。`:param` 形式のパラメータも自動抽出されます。
**バブルの URL = アプリ内のページアドレス**であり、ブラウザのルーターを縮小再現したものです。

### 3.2 リンクとナビゲーション

Web の「リンクをクリックすると次のページへ遷移する」に相当するのが `openBubble` です。

```typescript
// コンテンツの中から、新しい URL でバブルを開く
const { openBubble } = useContext(BubblesContext);
openBubble("users/123", currentBubbleId);  // = <a href="users/123"> のクリック
```

呼び出し側は「どこに遷移したいか（URL）」と「誰が開いたか（親 ID）」を渡すだけ。
ルーティングも表示位置の決定も自動で行われます。
開いた親子関係は `bubbleRelations`（opener → openee）として記録され、Web のリンク構造に対応します。

### 3.3 開閉・ネスト = レイヤーという「奥行き」

ブラウザの「タブ／ウィンドウの重なり」に相当するのが**レイヤー構造**です。

```typescript
export interface BubblesProcessState {
  layers: string[][];  // layers[0] = surface(最前面)、index が大きいほど奥
}
```

- **popChild**: 新しいレイヤーを最前面に積んで開く（奥 → 手前へ）。
- **joinSibling**: 既存の最前面レイヤーに横並びで追加する（同じ種類なら兄弟扱い）。
- **layerUp / layerDown**: バブルを手前／奥へ動かしてフォーカスを操作。

そして座標系（`CoordinateSystem` / `Layer`）が、**奥のレイヤーほど小さく描く**遠近感を与えます
（`scale = 1 - index * 0.1` 程度の減衰）。これは多重ウィンドウの奥行きを視覚化したものです。

ここで第 1 章の「ルール駆動」が効きます。
「**レイヤーが変わったらフォーカスを外す**」というルールを置くだけで、
`popChild` で親が奥に下がったときフォーカスが自然に外れる——個別のイベント処理は要りません。

### 3.4 バブリ（Bubly）= bublys 上で動くアプリケーション

`Bubly` は、**bublys-os というOSの上で動くアプリケーション**です。
技術的には外部から動的にロードされる「プラグイン」ですが、気持ちとしては「プラグイン」ではなく「アプリ」。

> **bubly** は **bubbly-application** の略。
> *泡（bubble）のように透明で、境界をもつが、ゆるく自由につながりうる* ——という思いが込められています。

```typescript
export type Bubly = {
  name: string;
  register: (context: BublyContext) => void;  // OS 起動時に呼ばれ、URL ルートを動的登録
};

// 外部オリジンから bubly.js を読み込む
loadBublyFromOrigin("https://example.com");  // → /bubly.js を取得し register() 実行
```

`bublys-os` が OS、`*-bubly`（gakkai-shift, sekaisen-igo, tailor-genie …）がその上で動くアプリ。
各バブリは URL でルートを登録し、外部オリジンから動的に足せる——
独立した境界を持ちながら、同じ画面の上でゆるくつながり合います。

### 3.5 Web の縮小再現 対応表

| Web の仕組み | bublys での対応 |
|---|---|
| URL / アドレス | バブルの `url` フィールド |
| ルーター | `BubbleRouteRegistry`（url パターン → コンポーネント） |
| `<a href>` クリック | `openBubble(url, parentId)` |
| リンク構造 | `bubbleRelations`（opener → openee） |
| タブ／ウィンドウの重なり | `BubblesProcess.layers`（レイヤーと奥行き） |
| ブラウザの戻る／進む | 世界線（次章）+ root のブラウザ URL（`/universe@<node>`）連携 |
| サイト／アプリ | バブリ（Bubly = bubbly-application） |

> 補足: ブラウザの「戻る／進む」相当は、独立した history スタックではなく
> **世界線システム経由**で実現されています（次章 4.5）。

---

## 4. 世界線いじり（World Line）

「世界線いじり」は、**アプリの状態をバージョン管理し、過去に巻き戻したり分岐させたりできる**仕組みです。
これは bublys を「ただのアプリ」から「時間軸を持つアプリ」へと引き上げる、最も野心的な柱です。

### 4.1 git との対応で考える

世界線は本質的に **git そのもの**です。

| git | 世界線 | 説明 |
|---|---|---|
| HEAD | apex | 今いるノード / 成長点 |
| branch | worldLine | 成長の方向 |
| commit | WorldNode | ある時点の世界の状態 |
| repository | WorldLineGraph | DAG 全体 + 現在位置 |

`WorldLineGraph` は `grow()`（commit）, `moveTo()`（checkout）, `moveBack()`（undo）,
`moveForward()`（redo）を持つ、状態の DAG です。
apex に子がいなければ同じ worldLine を伸ばし、すでに子がいれば新しい worldLine に分岐します。

### 4.2 何でも追跡できる、という 1 つのルール

世界線が追跡できるオブジェクトの条件は、たった 2 つです。

1. **`id` を持つ**（`DomainEntity`）
2. **JSON 化できる**（`toJSON()`）

bublys のドメインモデルは第 2 章の通りすべてこれを満たすので、
**会話でもゲーム盤でもメモでも、同じ仕組みで巻き戻せます**。
状態は内容ハッシュ（FNV-1a）で識別する **CAS（Content Addressable Storage）** として保存され、
「同じ内容なら同じ hash → 重複保存しない／同一性を hash 比較だけで判定できる」という性質が得られます。

### 4.3 じゃがいもモデル（短期記憶 / 長期記憶）

世界線の状態は二層で持ちます。人間の短期記憶・長期記憶のアナロジーです。

- **Redux（地上 / 短期記憶）**: いま使っている状態と DAG の地図。高速・同期・リアクティブ。
- **IndexedDB（地中 / 長期記憶）**: 全バージョンの源泉（source of truth）。大容量・非同期・永続。

> 新しい芋（状態）ができたら地上に置きつつ地中にも埋める。普段は地上の最新だけ見えればいい。
> 過去を振り返るときだけ、必要な芋を地中から掘り起こす（遅延ロード）。
> 地上がまっさら（Redux が消える）になっても、地中から復元できる。

これにより、**起動は速く**（最新ノードに必要な状態だけロード）、
**履歴は無限に持てる**（古いものは地中で眠る）という両立が成立します。

### 4.4 スコープ（世界線バブル）と再帰

世界線は「世界全体で 1 つ」ではなく、**オブジェクトのかたまりごと**に作ります。

- 会話のかたまりだけ巻き戻す、ゲームのかたまりだけ巻き戻す、が独立してできる。
- かたまりに含まれるが変更しないオブジェクトは **sealed** にして、巻き戻しの影響から外す
  （例: 会話の世界線の中で「話者」は固定）。

そして最も bublys らしいのが**再帰性**です。
`WorldLineGraph` 自身も「id を持ち JSON 化できる」ので、**別の WorldLineGraph の追跡対象になれます**。

```
親 WorldLineGraph（アプリ全体）
  └─ 子 WorldLineGraph-convA を追跡対象に含む
       └─ さらに内部に conv-1, context-1 を持つ
```

親を巻き戻すと、**子の世界線（履歴ごと）が過去のバージョンに戻る**。
「どの universe も同じ形」というルールが、任意の深さで成立します（循環・自己参照は禁止、木構造のみ）。

### 4.5 URL に乗せる ─ バブルと世界線の結合

ここで第 3 章のバブルと第 4 章の世界線がつながります。確立された統一ルールは:

> **どの universe も「自分の世界線の現在ノード（apex）」を、URL に `<base>@<node>` という形で書く。**

`@<node>` は git / npm / docker の「**at this snapshot**（このスナップショットで見る）」イデオムに倣ったもの。
`makeSnapshotCodec(base)` が base 文字列 1 つから encode/decode を導出するので、語彙のブレがありません
（例: `"universe@node-123"` = 「この universe を node-123 の時点で見る」）。

書き込む先が、root とネストで違います。

| | root | ネスト universe |
|---|---|---|
| URL の置き場所 | **ブラウザのパス** `/universe@<node>` | **自分を表示している親バブルの url** `<base>@<node>` |
| 駆動 | `history.pushState` / `popstate` | 親の `navigateBubble` action |
| undo/redo モデル | **ブラウザ履歴モデル**（前方は切り捨て） | **DAG モデル**（枝分かれを保持） |
| 担当 hook | `useBrowserRootArrangementWorldLine` | `useUniverseArrangementWorldLine`（`link` 経由） |

仕組みの要：

- 土台プリミティブは **`navigateBubble`**（バブルの url だけを差し替える slice action、url 同値ガード付き）。
- ネストでは、apex が進むと親バブルの url が `@<node>` に追従し、逆に親バブルの url が差し戻されると
  その node へ `moveTo` する——この**双方向バインド**を、`useUniverseArrangementWorldLine` が
  「最後に合意したノード」基準で内部ナビ／外部ナビを判定する**単一エフェクト**で行います（綱引きの無限ループを防ぐ）。
- バブルの url が変われば親 view が変わり、親の世界線がそれを記録する。これが再帰的に root まで伝播する。
- 結果、**root のブラウザの戻る／進む 1 本で、ネストを含む全体を行き来できる**。
  root のブラウザ URL は `/universe@<node>` 1 本のまま（従来の Web の見え方を壊さない）。

これにより「URL を基盤とした Web の縮小再現（第 3 章）」と
「世界線によるタイムトラベル（第 4 章）」が、URL という 1 本の糸で結ばれています。

### 4.6 `Cmd+Z` はデータの undo に予約する

世界線には「**データそのもの**を追うもの」（会話・メモ等）と、「**view 状態**を追うもの」
（どのバブルがどのレイヤーに開いているか ＝ arrangement）の 2 種類があります。
`Cmd+Z`（`Ctrl+Z`）は、ユーザーにとって「いまいじっているデータを 1 手戻す」操作なので、
**データの世界線にだけ**割り当てます。

arrangement の世界線（画面のバブル配置）の移動には `Cmd+Z` を使わず、**矢印キー**で辿ります
（`←/→` で親・子、`↑/↓` で兄弟枝）。`Cmd+Z` を view 移動に使うと
「データを undo したつもりが画面配置だけ戻る」とメンタルモデルがズレるためです。
`Cmd+Z` の意味は「その世界線が**データを追っているか view を追っているか**」で決まります。

> この領域は活発に開発が進んでおり（`world-line-view-sync` 系）、仕様が変わることがあります。
> 世界線ロジックは `bublys-libs/bubbles-ui/src/lib/world-line/` に集約され、全バブリで使えるようになっています。
> 設計の理論的背景は [world-line-graph-design.md](./world-line-graph-design.md) を参照。

---

## 5. オブジェクトシェル（構想段階・本格導入には至っていない）

> **注意:** この章は現時点では**アイデア／実験段階**です。ライブラリや探索ドキュメントは存在しますが、
> アプリ全体で本格的に採用されているわけではありません。設計の方向性として記録しておくものです。

ドメインオブジェクトを直接いじるのではなく、**シェル（殻）で包む**ことで、
ドメインを汚さずに「横断的関心事」を足せないか——という構想です。

`ObjectShell<T>` がドメインオブジェクト `T` を包み、以下を付与します。

- **履歴**: 操作のたびに変更履歴を線形チェーンで記録（Redux アクション風）。
- **メタデータ**: どの view で表示されているか、権限、タグなど。
- **関連**: DDD の集約制約を守り、他オブジェクトへは **ID 参照のみ**。

```typescript
class ObjectShell<T> {
  updateDomainObject(newObj: T, operation: string): ObjectShell<T> {
    return new ObjectShell(this.id, newObj, this.metadata,
      { previous: this, timestamp: ..., operation }, // 履歴チェーンに前状態を積む
      this.relations);
  }
}
```

狙いは、第 2 章の「ドメインは変更不要」を守ったまま、
**履歴・権限・view 関連付けといった横断的関心事をドメインの外に分離する**ことにあります。

ただし object-shell 周りには探索段階のドキュメント（統合パターン A/B/C、メモリ管理の複数案）が並んでおり、
**どれを採るか自体まだ固まっていません**。とりわけ、シェルの線形履歴と世界線の DAG 履歴（第 4 章）の
**棲み分け／統合は未決**です（[world-line-graph-design.md](./world-line-graph-design.md) 末尾参照）。

> 実際の履歴・タイムトラベルは、現状 object-shell ではなく**世界線システム（第 4 章）が担っています**。
> 「`conversation-meta` の instanceof 問題」「bubbleRoute の domain-registry 統合」など、
> このあたりの未解決課題も残っています。

---

## 6. 全体像

```
┌──────────────────────────────────────────────────────────────┐
│ Bubly（プラグイン = サイト）                                    │
│   gakkai-shift / sekaisen-igo / tailor-genie / memo ...       │
├──────────────────────────────────────────────────────────────┤
│ バブル（URL 基盤の Web 縮小再現）                               │
│   url → route → component / layers(奥行き) / openBubble(リンク) │
├──────────────────────────────────────────────────────────────┤
│ 世界線（git ライクな状態 DAG・タイムトラベル・再帰）            │
│   Redux(地上) ⇄ IndexedDB(地中) / CAS / <base>@<node> を URL に │
├──────────────────────────────────────────────────────────────┤
│ オブジェクトシェル（履歴・メタデータ・関連を分離）※構想段階     │
├──────────────────────────────────────────────────────────────┤
│ ドメインモデル（class + 不変 state・domain-registry で型管理）  │
│   domain → ui → feature の一方向依存                           │
└──────────────────────────────────────────────────────────────┘
```

すべての層が、第 1 章の **「シンプルなルールで自然な動作を生む」** という哲学で貫かれています。

- ドメイン: *更新は必ず新インスタンスを返す*
- バブル: *URL が変われば view が変わる*
- 世界線: *id を持ち JSON 化できるものは何でも、同じ形で追跡・巻き戻しできる*
- バブリ: *泡のように境界を持ちながら、ゆるく自由につながる*

個別のイベントを書くのではなく、こうしたルールを 1 つ置くことで、
開閉・ネスト・フォーカス・履歴・タイムトラベルといった複雑な振る舞いが
**自然と立ち上がってくる**——それが bublys の思想です。

---

## 参考ファイル

- 設計哲学・アーキテクチャ概要: [CLAUDE.md](../CLAUDE.md)
- 世界線の詳細設計: [world-line-graph-design.md](./world-line-graph-design.md)
- オブジェクトシェル（構想メモ）: [object-shell.md](./object-shell.md), [object-shell-bubble-integration.md](./object-shell-bubble-integration.md)
- 主要コード:
  - バブル: [bublys-libs/bubbles-ui/src/lib/](../bublys-libs/bubbles-ui/src/lib/)
  - 世界線: [bublys-libs/world-line-graph/](../bublys-libs/world-line-graph/), [bublys-libs/bubbles-ui/src/lib/world-line/](../bublys-libs/bubbles-ui/src/lib/world-line/)
  - ドメイン登録: [bublys-libs/domain-registry/](../bublys-libs/domain-registry/)
  - シェル: [bublys-libs/object-shell/](../bublys-libs/object-shell/)
</content>
</invoke>
