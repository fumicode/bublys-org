# shift-puzzle-bubly システム要件定義書

**バージョン**: 1.0.0
**作成日**: 2026-02-26
**ステータス**: ドラフト

---

## 第1章 背景と目的

### 1.1 現状課題

大学祭実行委員会・学会運営のシフト管理現場へのヒアリングを通じ、以下の本質課題が明らかになった。

#### 作業の属人化と思考の消失

- 200人・15分刻みのシフトをスプレッドシートで手動管理
- 委員長1人に作業が集中し、属人化が常態化
- 「なぜその人をそこに配置したか」という判断理由が記録されない
- 翌年の担当者が同じ判断を再現できず、ノウハウが蓄積されない

#### 部門間調整のボトルネック

- 部門間の人員融通をSlackで往復交渉するため、調整に時間がかかる
- 誰が何の作業を担当しているかリアルタイムで把握できない
- 変更が発生するたびにシート全体を再確認する必要がある

#### ルール外管理の困難

- 「AさんとBさんは同じ時間帯に入れない」等の暗黙ルールが担当者の頭の中にのみ存在
- 制約違反の発見が遅れ、直前の修正作業が発生しやすい

### 1.2 Bublysで解決すること

| 課題 | 解決アプローチ |
|------|---------------|
| 思考の消失 | 配置時に「配置理由」を必須記録し、意思決定の文脈を保存 |
| 属人化 | 理由一覧ビューで担当者交代・引き継ぎドキュメントを自動生成 |
| 調整コスト | ダイナミックバブルレイアウトで情報を辿りながら配置作業を実施 |
| 複数シナリオ管理 | 世界線分岐で晴天案・雨天案等を並行管理 |
| 制約違反 | リアルタイム制約チェックで配置ミスを即時検出 |

### 1.3 汎用化の方向性

`gakkai-shift-bubly`（学会専用）の良さを継承しつつ、以下の用途に汎用化する。

- **中規模イベント**: 大学祭（100〜500人規模）、学会（50〜200人規模）
- **日常業務**: 飲食店・サービス業の週次シフト管理（10〜100人規模）

---

## 第2章 スコープ・想定ユーザー

### 2.1 ターゲットユーザー

#### プライマリユーザー
- **大学祭実行委員長**: 全体シフトの作成・最終確認を担う
- **部門リーダー**: 自部門の人員配置を担当、他部門との調整窓口

#### セカンダリユーザー
- **学会運営担当者**: 1〜3日間の中規模イベントシフト管理
- **飲食・サービス業シフト管理者**: 週次・月次の定常的なシフト運用

### 2.2 対象規模

| 項目 | 下限 | 上限 |
|------|------|------|
| スタッフ人数 | 10人 | 500人 |
| イベント日数 | 1日 | 14日間 |
| 1日の時間帯スロット数 | 8（1時間粒度） | 288（5分粒度） |
| 役割（係）数 | 3 | 100 |
| 同時並行シフト案数 | 1 | 10 |

### 2.3 スコープ外

- 大規模企業の人事管理システム（勤怠・給与計算との統合は除外）
- リアルタイム多人数同時編集（Google Docsのような同期は除外）
- 自動最適シフト生成（AIによる全自動配置は除外）

---

## 第3章 概念ドメインモデル

### 3.1 コアエンティティ

#### `Event`（イベント）— 新規追加

イベント単位でメンバー・役割・日程・シフト案を束ねる最上位コンテキスト。`gakkai-shift-bubly`では単一学会に固定されていたが、本アプリでは複数イベントを管理可能にする。

```typescript
interface EventState {
  id: string;
  name: string;         // 例: "第72回大学祭"
  description: string;
  startDate: string;    // ISO 8601
  endDate: string;
  timezone: string;
  skillDefinitions: SkillDefinition[];  // カスタムスキル定義
  defaultSlotDuration: number;          // デフォルト時間粒度（分）
}
```

#### `Member`（メンバー）— `Staff_スタッフ`を汎用化

`gakkai-shift-bubly`のスタッフモデルを継承し、スキルの動的定義とメモ機能を追加。

