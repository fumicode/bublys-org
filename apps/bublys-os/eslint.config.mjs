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

export default [
  ...nextCoreWebVitals,
  ...baseConfig,
  ...nx.configs['flat/react-typescript'],
  {
    ignores: ['.next/**/*', '**/out-tsc'],
  },
];
