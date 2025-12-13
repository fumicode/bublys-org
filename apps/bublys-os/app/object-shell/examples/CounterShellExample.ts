/**
 * CounterShellExample
 *
 * Counterドメインオブジェクトをオブジェクトシェルでラップする実装例
 * オブジェクトシェルの基本的な使い方を示す
 */

import { Counter } from '../../world-line/Counter/domain/Counter';
import {
  wrap,
  ObjectShellBase,
  createObjectShell,
  addReference,
  addViewReference,
} from '../domain';

/**
 * 例1: 基本的なシェルの作成と使用
 */
export function basicShellExample() {
  // Counterドメインオブジェクトを作成
  const counter = new Counter(0);

  // オブジェクトシェルでラップ
  const counterShell = wrap('counter-001', counter, 'user-001');

  console.log('Initial Counter Shell:', {
    id: counterShell.id,
    value: counterShell.domainObject.value,
    owner: counterShell.metadata.permissions.owner,
    historyLength: counterShell.history ? 1 : 0,
  });

  return counterShell;
}

/**
 * 例2: ドメインオブジェクトの更新
 */
export function updateDomainObjectExample() {
  const counterShell = basicShellExample();

  // カウントアップ操作
  const newCounter = counterShell.domainObject.countUp();
  const updatedShell = counterShell.updateDomainObject(
    newCounter,
    'countUp',
    'user-001',
    'カウンターを1増やしました'
  );

  console.log('After countUp:', {
    oldValue: counterShell.domainObject.value,
    newValue: updatedShell.domainObject.value,
    historyLength: updatedShell.history.length,
  });

  // さらにカウントアップ
  const newCounter2 = updatedShell.domainObject.countUp();
  const updatedShell2 = updatedShell.updateDomainObject(
    newCounter2,
    'countUp',
    'user-001',
    'さらにカウンターを1増やしました'
  );

  console.log('After second countUp:', {
    value: updatedShell2.domainObject.value,
    historyLength: updatedShell2.history.length,
  });

  return updatedShell2;
}

/**
 * 例3: 履歴の確認
 */
export function historyExample() {
  const counterShell = updateDomainObjectExample();

  // 履歴を配列として取得
  const history = counterShell.history;

  console.log('履歴（新しい順）:');
  history.forEach((node, index) => {
    console.log(`  [${index}] ${node.action.type} at ${new Date(node.timestamp).toISOString()}`);
    if (node.action.meta?.description) {
      console.log(`      ${node.action.meta.description}`);
    }
    if (node.action.payload) {
      console.log(`      payload:`, node.action.payload);
    }
  });

  return counterShell;
}

/**
 * 例4: View関連付け
 */
export function viewReferenceExample() {
  const counterShell = basicShellExample();

  // Viewへの関連を追加
  const metadata1 = addViewReference(counterShell.metadata, {
    viewId: 'bubble-001',
    viewType: 'bubble',
    position: { x: 100, y: 200, z: 0 },
  });

  const shellWithView1 = counterShell.updateMetadata({
    views: metadata1.views,
  });

  // 別のViewへの関連を追加
  const metadata2 = addViewReference(shellWithView1.metadata, {
    viewId: 'modal-001',
    viewType: 'modal',
  });

  const shellWithView2 = shellWithView1.updateMetadata({
    views: metadata2.views,
  });

  console.log('View関連付け:', {
    viewCount: shellWithView2.metadata.views.length,
    views: shellWithView2.metadata.views.map(v => ({
      id: v.viewId,
      type: v.viewType,
    })),
  });

  return shellWithView2;
}

/**
 * 例5: オブジェクト間の関連（ID参照）
 */
export function relationsExample() {
  // 2つのカウンターシェルを作成
  const counterShell1 = wrap('counter-001', new Counter(0), 'user-001');
  const counterShell2 = wrap('counter-002', new Counter(10), 'user-001');

  // counter-001からcounter-002への参照を追加
  const relations1 = addReference(counterShell1.relations, {
    targetId: 'counter-002',
    relationType: 'dependency',
    metadata: {
      description: 'counter-002に依存している',
    },
  });

  const shellWithRelation = counterShell1.updateRelations(relations1);

  console.log('オブジェクト関連:', {
    sourceId: shellWithRelation.id,
    references: shellWithRelation.relations.references.map(r => ({
      targetId: r.targetId,
      type: r.relationType,
    })),
  });

  return { counterShell1: shellWithRelation, counterShell2 };
}

/**
 * 例6: シリアライゼーション
 */