```typescript
interface MemberState {
  id: string;
  name: string;
  tags: string[];              // 部門・学年・役職等のグループラベル
  skills: string[];            // skillDefinitions.idへの参照
  availableSlots: TimeSlotId[]; // 参加可能時間帯
  memo: string;                // 性格・相性等の非公式情報（内部用）
  eventId: string;
}
```

#### `Role`（役割）— `Role_係`を汎用化

役割定義をイベントごとにカスタマイズ可能にし、必要人数を範囲（最小〜最大）で指定できるようにする。

```typescript
interface RoleState {
  id: string;
  name: string;                // 例: "受付係", "司会"
  requiredSkills: string[];    // 必須スキル（skillDefinitions.idへの参照）
  minRequired: number;         // 最小必要人数
  maxRequired: number | null;  // 最大必要人数（nullは上限なし）
  color: string;               // ガントチャートの配置ブロック色
  eventId: string;
}
```

#### `TimeSlot`（時間帯）— 粒度設定を追加

時間粒度を設定可能にし、複数日に対応する。

```typescript
interface TimeSlotState {
  id: string;
  dayIndex: number;          // 0始まり（0 = イベント初日）
  startMinute: number;       // 0:00からの経過分数（例: 9:30 = 570）
  durationMinutes: number;   // スロット長（粒度に依存）
  eventId: string;
}
```

#### `Assignment`（配置）— 配置理由を必須追加

**最重要変更点**: 配置操作に`reason`を必須フィールドとして追加し、意思決定の記録を構造化する。

```typescript
interface AssignmentState {
  id: string;
  memberId: string;
  roleId: string;
  timeSlotId: string;
  shiftPlanId: string;
  reason: AssignmentReasonState;  // 必須（省略不可）
  locked: boolean;                // 確定済みフラグ
  createdAt: string;
  updatedAt: string;
}
```

#### `AssignmentReason`（配置理由）— 新規追加

「なぜこの人をここに配置したか」を構造化して記録する新コアコンセプト。

```typescript
type ReasonCategory =
  | 'skill_match'    // スキル適合（「PC操作が得意なため」）
  | 'training'       // 育成目的（「経験を積ませたい」）
  | 'compatibility'  // 相性考慮（「Aさんと組むと機能する」）
  | 'availability'   // 空き時間調整（「この時間帯しか空いていない」）
  | 'other';         // その他

interface AssignmentReasonState {
  category: ReasonCategory;
  text: string;       // 自由記述（任意、空でもよい）
  createdBy: string;  // 記録者名
  createdAt: string;
}
```

#### `ShiftPlan`（シフト案）— シナリオラベルを追加

複数シナリオ（晴天/雨天等）を並行管理するためのラベルを追加。

```typescript
interface ShiftPlanState {
  id: string;
  name: string;            // 例: "本番用シフト"
  scenarioLabel: string;   // 例: "晴天用", "雨天用", "人数削減版"
  assignments: AssignmentState[];
  eventId: string;
  createdAt: string;
  updatedAt: string;
}
```

#### `SkillDefinition`（スキル定義）— 新規追加

`gakkai-shift-bubly`では `pc / zoom / english`等がハードコードされていたが、イベントごとにカスタム定義できるようにする。

```typescript
interface SkillDefinition {
  id: string;
  label: string;  // 表示名（例: "音響操作", "手話通訳", "英語対応"）
}
```

### 3.2 gakkai-shift-modelとの対応表

| 汎用モデル（shift-puzzle） | gakkai-shift対応 | 変更内容 |
|--------------------------|-----------------|---------|
| `Member` | `Staff_スタッフ` | スキルを動的定義（SkillDefinition参照）に変更、`tags`・`memo`フィールド追加 |
| `Role` | `Role_係` | 必要人数を範囲（min/max）に変更、`color`フィールド追加 |
| `TimeSlot` | `TimeSlot` | 粒度設定可能（5分〜1時間）、`dayIndex`で複数日対応 |
| `Assignment` | `ShiftAssignment_シフト配置` | `reason: AssignmentReason`を必須追加、`locked`フィールド追加 |
| `ShiftPlan` | `ShiftPlan_シフト案` | `scenarioLabel`追加 |
| `Event` | ——（なし）| 新規：イベント単位の最上位コンテキスト |
| `SkillDefinition` | ——（ハードコード）| 新規：カスタムスキル動的定義 |
| `AssignmentReason` | ——（なし）| 新規：配置理由の構造化記録 |

