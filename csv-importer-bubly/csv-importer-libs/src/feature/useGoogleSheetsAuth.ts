"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// GIS type declarations
interface TokenResponse {
  access_token: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

interface GsiClient {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }) => TokenClient;
      revoke: (token: string, callback: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GsiClient;
  }
}

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let gisLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (gisLoadPromise) return gisLoadPromise;
  if (window.google?.accounts?.oauth2) {
    gisLoadPromise = Promise.resolve();
    return gisLoadPromise;
  }

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

export type GoogleSheetsAuth = {
  accessToken: string | null;
  isSignedIn: boolean;
  requestAccess: () => Promise<string>;
  signOut: () => void;
};

export function useGoogleSheetsAuth(clientId?: string): GoogleSheetsAuth {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const tokenClientRef = useRef<TokenClient | null>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    if (!clientId) return;

    loadGisScript().then(() => {
      if (!window.google) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: TokenResponse) => {
          if (response.error) {
            rejectRef.current?.(new Error(response.error));
          } else {
            setAccessToken(response.access_token);
            resolveRef.current?.(response.access_token);
          }
          resolveRef.current = null;
          rejectRef.current = null;
        },
      });
    });
  }, [clientId]);

  const requestAccess = useCallback((): Promise<string> => {
    if (accessToken) return Promise.resolve(accessToken);

    return new Promise<string>((resolve, reject) => {
      // クライアントID 未設定と GIS ロード失敗は原因が全く違うので区別して伝える
      if (!clientId) {
        reject(
          new Error(
            "Google クライアントIDが未設定です（.env の VITE_GOOGLE_CLIENT_ID を設定してビルドし直してください）"
          )
        );
        return;
      }
      if (!tokenClientRef.current) {
        reject(new Error("Google Identity Services を読み込めませんでした"));
        return;
      }
      resolveRef.current = resolve;
      rejectRef.current = reject;
      // prompt は指定しない（既定の挙動に任せる）。
      // prompt: "" は「同意済みなら黙って通す」指定で、初回同意がまだのときに
      // 何も起きずに失敗するため使わない。
      tokenClientRef.current.requestAccessToken();
    });
  }, [accessToken, clientId]);

  const signOut = useCallback(() => {
    if (accessToken && window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
      });
    } else {
      setAccessToken(null);
    }
  }, [accessToken]);

  return {
    accessToken,
    isSignedIn: accessToken !== null,
    requestAccess,
    signOut,
  };
}
