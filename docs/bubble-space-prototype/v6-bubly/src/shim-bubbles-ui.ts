/**
 * 旧 `@bublys-org/bubbles-ui` の身代わり。
 *
 * ★ これが**検証の肝**。バブリの画面（`CsvObjectListView.tsx` など）は
 *   `import { ObjectView } from "@bublys-org/bubbles-ui"` と書いてある。
 *   この1本を、新しいライブラリの `ObjectView` へ差し替えるだけで載るかを見る。
 *   **バブリのファイルは1文字も編集しない**（build.mjs の alias でここへ向ける）。
 *
 * ここに何を足すことになったかが、そのまま「置き換えに要る口」の一覧になる。
 */
export { ObjectView } from '@bublys-org/bubble-layout-feature';
