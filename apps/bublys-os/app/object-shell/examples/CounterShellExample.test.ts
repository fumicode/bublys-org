/**
 * CounterShellExampleのテスト
 */

import { Counter } from '../../world-line/Counter/domain/Counter';
import { ObjectShell, wrap } from '../domain';

describe('CounterShellExample', () => {
  describe('basicShellExample', () => {
    it('Counterをシェルでラップできる', () => {
      const counter = new Counter(0);
      const counterShell = wrap('counter-001', counter, 'user-001');

      expect(counterShell.id).toBe('counter-001');
      expect(counterShell.domainObject.value).toBe(0);
      expect(counterShell.metadata.permissions.owner).toBe('user-001');
      expect(counterShell.history.length).toBe(0);
    });
  });

  describe('updateDomainObjectExample', () => {
    it('ドメインオブジェクトを更新すると履歴が記録される', () => {
      const counterShell = wrap('counter-001', new Counter(0), 'user-001');

      const newCounter = counterShell.domainObject.countUp();
      const updatedShell = counterShell.updateDomainObject(
        newCounter,
        'countUp',
        undefined,  // payload
        'user-001',
        'カウンターを1増やしました'
      );

      expect(updatedShell.domainObject.value).toBe(1);
      expect(updatedShell.history.length).toBe(1);

      const history = updatedShell.history;
      expect(history[0].action.type).toBe('countUp');
      expect(history[0].action.meta?.description).toBe('カウンターを1増やしました');
    });

    it('複数回の更新で履歴が蓄積される', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      for (let i = 0; i < 5; i++) {
        const newCounter = counterShell.domainObject.countUp();
        counterShell = counterShell.updateDomainObject(
          newCounter,
          'countUp',
          undefined,  // payload
          'user-001'
        );
      }

      expect(counterShell.domainObject.value).toBe(5);
      expect(counterShell.history.length).toBe(5);
    });
  });

  describe('serializationExample', () => {
    it('シリアライズと復元が正しく動作する', () => {
      let counterShell = wrap('counter-001', new Counter(0), 'user-001');

      // 複数回の操作
      for (let i = 0; i < 3; i++) {
        const newCounter = counterShell.domainObject.countUp();
        counterShell = counterShell.updateDomainObject(
          newCounter,
          'countUp',
          undefined,  // payload
          'user-001'
        );
      }

      // JSON形式に変換
      const json = counterShell.toJson(
        (counter: Counter) => counter.toJson(),
        (counter: Counter) => counter.toJson()
      );

      // JSONから復元
      const restoredShell = ObjectShell.fromJson<Counter>(
        json,
        (data: any) => Counter.fromJson(data),
        (data: any) => Counter.fromJson(data)
      );

      // 検証
      expect(restoredShell.id).toBe(counterShell.id);
      expect(restoredShell.domainObject.value).toBe(counterShell.domainObject.value);
      expect(restoredShell.history.length).toBe(
        counterShell.history.length
      );
    });
  });

  describe('immutability', () => {
    it('元のシェルは更新されない（不変性）', () => {
      const originalShell = wrap('counter-001', new Counter(0), 'user-001');
      const originalValue = originalShell.domainObject.value;

      const newCounter = originalShell.domainObject.countUp();
      const updatedShell = originalShell.updateDomainObject(
        newCounter,
        'countUp',
        undefined,  // payload
        'user-001'
      );

      // 元のシェルは変更されていない
      expect(originalShell.domainObject.value).toBe(originalValue);
      expect(originalShell.history).toBeNull();

      // 新しいシェルは更新されている
      expect(updatedShell.domainObject.value).toBe(originalValue + 1);
      expect(updatedShell.history).not.toBeNull();
    });
  });
});
