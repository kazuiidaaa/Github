"use client";

import { useEffect, useState } from "react";
import { getDocumentSignedUrl } from "./store";
import type { DocumentRecord } from "./types";

/** 原本の表示用URL。Supabase 利用時は、短時間だけ有効な署名付きURLを取得する。 */
export function useDocumentUrl(doc: DocumentRecord): string | undefined {
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  const path = doc.storagePath;

  useEffect(() => {
    if (!path || doc.dataUrl) return;
    let cancelled = false;
    getDocumentSignedUrl(path)
      .then((url) => {
        if (!cancelled) setSigned({ path, url });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path, doc.dataUrl]);

  if (doc.dataUrl) return doc.dataUrl;
  return signed && signed.path === path ? signed.url : undefined;
}
