# mitou フォルダ固有のガイダンス

## ビルド

```bash
./build.sh              # sections/*.md を結合して HTML を生成
./build.sh --watch      # ファイル監視 + ブラウザ自動リロード
```

## ファイル構成

- `outline/outline.txt` — 提案書全体の構成・章立て
- `sections/00-header.md` 〜 `sections/09-*.md` — セクションごとのMarkdown
- `style.css` — template.docx準拠の印刷用CSS
- `build.sh` — pandocによるMD→HTML変換スクリプト

## 運用ルール

- **構成・章立ての変更**: outline.txt を編集 → Claude Code に MD 再構成を依頼
- **文章の加筆・修正**: sections/ の MD を直接編集
- outline → MD は一方向。MD側の手作業の変更を保護するため、outlineから再生成する際はMD側の変更を確認してから行うこと
