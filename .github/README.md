# Claude × GitHub 機能マニュアル

このリポジトリでは **GitHub Actions** と **GitHub MCP** を活用してClaude AIとシームレスに連携できます。

---

## 目次

1. [GitHub Actions：PR自動コードレビュー](#1-github-actionsprコードレビュー自動化)
2. [GitHub Actions：`@claude` メンションで対話](#2-github-actionsclaudeメンションアシスタント)
3. [GitHub MCP：ローカルのClaude Codeから直接操作](#3-github-mcpローカルのclaude-codeから直接操作)
4. [初期セットアップ](#4-初期セットアップ)

---

## 1. GitHub Actions：PRコードレビュー自動化

**ファイル:** `.github/workflows/claude-code-review.yml`

### 動作タイミング

PRが以下の状態になると自動的にClaudeがコードレビューを実行します。

| イベント | 説明 |
|---|---|
| `opened` | PRが新規作成されたとき |
| `synchronize` | PRに新しいコミットがpushされたとき |
| `ready_for_review` | ドラフトPRがレビュー可能になったとき |
| `reopened` | クローズされたPRが再オープンされたとき |

### レビュー内容

Claudeは以下の観点でコードを自動レビューし、PRにコメントを投稿します。

- コードの品質・可読性
- バグや潜在的な問題点
- アーキテクチャ・設計上の懸念
- セキュリティ上のリスク
- テストの網羅性

### 使い方

操作は不要です。PRを作成・更新するだけで自動的にレビューが始まります。

```
あなた: PRを作成 or コミットをpush
  ↓
GitHub Actions が自動起動
  ↓
Claudeがコードを解析
  ↓
PRにレビューコメントが投稿される
```

---

## 2. GitHub Actions：`@claude` メンションアシスタント

**ファイル:** `.github/workflows/claude.yml`

IssueやPRのコメントで `@claude` とメンションするだけで、Claudeが応答・作業を実行します。

### 対応イベント一覧

| 場所 | 使い方 | 例 |
|---|---|---|
| Issueのコメント | コメントに `@claude` を含める | `@claude このバグの原因を調査して` |
| PRのレビューコメント | コメントに `@claude` を含める | `@claude ここをリファクタリングしてPRを更新して` |
| PRのレビュー本文 | レビュー本文に `@claude` を含める | `@claude このPRを承認する前に修正すべき点を教えて` |
| Issue本文・タイトル | 作成時またはアサイン時に `@claude` を含める | タイトル: `@claude バグ修正: ログインが失敗する` |

### 具体的な使用例

#### Issue でバグ調査を依頼する

```
Issueコメント:
@claude `useSelector` が再レンダリングを引き起こしているか調査して、
原因と修正案を教えてください。
```

#### PRで修正を依頼する

```
PRレビューコメント（特定の行に対して）:
@claude この関数をドメインモデルの不変性パターンに合わせてリファクタリングして、
PRを更新してください。
```

#### CI結果を踏まえたデバッグ依頼

Claudeはテストの実行結果（CIログ）も読み取れるため、以下のように依頼できます。

```
Issueコメント:
@claude CIが失敗しています。エラーログを確認して原因と修正方法を教えてください。
```

### 注意事項

- `@claude` メンションは **IssueとPRのコメント欄** で機能します
- 1回のメンションに対して1回応答します（継続会話ではなくスポット依頼向け）
- 応答にはしばらく時間がかかります（通常1〜3分）

---

## 3. GitHub MCP：ローカルのClaude Codeから直接操作

**Claude Code（ローカルCLI）** にGitHub MCPサーバーを接続すると、コーディング中にClaudeが直接GitHubを操作できます。

### 利用可能な操作

#### Issue 操作

```
# 例：Claudeへの依頼文
「バグ報告のIssueを作成して。タイトルは『ログインフォームのバリデーションが機能しない』、
内容は再現手順と期待される動作を含めて」

「未解決のIssueを一覧で見せて」

「Issue #42 にコメントを追加して。内容は調査結果のまとめ」
```

#### PR 操作

```
# 例：Claudeへの依頼文
「現在のブランチでPRを作成して。ベースはmain、タイトルと説明は変更内容から自動生成して」

「PR #15 の差分ファイル一覧を見せて」

「PR #15 にレビューコメントを追加して」

「PR #15 をsquashマージして」
```

#### ブランチ・コミット操作

```
# 例：Claudeへの依頼文
「feature/new-feature というブランチをmainから作成して」

「mainブランチの最近のコミット履歴を見せて」
```

#### ファイル操作

```
# 例：Claudeへの依頼文
「リポジトリのsrc/app/page.tsx の内容を取得して」

「このコードをGitHubリポジトリのbugfix/loginブランチにpushして」
```

### ローカルでの典型的なワークフロー

```
1. Claude Codeで機能を実装・バグを修正

2. 「現在の変更でPRを作成して」と依頼
   → Claudeが差分を見てPRタイトル・説明を自動生成してPRを作成

3. レビュー指摘が来たら「PR #XX のコメントを確認して修正して」と依頼

4. 「PR #XX をマージして」と依頼
```

---

## 4. 初期セットアップ

### GitHub Actionsのセットアップ

Actionsが動作するには、リポジトリのシークレットに以下を登録する必要があります。

1. GitHub リポジトリの **Settings > Secrets and variables > Actions** を開く
2. `CLAUDE_CODE_OAUTH_TOKEN` を追加する（Claude Code の OAuth トークン）

### GitHub MCPのセットアップ

ローカルの Claude Code で GitHub MCP を有効にするには、`~/.claude/settings.json` または プロジェクトの `.claude/settings.json` に以下を追加します。

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-github-pat>"
      }
    }
  }
}
```

GitHub Personal Access Token（PAT）は以下の権限で作成してください。

| 権限 | 用途 |
|---|---|
| `repo` | リポジトリのRead/Write |
| `issues` | Issue の作成・更新 |
| `pull_requests` | PR の作成・レビュー・マージ |

---

## 関連ワークフローファイル

| ファイル | 機能 |
|---|---|
| `.github/workflows/claude-code-review.yml` | PR自動コードレビュー |
| `.github/workflows/claude.yml` | `@claude` メンションアシスタント |
