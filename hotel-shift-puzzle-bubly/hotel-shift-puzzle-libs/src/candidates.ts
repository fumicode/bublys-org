/**
 * 候補集合の計算だけを切り出したエントリ（React に依存しない）。
 *
 * worker から読み込む用。パッケージのルート（./index.ts）は React コンポーネントを
 * 巻き込むので、worker からはこちらを import する。
 */
export * from "./feature/candidates/candidateRequest.js";
export * from "./feature/candidates/candidateWorkerProtocol.js";
