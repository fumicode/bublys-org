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
      if (!tokenClientRef.current) {
        reject(new Error("Google Identity Services not loaded"));
        return;
      }
      resolveRef.current = resolve;
      rejectRef.current = reject;
      tokenClientRef.current.requestAccessToken({ prompt: "" });
    });
  }, [accessToken]);

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