export function serializationExample() {
  const counterShell = updateDomainObjectExample();

  // JSON形式に変換
  const json = counterShell.toJson(
    (counter: Counter) => counter.toJson(),
    (counter: Counter) => counter.toJson()
  );

  console.log('Serialized Counter Shell:', JSON.stringify(json, null, 2));

  // JSONから復元
  const restoredShellBase = ObjectShellBase.fromJson<Counter>(
    json,
    (data: any) => Counter.fromJson(data),
    (data: any) => Counter.fromJson(data)
  );
  const restoredShell = createObjectShell(restoredShellBase);

  console.log('Restored Counter Shell:', {
    id: restoredShell.id,
    value: restoredShell.domainObject.value,
    historyLength: restoredShell.history.length,
  });

  return restoredShell;
}

/**
 * 例7: Reduxライクなアクションの使用
 */
export function actionExample() {
  const counter = new Counter(0);
  let counterShell = wrap('counter-action', counter, 'user-001');

  // アクションオブジェクトを使った更新
  const incrementAction = {
    type: 'counter/increment',
    payload: { amount: 5 },
    meta: {
      userId: 'user-001',
      description: '5ずつ増加',
    },
  };

  for (let i = 0; i < 3; i++) {
    // カウントアップ（5ずつ）
    const newCounter = new Counter(counterShell.domainObject.value + 5);
    const newShellBase = counterShell.updateDomainObjectWithAction(
      newCounter,
      incrementAction
    );
    counterShell = createObjectShell(newShellBase);
  }

  // 履歴を確認
  const history = counterShell.history;
  console.log('アクション履歴:');
  history.forEach((node, idx) => {
    console.log(`  ${idx + 1}. ${node.action.type}`);
    console.log(`      payload:`, node.action.payload);
    console.log(`      meta:`, node.action.meta);
  });

  console.log('\n最終値:', counterShell.domainObject.value);

  return counterShell;
}

/**
 * 例8: 包括的な使用例
 */
export function comprehensiveExample() {
  console.log('\n=== 包括的な例 ===\n');

  // 1. Counterを作成しシェルでラップ
  const counter = new Counter(0);
  let counterShell = wrap('counter-comprehensive', counter, 'user-001');

  // 2. View関連を追加
  const metadata = addViewReference(counterShell.metadata, {
    viewId: 'main-bubble',
    viewType: 'bubble',
    position: { x: 50, y: 50, z: 0 },
  });
  counterShell = createObjectShell(counterShell.updateMetadata({ views: metadata.views }));

  // 3. カウンター操作を繰り返す
  for (let i = 0; i < 5; i++) {
    const newCounter = counterShell.domainObject.countUp();
    counterShell = createObjectShell(counterShell.updateDomainObject(
      newCounter,
      'countUp',
      'user-001',
      `カウント ${i + 1}回目`
    ));
  }

  // 4. 履歴を確認
  const history = counterShell.history;
  console.log(`操作履歴: ${history.length}件`);
  history.forEach((node, idx) => {
    console.log(`  ${idx + 1}. ${node.action.type} - ${node.action.meta?.description || ''}`);
  });

  // 5. 最終状態
  console.log('\n最終状態:', {
    id: counterShell.id,
    value: counterShell.domainObject.value,
    views: counterShell.metadata.views.length,
    historyLength: history.length,
    owner: counterShell.metadata.permissions.owner,
  });

  // 6. シリアライズして復元
  const json = counterShell.toJson(
    (c: Counter) => c.toJson(),
    (c: Counter) => c.toJson()
  );

  const restoredBase = ObjectShellBase.fromJson<Counter>(
    json,
    (data) => Counter.fromJson(data),
    (data) => Counter.fromJson(data)
  );
  const restored = createObjectShell(restoredBase);

  console.log('\n復元後の検証:', {
    isEqual: restored.domainObject.value === counterShell.domainObject.value,
    historyPreserved: restored.history.length === history.length,
  });

  return counterShell;
}

// すべての例を実行
export function runAllExamples() {
  console.log('=== Object Shell Examples ===\n');

  console.log('1. 基本的なシェルの作成');
  basicShellExample();

  console.log('\n2. ドメインオブジェクトの更新');
  updateDomainObjectExample();

  console.log('\n3. 履歴の確認');
  historyExample();

  console.log('\n4. View関連付け');
  viewReferenceExample();

  console.log('\n5. オブジェクト間の関連');
  relationsExample();

  console.log('\n6. シリアライゼーション');
  serializationExample();

  console.log('\n7. Reduxライクなアクション');
  actionExample();

  console.log('\n8. 包括的な例');
  comprehensiveExample();

  console.log('\n=== All examples completed ===');
}
