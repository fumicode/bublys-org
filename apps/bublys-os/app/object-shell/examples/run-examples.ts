#!/usr/bin/env ts-node

/**
 * オブジェクトシェルの例を実行するスクリプト
 *
 * 実行方法:
 * npx ts-node apps/bublys-os/app/object-shell/examples/run-examples.ts
 */

import { runAllExamples } from './CounterShellExample.js';

console.log('==============================================');
console.log('   オブジェクトシェル 実装例の実行');
console.log('==============================================\n');

runAllExamples();

console.log('\n==============================================');
console.log('   実行完了');
console.log('==============================================');
