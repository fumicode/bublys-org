/**
 * bubbleUrls — このバブリの「バブル URL スキーム」を app 層で一元管理する。
 *
 * バブル URL（どの URL でどのバブルを開くか）は app（ルーティング）の関心事なので、
 * libs（domain/ui/feature）には一切持たせない。ここで:
 *   - オブジェクトの正規 URL（Site / Employee / Machine / PlacementBoard）を
 *     registerObjectUrl で登録する
 *   - ルート/サブビューの URL ビルダーを export し、bubbleRoutes や feature へ渡す
 *
 * ルートの pattern（bubbleRoutes.tsx）と URL の作り方（ここ）は対なので、同じ app 層に
 * 並べてズレないようにする。
 *
 * Stage 2〜3 で URL ビルダーと registerObjectUrl を追加する。
 */
export {};
