import { Store } from "@bublys-org/hotel-shift-puzzle-model";
import { useObjects, useRemovedIds } from "../objects/repository.js";
import { STORE_TYPE } from "../objects/hotelObjects.js";

/**
 * storeId が指す店舗。記録が無ければホテル・暦月の店舗として読む（{@link Store.resolve}）。
 * 削除した店舗なら名前は「（削除された店舗）」、一度も記録していない店舗なら ID のまま。
 *
 * **storeId は人に見せない。見せるのは店舗の名前。** 店舗の ID は採番した UUID なので、
 * 画面に店舗を出すところはこれで引いて `name` を出す。
 */
export function useStore(storeId: string | undefined): Store | undefined {
  const stores = useObjects<Store>(STORE_TYPE);
  const removedIds = useRemovedIds(STORE_TYPE);
  return storeId === undefined ? undefined : Store.resolve(stores, storeId, removedIds);
}
