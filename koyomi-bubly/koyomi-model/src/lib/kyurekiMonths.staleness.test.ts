/**
 * 旧暦の月の表（kyurekiMonths.ts）は生成物。手で直していないこと、スクリプトと食い違っていないことを見張る。
 * 落ちたら生成し直す:
 *   node koyomi-bubly/tools/generate-kyureki.mjs 2020 2032 > koyomi-bubly/koyomi-model/src/lib/kyurekiMonths.ts
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

describe('旧暦の月の表', () => {
  test('スクリプトで作り直したものと一致する', () => {
    const generated = execFileSync(
      'node',
      [here('../../../tools/generate-kyureki.mjs'), '2020', '2032'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    expect(readFileSync(here('./kyurekiMonths.ts'), 'utf8')).toBe(generated);
  });
});
