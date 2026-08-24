/**
 * 候補集合 worker
 *
 * 「まだ決まっていないセルに入れられる値」の計算は、未定セル数 × 候補数 × 盤面全体の
 * 制約チェックになるので、main thread でやるとグリッドの操作が固まる。ここで受けて返す。
 * 詰みセルの診断（解消案の探索）はさらに重いので、同じ worker で受けるが人が求めたときだけ走る。
 *
 * 計算そのものは libs 側の computeCandidatesFor / diagnoseDeadCellFor（React に依存しない
 * エントリ）を呼ぶだけで、同期フォールバックと同じ経路を通る。
 * worker の作り方だけが bundler 依存なので app 層に置く。
 */
import {
  computeCandidatesFor,
  diagnoseDeadCellFor,
  type CandidateWorkerRequest,
  type CandidateWorkerResponse,
} from "@bublys-org/hotel-shift-puzzle-libs/candidates";

// worker のグローバル（WorkerGlobalScope）。DOM の型定義しか無いので必要な形だけ宣言する。
const ctx = globalThis as unknown as {
  onmessage: ((event: MessageEvent<CandidateWorkerRequest>) => void) | null;
  postMessage: (message: CandidateWorkerResponse) => void;
};

ctx.onmessage = (event) => {
  const message = event.data;
  if (message.kind === "diagnose") {
    ctx.postMessage({
      kind: "diagnose",
      requestId: message.requestId,
      diagnosis: diagnoseDeadCellFor(message.request, message.deadCell),
    });
    return;
  }
  ctx.postMessage({
    kind: "candidates",
    requestId: message.requestId,
    candidates: computeCandidatesFor(message.request),
  });
};
