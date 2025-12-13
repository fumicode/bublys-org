/**
 * CounterShellExampleのテスト
 */

import { Counter } from '../../world-line/Counter/domain/Counter';
import { fromJson, wrap } from '../domain';

describe('CounterShellExample', () => {
  describe('basicShellExample', () => {
    it('Counterをシェルでラップできる', () => {
      const counter = new Counter(0);
      const counterShell = wrap('counter-001', counter, 'user-001');

      expect(counterShell.id).toBe('counter-001');
      expect(counterShell.value).toBe(0);
      expect(counterShell.metadata.permissions.owner).toBe('user-001');
      expect(counterShell.history.length).toBe(0);
    });
  });

  describe('updateDomainObjectExample', () => {
    it('ドメインオブジェクトを更新すると履歴が記録される', () => {
      const counterShell = wrap('counter-001', new Counter(0), 'user-001');

      const updatedShell = counterShell.countUp();

      expect(updatedShell.value).toBe(1);
      expect(updatedShell.history.length).toBe(1);

      const history = updatedShell.history;
      expect(history[0].action.type).toBe('countUp');
      expect(history[0].action.meta?.description).toBe('countUpを実行');
    });

    it('複数回の更新で履歴が蓄積される', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      for (let i = 0; i < 5; i++) {
        counterShell = counterShell.countUp();
      }

      expect(counterShell.value).toBe(5);
      expect(counterShell.history.length).toBe(5);
    });
  });

  describe('serializationExample', () => {
    it('シリアライズと復元が正しく動作する', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      // 複数回の操作
      for (let i = 0; i < 3; i++) {
        counterShell = counterShell.countUp();
      }

      // JSON形式に変換
      const json = counterShell.toJson(
        (counter: Counter) => counter.toJson(),
        (counter: Counter) => counter.toJson()
      );

      // JSONから復元
      const restoredShell = fromJson<Counter>(
        json,
        (data: any) => Counter.fromJson(data),
        (data: any) => Counter.fromJson(data)
      );

      // 検証
      expect(restoredShell.id).toBe(counterShell.id);
      expect(restoredShell.value).toBe(counterShell.value);
      expect(restoredShell.history.length).toBe(
        counterShell.history.length
      );
    });
  });

  describe('immutability', () => {
    it('元のシェルは更新されない（不変性）', () => {
      const originalShell = wrap('counter-001', new Counter(0), 'user-001');
      const originalValue = originalShell.value;

      const updatedShell = originalShell.countUp();

      // 元のシェルは変更されていない
      expect(originalShell.value).toBe(originalValue);
      expect(originalShell.history.length).toBe(0);

      // 新しいシェルは更新されている
      expect(updatedShell.value).toBe(originalValue + 1);
      expect(updatedShell.history.length).toBe(1);
    });
  });

  describe('helperMethods', () => {
    it('addViewReferenceでView参照を追加できる', () => {
      const counterShell = wrap('counter-001', new Counter(0), 'user-001');

      const updatedShell = counterShell.addViewReference({
        viewId: 'view-001',
        viewType: 'demo',
        position: { x: 10, y: 20, z: 0 },
      });

      expect(updatedShell.metadata.views.length).toBe(1);
      expect(updatedShell.metadata.views[0].viewId).toBe('view-001');
      expect(updatedShell.metadata.views[0].viewType).toBe('demo');
      expect(updatedShell.metadata.views[0].position).toEqual({ x: 10, y: 20, z: 0 });

      // 元のシェルは変更されていない
      expect(counterShell.metadata.views.length).toBe(0);
    });

    it('removeViewReferenceでView参照を削除できる', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      counterShell = counterShell.addViewReference({
        viewId: 'view-001',
        viewType: 'demo',
      });

      const updatedShell = counterShell.removeViewReference('view-001');

      expect(updatedShell.metadata.views.length).toBe(0);
      expect(counterShell.metadata.views.length).toBe(1);
    });

    it('addRelationで関連を追加できる', () => {
      const counterShell = wrap('counter-001', new Counter(0), 'user-001');

      const updatedShell = counterShell.addRelation({
        targetId: 'counter-002',
        relationType: 'dependency',
      });

      expect(updatedShell.relations.references.length).toBe(1);
      expect(updatedShell.relations.references[0].targetId).toBe('counter-002');
      expect(updatedShell.relations.references[0].relationType).toBe('dependency');

      // 元のシェルは変更されていない
      expect(counterShell.relations.references.length).toBe(0);
    });

    it('removeRelationで関連を削除できる', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      counterShell = counterShell.addRelation({
        targetId: 'counter-002',
        relationType: 'dependency',
      });

      const updatedShell = counterShell.removeRelation('counter-002');

      expect(updatedShell.relations.references.length).toBe(0);
      expect(counterShell.relations.references.length).toBe(1);
    });

    it('ヘルパーメソッドはメソッドチェーンが可能', () => {
      const counterShell = wrap('counter-001', new Counter(0), 'user-001');

      const updatedShell = counterShell
        .addViewReference({ viewId: 'view-001', viewType: 'demo' })
        .addRelation({ targetId: 'counter-002', relationType: 'dependency' })
        .countUp();

      expect(updatedShell.value).toBe(1);
      expect(updatedShell.metadata.views.length).toBe(1);
      expect(updatedShell.relations.references.length).toBe(1);
    });
  });
});
