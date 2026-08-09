/**
 * 候補集合 worker
 *
 * 「まだ決まっていないセルに入れられる値」の計算は、未定セル数 × 候補数 × 盤面全体の
 * 制約チェックになるので、main thread でやるとグリッドの操作が固まる。ここで受けて返す。
 *
 * 計算そのものは libs 側の computeCandidatesFor（React に依存しないエントリ）を呼ぶだけで、
 * 同期フォールバックと同じ経路を通る。worker の作り方だけが bundler 依存なので app 層に置く。
 */
import {
  computeCandidatesFor,
  type CandidateWorkerRequest,
  type CandidateWorkerResponse,
} from "@bublys-org/hotel-shift-puzzle-libs/candidates";

// worker のグローバル（WorkerGlobalScope）。DOM の型定義しか無いので必要な形だけ宣言する。
const ctx = globalThis as unknown as {
  onmessage: ((event: MessageEvent<CandidateWorkerRequest>) => void) | null;
  postMessage: (message: CandidateWorkerResponse) => void;
};

ctx.onmessage = (event) => {
  const { requestId, request } = event.data;
  ctx.postMessage({ requestId, candidates: computeCandidatesFor(request) });
};