---

## 第4章 機能要件

### F-1: メンバー管理

| ID | 要件 | 優先度 |
|----|------|--------|
| F-1-1 | メンバーの登録・編集・削除 | Must |
| F-1-2 | カスタムスキルの割り当て（イベントごとに定義されたSkillDefinitionを参照） | Must |
| F-1-3 | 参加可能時間帯の設定（時間粒度に合わせたスロット選択UI） | Must |
| F-1-4 | タグによるグループ管理（部門・学年・役職等の複数タグ付け） | Must |
| F-1-5 | 内部メモ記録（性格・相性等の非公式情報、シフト表には非表示） | Should |
| F-1-6 | CSVインポート（既存名簿・スプレッドシートからの取り込み） | Should |
| F-1-7 | CSVエクスポート（メンバー一覧の外部出力） | Could |

### F-2: ガントチャートシフト配置（コア・重点機能）

シフト作成の中核となる配置編集UI。`fuzzy-session-react`のガントチャート実装を参考に、連続時間軸ベースの配置インターフェースを実現する。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-2-1 | ガントチャート形式の配置ビュー表示 | Must |
| F-2-2 | 縦軸（メンバー行）× 横軸（連続時間軸）のレイアウト | Must |
| F-2-3 | 配置ブロックのドラッグ&ドロップ移動（時間軸上の移動・役割変更） | Must |
| F-2-4 | メンバーカードからガントチャートへのドラッグ配置（新規割り当て） | Must |
| F-2-5 | 配置時の「配置理由」入力UI（カテゴリ選択＋自由記述） | Must |
| F-2-6 | 制約チェックのリアルタイム表示（重複・スキル不足・必要人数不足等） | Must |
| F-2-7 | 参加可能時間帯のガントチャートへのオーバーレイ表示 | Must |
| F-2-8 | 時間軸のズーム切り替え（全日表示〜1時間詳細表示） | Should |
| F-2-9 | 配置ブロックのロック機能（確定済み配置を誤変更から保護） | Should |
| F-2-10 | 複数日表示（日付タブ切り替えまたは横スクロール） | Could |

#### ガントチャートUI仕様（fuzzy-session-react 参考）

**座標計算の基本単位**

```
hourPx        = 60          // 1時間あたりのピクセル高さ（設定可能: 40〜120）
minutePx      = hourPx / 60 // 1分あたりのピクセル高さ

// 時刻 → Y座標（連続値）
y(startHour, startMinute) = startHour * hourPx + startMinute * minutePx

// 配置ブロックの高さ
height(durationMinutes) = durationMinutes * minutePx
```

**配置ブロック（AssignmentBlock）のレイアウト**

```css
/* 各配置ブロックは絶対位置で配置 */
position: absolute;
top: calc(startHour * hourPx + startMinute * minutePx);
height: calc(durationMinutes * minutePx);
width: 可変（役割ごとに異なる幅）;
background-color: role.color;  /* 役割の色を使用 */
```

**時間軸グリッドライン**

| グリッド種別 | 間隔 | 用途 |
|-------------|------|------|
| 主グリッド | 1時間 | 時刻ラベルと太線 |
| 補助グリッド（標準） | 30分 | 薄い補助線 |
| 補助グリッド（詳細） | 15分 | ズーム時に表示 |

**ConflictViewModel（制約違反表示）**

- 同一メンバーの時間帯重複 → 配置ブロックを赤ハイライト
- スキル不足（役割が要求するスキルを持たない） → 配置ブロックに警告アイコン
- 参加可能時間外の配置 → 配置ブロックをオレンジハイライト
- 役割の必要人数不足 → 役割ヘッダーに不足数バッジ

実装は`gakkai-shift-model`の`computeConstraintViolations`を拡張して流用する。

