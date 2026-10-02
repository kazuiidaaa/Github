"use client";

import { useStoreError } from "@/lib/store";

export function StoreErrorBanner() {
  const error = useStoreError();
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
      {error}
    </p>
  );
}
