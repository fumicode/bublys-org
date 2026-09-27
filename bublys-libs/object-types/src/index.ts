/**
 * **型ごとの名乗りを覚えておく所。**
 *
 * 「どんな種類のものが居るか」── 名前・アイコン・名前の解き方・掴んで運ぶときの型・
 * どこに開くか・同じものかの見分け方（class と id）。バブリが自分で名乗り、
 * 画面はここに訊く。
 *
 * ★ **`bubbles-ui` から出した。** あちらに置いていたころ、`domain-registry` が
 *   名乗りを流し込むために `bubbles-ui` を取り込んでいて、
 *   `bubbles-ui → domain-registry → bubbles-ui` の輪になっていた。
 *   いちばん下に置けば、みんな一方通行で取りに来られる。
 * ★ `bubbles-ui` は今までどおり全部を再輸出するので、使う側の import は変わらない。
 */
export * from './lib/ObjectTypeRegistry.js';