### F-3: 配置理由の記録・引き継ぎ（重点機能）

「思考の消失」という本質課題を解決する中核機能。配置操作のたびに理由を記録し、担当者交代・引き継ぎ時に活用できる形式で出力する。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-3-1 | 配置時に理由カテゴリ（5種）＋自由記述を記録（配置操作と同一UIで完結） | Must |
| F-3-2 | 配置ブロックへのカーソル/タップで理由をポップオーバー表示 | Must |
| F-3-3 | 配置理由の一覧ビュー（引き継ぎドキュメント代替として活用可能） | Must |
| F-3-4 | 理由のカテゴリ・メンバー・役割によるフィルタリングと検索 | Should |
| F-3-5 | 理由の変更履歴（誰がいつどのように変更したか） | Could |

**理由入力UIの仕様**

配置ブロックを配置または既存ブロックをクリックした際に、インラインパネルまたはモーダルで表示。

```
┌─────────────────────────────────────┐
│ 配置理由を記録                         │
│                                     │
│ カテゴリ:                             │
│  ◉ スキル適合   ○ 育成目的            │
│  ○ 相性考慮    ○ 空き時間調整         │
│  ○ その他                            │
│                                     │
│ 詳細メモ（任意）:                      │
│  ┌─────────────────────────────┐    │
│  │ PC操作に慣れており、受付業務   │    │
│  │ でのトラブル対応が期待できる   │    │
│  └─────────────────────────────┘    │
│                                     │
│ 記録者: [田中花子]         [保存]     │
└─────────────────────────────────────┘
```

### F-4: Bubbles統合（プロパティパネル）

Bublysのバブル型UIとの統合により、関連情報を辿りながら配置作業を進められるようにする。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-4-1 | メンバーバブルタップ→詳細バブル展開（スキル・参加可能時間・現在の配置状況） | Must |
| F-4-2 | 役割バブルタップ→充足状況バブル展開（配置人数/必要人数・スキル充足率） | Must |
| F-4-3 | ポケット機能との統合（メンバーをポケットに保持してガントチャートにドロップ） | Must |
| F-4-4 | ミニガントチャート（メンバー詳細バブル内に参加可能時間帯を可視化） | Should |

### F-5: フィルタリング

多数のメンバーの中から配置候補を絞り込む機能。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-5-1 | 指定時間帯に参加可能なメンバーのみ表示 | Must |
| F-5-2 | スキル条件でフィルタリング（役割が要求するスキルを持つメンバーのみ表示） | Must |
| F-5-3 | タグでフィルタリング（部門・学年・役職等） | Must |
| F-5-4 | 配置状況によるフィルタリング（未配置/配置済み/過配置） | Should |

### F-6: シフト案管理（世界線）

複数のシナリオを並行して検討できる機能。Bublysの世界線システムと統合する。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-6-1 | 複数シフト案の並行管理（晴天用・雨天用等の独立した配置計画） | Must |
| F-6-2 | 既存シフト案のコピー・分岐作成 | Must |
| F-6-3 | シナリオラベルの付与（「晴天用」「人数削減版」「暫定案」等） | Should |
| F-6-4 | シフト案間の差分表示（どの配置が変わったかのハイライト） | Could |

### F-7: 評価・サマリー

シフト全体の品質を確認するための集計・評価機能。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-7-1 | メンバーごとの総拘束時間集計（負荷の偏り可視化） | Must |
| F-7-2 | 役割ごとの充足率（時間帯ごとの必要人数vs配置人数） | Must |
| F-7-3 | 未配置メンバー・充足不足役割のアラート一覧 | Must |
| F-7-4 | 配置スコア（`gakkai-shift-model`の`calculateOverallScore`を拡張） | Could |

### F-8: エクスポート

作成したシフトを外部で活用するための出力機能。

| ID | 要件 | 優先度 |
|----|------|--------|
| F-8-1 | スプレッドシート形式CSV出力（既存のスプレッドシート運用との互換性） | Should |
| F-8-2 | 個人向けシフト表（メンバーごとの担当時間帯・役割のみ抽出） | Could |
| F-8-3 | 配置理由一覧の出力（Markdownまたはテキスト形式の引き継ぎ資料） | Should |

