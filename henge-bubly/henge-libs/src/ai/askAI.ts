/**
 * **AI を呼ぶ口（呼ぶ側）。**
 *
 * ここから先が AI。ゲームのどこからも、この 1 本だけを通して呼ぶ。
 * 送り先が変わっても（dev サーバーの中継 / 別のサーバー / 別の提供元）、
 * 直すのはこのファイルだけで済むようにしてある。
 *
 * ★ API キーはここに出てこない。中継の向こう側にある。
 */

/** 送り先。既定は dev サーバーが生やしている中継 */
let endpoint = "/api/ai";

/** 送り先を差し替える（別オリジンの OS に載せるときなど） */
export function setAIEndpoint(url: string): void {
  endpoint = url;
}

export function getAIEndpoint(): string {
  return endpoint;
}

export type AskAIRequest = {
  /** 本文。文字列でも、役割つきの配列でもよい */
  input: unknown;
  /** 役回りの指示。毎回同じことはこちらに置く */
  instructions?: string;
  /** 既定のモデルを上書きしたいときだけ */
  model?: string;
  signal?: AbortSignal;
};

export class AIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly hint?: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/** 素の文字列で返す */
export async function askAI(req: AskAIRequest): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: req.input,
      ...(req.instructions ? { instructions: req.instructions } : {}),
      ...(req.model ? { model: req.model } : {}),
    }),
    signal: req.signal,
  });

  const body = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
    hint?: string;
    detail?: string;
  };

  if (!res.ok) {
    throw new AIError(body.error ?? `AI の呼び出しに失敗しました (${res.status})`, res.status, body.hint, body.detail);
  }
  return body.text ?? "";
}

/**
 * JSON で返させる。
 *
 * ★ モデルは前後に説明やコードブロックを付けてくることがあるので、
 *   最初の `{...}` だけを拾う。
 */
export async function askAIForJson<T>(req: AskAIRequest): Promise<T> {
  const text = await askAI(req);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    throw new AIError("AI の返事を JSON として読めませんでした", undefined, undefined, text.slice(0, 300));
  }
  try {
    return JSON.parse(m[0]) as T;
  } catch (e) {
    throw new AIError("AI の返事が JSON として壊れていました", undefined, String(e), m[0].slice(0, 300));
  }
}
