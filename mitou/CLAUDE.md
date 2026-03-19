# mitou フォルダ固有のガイダンス

## ビルド

```bash
./build.sh              # sections/*.md を結合して HTML を生成
./build.sh --watch      # ファイル監視 + ブラウザ自動リロード
```

## ファイル構成

- `outline/input-outline.txt` — 石井の思考・アイデアを入力したもの（インプット）
- `outline/resulting-outline.txt` — 生成されたMDの構造をまとめたもの（アウトプット）
- `sections/00-header.md` 〜 `sections/09-*.md` — セクションごとのMarkdown
- `style.css` — template.docx準拠の印刷用CSS
- `build.sh` — pandocによるMD→HTML変換スクリプト

## 運用ルール

- **構成・章立ての変更**: input-outline を編集 → Claude Code に MD 再構成を依頼
- **文章の加筆・修正**: sections/ の MD を直接編集
- input-outline → MD は一方向。MD側の手作業の変更を保護するため、input-outlineから再生成する際はMD側の変更を確認してから行うこと
- MDを更新したら、resulting-outline も更新して現在のMDの構造を反映させること