---

## 第5章 非機能要件

| ID | 要件 | 目標値・実現手段 |
|----|------|----------------|
| NF-1 | 大規模データの処理 | 500メンバー × 7日 × 48スロット（15分粒度）を扱えるデータモデル設計 |
| NF-2 | ガントチャートのスクロール滑らかさ | 60fps目標。仮想スクロール（大量メンバー行の画面外レンダリングをスキップ）を検討 |
| NF-3 | フィルタリング結果の即時反映 | 100ms以内。Redux selectorのメモ化で計算をキャッシュ |
| NF-4 | スキル定義のカスタマイズ性 | `pc / zoom`等のハードコード禁止。`SkillDefinition`で動的定義 |
| NF-5 | 時間粒度の設定可能性 | 5分・10分・15分・30分・1時間から選択可能 |
| NF-6 | タブレット対応 | iPad縦・横両方向でのタッチドラッグ操作を実現 |
| NF-7 | データの永続化 | Redux Persistでlocalstorageに保存（既存アーキテクチャに従う） |
| NF-8 | 状態復元 | アプリ再起動後も編集途中のシフトが復元される |

---

## 第6章 Bublys統合仕様

### 6.1 バブルルート一覧

```
shift-puzzle/events                                                  イベント一覧
shift-puzzle/events/:eventId                                         イベント詳細
shift-puzzle/events/:eventId/members                                メンバー一覧
shift-puzzle/events/:eventId/members/filter                         フィルター設定
shift-puzzle/events/:eventId/members/:memberId                      メンバー詳細
shift-puzzle/events/:eventId/roles                                  役割一覧
shift-puzzle/events/:eventId/roles/:roleId                          役割詳細・充足状況
shift-puzzle/events/:eventId/shift-plans                            シフト案一覧
shift-puzzle/events/:eventId/shift-plans/:planId                    ガントチャート編集
shift-puzzle/events/:eventId/shift-plans/:planId/summary            充足状況サマリー
shift-puzzle/events/:eventId/shift-plans/:planId/reasons            配置理由一覧
shift-puzzle/events/:eventId/shift-plans/:planId/member/:memberId   メンバー行詳細
shift-puzzle/events/:eventId/shift-plans/:planId/role/:roleId       役割充足詳細
```

### 6.2 バブル展開の主要シナリオ

**シナリオA: メンバーカードから配置**
```
events/:id/members
  ↓ メンバーカードタップ
events/:id/members/:memberId          （スキル・参加可能時間を確認）
  ↓ 「配置する」ボタン or ポケットに追加
events/:id/shift-plans/:planId        （ガントチャートにドロップ）
  ↓ 配置理由入力
（配置完了）
```

**シナリオB: 役割充足確認から配置**
```
events/:id/shift-plans/:planId/summary
  ↓ 不足している役割をタップ
events/:id/shift-plans/:planId/role/:roleId   （必要人数・スキル要件を確認）
  ↓ 「候補メンバーを探す」
events/:id/members/filter             （スキル・時間でフィルタ）
  ↓ 候補メンバーをポケットに追加
events/:id/shift-plans/:planId        （ガントチャートにドロップ）
```

### 6.3 ポケット機能との統合

メンバー一覧バブルでメンバーをポケットに入れ、ガントチャートバブルに移動した際にポケットからドラッグ配置できる。

---

## 第7章 アーキテクチャ方針

### 7.1 ディレクトリ構成

既存の3層DDD構造に従ったディレクトリ構成。

