/**
 * ShellProxy
 *
 * Proxyパターンを使って、ObjectShellBaseにドメインオブジェクトのメソッドを
 * 透過的に公開します。
 *
 * ObjectShell<T> はこのProxyでラップされた型です。
 */

import { ObjectShellBase, DomainEntity } from './ObjectShell';

/**
 * ObjectShell<T>
 * Shellとドメインオブジェクトの交差型（Facade）
 *
 * この型により、TypeScript上でShellとドメインオブジェクトの
 * 両方のメソッドが使えるように見えます。
 *
 * 内部的には ObjectShellBase<T> を Proxy でラップしています。
 */
export type ObjectShell<T extends DomainEntity> = ObjectShellBase<T> & {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R
    ? R extends T
      ? (...args: Args) => ObjectShell<T>  // ドメインオブジェクトを返すメソッド → Shellを返す
      : (...args: Args) => R                // その他 → そのまま
    : T[K];
};

/**
 * ObjectShellBaseをProxyでラップしてObjectShellを作成
 *
 * @param shell - ラップするObjectShellBase
 * @param userId - デフォルトのユーザーID（省略可能）
 * @returns ドメインオブジェクトのメソッドを持つように見えるShell
 */
export function createObjectShell<T extends DomainEntity>(
  shell: ObjectShellBase<T>,
  userId?: string
): ObjectShell<T> {
  return new Proxy(shell, {
    get(target, prop, receiver) {
      // Shellのプロパティ/メソッドを優先
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);

        // メソッドの場合はラップする
        if (typeof value === 'function') {
          return (...args: any[]) => {
            const result = value.apply(target, args);

            // 結果がObjectShellBaseなら自動でProxyラップ
            if (result instanceof ObjectShellBase) {
              return createObjectShell(result, userId);
            }

            return result;
          };
        }

        return value;
      }

      // domainObjectのプロパティ/メソッドにフォールバック
      const domainObject = target.dangerouslyGetDomainObject() as any;

      if (!(prop in domainObject)) {
        return undefined;
      }

      const domainValue = domainObject[prop];

      // メソッドの場合はラップする
      if (typeof domainValue === 'function') {
        return (...args: any[]) => {
          // ドメインメソッドを実行
          const result = domainValue.apply(domainObject, args);

          // 結果が新しいドメインオブジェクトなら自動でShellを更新（in-place）
          if (isNewDomainObject(target.dangerouslyGetDomainObject(), result)) {
            const actionType = String(prop);
            target.updateDomainObject(
              result,
              actionType,
              { args },
              userId || 'system',
              `${actionType}を実行`
            );

            // 同じProxyを返す（in-place更新なので新しいインスタンスは作らない）
            return receiver;
          }

          // プリミティブや他の値はそのまま返す
          return result;
        };
      }

      // プロパティはそのまま返す
      return domainValue;
    },

    // setもドメインオブジェクトに転送（必要なら）
    set(target, prop, value, receiver) {
      if (prop in target) {
        return Reflect.set(target, prop, value, receiver);
      }

      // domainObjectへの直接の変更は許可しない（不変性を保つ）
      console.warn(`Direct mutation of domainObject.${String(prop)} is not allowed`);
      return false;
    }
  }) as ObjectShell<T>;
}

/**
 * 値が新しいドメインオブジェクトインスタンスかどうかをチェック
 */
function isNewDomainObject<T>(original: T, value: any): value is T {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // 同じコンストラクタを持つが、異なるインスタンス
  return (
    value.constructor === (original as any).constructor &&
    value !== original
  );
}
