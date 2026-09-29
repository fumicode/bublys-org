"use client";
/**
 * ★ **住所を受けるのは optional catch-all（`[[...slug]]`）。**
 *   世界線は現在地をブラウザの住所に書く（`/universe@<節>`）ので、`page.tsx` のままだと
 *   **そこで読み直した瞬間に 404** になる。`[[...slug]]` は `/` そのものにも当たるので、
 *   入口の url は変わらない（OS と、単体で開く囲碁が同じ形）。
 */
import { FocusedObjectProvider } from "@bublys-org/bubbles-ui";
import { DomainRegistryProvider } from "@bublys-org/domain-registry";
import { TravelSea } from "../space/TravelSea";
import { TRAVEL_DOMAIN_REGISTRY } from "../space/domainRegistry";

export default function Index() {
  /**
   * ★ **`FocusedObjectProvider` がこの 3 つを繋ぐ。** 旅程で予定を指すと地図のピンと
   *   アクティビティの札が同時に光るのは、3 つが**同じこの 1 つの入れ物**を見ているから。
   *   バブリごとに「選択中」を持たせると、どれが本当の焦点か誰にも言えなくなる。
   * ★ `DomainRegistryProvider` は世界線が読み戻すのに要る ── 無いと過去の節へ
   *   移ろうとした所で落ちる。
   */
  return (
    <FocusedObjectProvider>
      <DomainRegistryProvider registry={TRAVEL_DOMAIN_REGISTRY}>
        <TravelSea />
      </DomainRegistryProvider>
    </FocusedObjectProvider>
  );
}