```
shift-puzzle-model/                ← ドメイン層（純粋TypeScript、React/Redux不使用）
  member/
    Member.ts                      ← Staff_スタッフを汎用化
    MemberFilter.ts
  role/
    Role.ts                        ← Role_係を汎用化
  time/
    TimeSlot.ts
    TimeRange.ts
  assignment/
    Assignment.ts                  ← AssignmentReasonを含む
    AssignmentReason.ts            ← 新規
    ConstraintChecker.ts           ← computeConstraintViolations流用・拡張
  shift-plan/
    ShiftPlan.ts                   ← ShiftPlan_シフト案を継承・拡張
    ShiftMatcher.ts                ← ShiftMatcher_シフトマッチングを流用
    ShiftEvaluator.ts
  event/
    Event.ts                       ← 新規
    SkillDefinition.ts             ← 新規（カスタムスキル）

shift-puzzle-libs/                 ← UI + Feature層
  ui/
    GanttChart/                    ← fuzzy-session参考の新規実装
      GanttChartView.tsx           ← メインガントチャートコンテナ
      AssignmentBlock.tsx          ← 配置ブロック（ドラッグ対応）
      TimeAxis.tsx                 ← 時間軸ラベル・グリッド
      MemberRow.tsx                ← メンバー行
      ConflictHighlight.tsx        ← 制約違反ハイライト
    MemberCard/
      MemberCard.tsx
      MemberMiniGantt.tsx          ← メンバー詳細バブル内のミニガント
    ReasonPanel/                   ← 新規（配置理由UI）
      ReasonInputPanel.tsx         ← 配置理由入力フォーム
      ReasonPopover.tsx            ← カーソルオーバー時のポップオーバー
      ReasonList.tsx               ← 理由一覧ビュー
  feature/
    ShiftPlanGanttEditor.tsx       ← 主要編集画面
    MemberCollection.tsx           ← メンバー一覧・フィルタ
    ReasonListFeature.tsx          ← 配置理由一覧（引き継ぎ用）
    ShiftPlanSummary.tsx           ← 充足状況サマリー
  slice/
    shift-puzzle-slice.ts          ← イベント・メンバー・シフト案を統合

shift-puzzle-app/                  ← Bubly定義
  bubly.ts
  registration/bubbleRoutes.tsx
```

### 7.2 設計原則

**ドメイン層の純粋性**

ドメインクラスはReact・Reduxに依存せず、`state`オブジェクトを介して状態を管理し、更新時に新しいインスタンスを返す（不変性）。

```typescript
class Member {
  constructor(readonly state: MemberState) {}

  addSkill(skillId: string): Member {
    return new Member({
      ...this.state,
      skills: [...this.state.skills, skillId],
    });
  }
}
```

**配置理由は省略不可**

`Assignment`ドメインモデルは`reason`フィールドを必須とし、ドメイン層で「理由なし配置」を型レベルで防止する。

```typescript
class Assignment {
  constructor(readonly state: AssignmentState) {
    // AssignmentState.reason は必須フィールド
  }
}
```

**制約チェックの一元管理**

`gakkai-shift-model`の`computeConstraintViolations`を拡張し、全ての制約チェックを`ConstraintChecker`ドメインクラスで一元管理。UIはこの結果を受け取って表示するのみ。

---

## 第8章 gakkai-shift-bublyとの差分整理

### 8.1 機能差分

| 項目 | gakkai-shift-bubly | shift-puzzle-bubly | 変更理由 |
|------|-------------------|--------------------|---------|
| イベント概念 | なし（単一学会固定） | `Event`で複数イベント管理 | 大学祭・飲食等の汎用化 |
| スキル定義 | ハードコード（pc/zoom/english） | `SkillDefinition`で動的定義 | 用途によりスキルが異なる |
| 配置理由 | なし | `AssignmentReason`必須 | 思考の消失課題を解決 |
| ガントチャート | テーブル形式（行×列） | 連続時間軸（hourPxベース） | 視覚的直感性の向上 |
| 時間粒度 | 固定 | 5分〜1時間で設定可能 | 業種ごとの慣習に対応 |
| 複数日対応 | なし | `dayIndex`で複数日対応 | 大学祭（2〜3日間）対応 |
| 汎用対象 | 学会のみ | 大学祭・学会・飲食シフト | 市場拡大 |
| メンバーメモ | なし | 内部メモフィールド追加 | 暗黙知の記録 |
| タグ管理 | なし | 複数タグでグループ管理 | 部門横断の大学祭向け |

### 8.2 継続使用するコンポーネント・ロジック

