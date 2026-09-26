/**
 * ★ **Next の設定は、そのまま並べる。**
 *
 *   前は `.eslintrc` 形式との橋渡し（`FlatCompat`）を通していたが、
 *   `eslint-config-next` は 16 でいまの形（flat config）の配列をそのまま出すようになった。
 *   橋を通すと中で検査に落ち、しかもその失敗を印字する所で
 *   `TypeError: Converting circular structure to JSON` になって**本当の理由が出ない**
 *   ── この画面は 1 ファイルも検査されないまま緑にも赤にもならなかった（実測で踏んだ）。
 *
 * ★ `core-web-vitals` は素の `next` を含んでいるので、並べるのはこちらだけでよい
 *   （中身は `next` / `next/typescript` / `next/core-web-vitals`）。
 */
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

/**
 * ★ **`react-hooks` は重ねない。**
 *   共通の設定（`eslint.config.mjs`）は lib のために自分の版を配っているが、
 *   この画面では Next が**新しい版を同じ名前で**配る。両方置くと
 *   `Cannot redefine plugin "react-hooks"` で**設定ごと死ぬ**（実測で踏んだ）。
 *   配るのは Next の版に任せ、共通側からは**名前だけ**外す ── 決まり
 *   （`rules-of-hooks` など）はそのまま効く。
 */
const baseWithoutReactHooks = baseConfig.map((c) =>
  c.plugins?.['react-hooks']
    ? {
        ...c,
        plugins: Object.fromEntries(
          Object.entries(c.plugins).filter(([name]) => name !== 'react-hooks'),
        ),
      }
    : c,
);

export default [
  ...nextCoreWebVitals,
  ...baseWithoutReactHooks,
  ...nx.configs['flat/react-typescript'],
  {
    ignores: ['.next/**/*', '**/out-tsc'],
  },
];