| コンポーネント/ロジック | gakkai-shiftの位置 | 再利用方針 |
|----------------------|-------------------|-----------|
| `computeConstraintViolations` | shift-model | 拡張して流用 |
| `calculateOverallScore` | shift-model | 参考にして再実装 |
| `ShiftMatcher` | shift-model | 汎用化して流用 |
| メンバーカードUI | bubly-ui | デザインパターンを流用 |
| バブルルート登録パターン | bubly.ts | 同一パターンで実装 |

---

## 第9章 開発フェーズ提案

### Phase 1（MVP）: ガントチャート配置 + 配置理由記録

**ゴール**: 1つのイベントのシフト作成と配置理由記録が完結できる状態

- [ ] ガントチャートUI（F-2-1〜F-2-7）
- [ ] 配置理由記録（F-3-1〜F-3-3）
- [ ] メンバー管理基本（F-1-1〜F-1-4）
- [ ] Bubbles統合基本（F-4-1〜F-4-3）
- [ ] 評価サマリー基本（F-7-1〜F-7-3）

**対応バブルルート**:
```
shift-puzzle/events/:eventId/shift-plans/:planId  （ガントチャート編集）
shift-puzzle/events/:eventId/members              （メンバー一覧）
shift-puzzle/events/:eventId/shift-plans/:planId/reasons  （配置理由一覧）
```

### Phase 2: フィルタリング + 世界線

**ゴール**: 大人数シフトの効率的な配置と複数シナリオ管理

- [ ] フィルタリング（F-5系）
- [ ] シフト案管理・世界線統合（F-6系）
- [ ] CSVインポート（F-1-6）
- [ ] 配置理由の検索・フィルタ（F-3-4）

### Phase 3: エクスポート + 汎用化完成

**ゴール**: 引き継ぎ資料の自動生成と外部ツールとの連携

- [ ] エクスポート（F-8系）
- [ ] ガントチャートズーム（F-2-8）
- [ ] 配置ブロックのロック（F-2-9）
- [ ] 複数日表示（F-2-10）
- [ ] 配置スコア（F-7-4）

---

## 付録A: ユースケース詳細

### UC-1: 大学祭シフト作成（プライマリユースケース）

**前提**: イベント「第72回大学祭」作成済み、メンバー150人登録済み

1. `shift-plans`バブルから「新規シフト案」を作成（シナリオ: 「晴天用」）
2. `members/filter`で「受付スキルあり・11:00〜15:00参加可能」に絞り込む
3. フィルタ結果のメンバーカードをポケットに追加
4. ガントチャートバブルに移動し、ポケットからメンバーをドラッグ配置
5. 配置時に理由を選択・記録（例: カテゴリ=スキル適合、メモ=「昨年経験者」）
6. 制約違反ハイライトを確認し、重複箇所を修正
7. `summary`バブルで全時間帯の充足率を確認
8. 「雨天用」シフト案に分岐し、屋外担当を屋内に移動

### UC-2: 引き継ぎ資料作成

1. 次年度担当者が`reasons`バブルを開く
2. 役割「受付リーダー」でフィルタリング
3. 各配置の理由一覧（「誰が・なぜ・何の役割に配置したか」）を確認
4. `F-8-3`のMarkdown出力で引き継ぎ文書を生成

---

## 付録B: 用語集

| 用語 | 定義 |
|------|------|
| シフト案 | 配置の組み合わせ一式。複数の候補案（シナリオ）を持てる |
| シナリオ | シフト案に付与するラベル（「晴天用」「雨天用」等） |
| 配置理由 | ある人をある役割・時間帯に配置した判断根拠の記録 |
| 世界線 | Bublysの並行シナリオ管理機能。シフト案の分岐管理に使用 |
| 時間粒度 | ガントチャートの最小時間単位（5分〜1時間で設定可能） |
| 充足率 | 役割ごとの「配置人数 ÷ 必要人数」の割合 |
| ポケット | Bublysの一時保持機能。メンバーを仮置きしてガントに移動する際に使用 |
| タグ | メンバーに付与するグループラベル（部門・学年・役職等） |
