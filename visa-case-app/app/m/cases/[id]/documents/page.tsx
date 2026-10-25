"use client";

import { useParams } from "next/navigation";
import { LoadingNotice } from "@/components/LoadingNotice";
import { LoadingSpinner } from "@/components/mobile/LoadingSpinner";
import { MobileCaseNotFound } from "@/components/MobileCaseDetail";
import { MobileDocuments } from "@/components/MobileDocuments";
import { useCase, useStoreError, useStoreLoaded } from "@/lib/store";

/** 書類（iPhone 版）。データは PC 版と同じ lib/store.ts・lib/documents/store.ts のフックから読む */
export default function MobileDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const record = useCase(id);
  const loaded = useStoreLoaded();
  const error = useStoreError();
  if (!record) {
    return loaded ? <MobileCaseNotFound /> : <div className="px-4 pt-4">{error ? <LoadingNotice /> : <LoadingSpinner />}</div>;
  }
  return <MobileDocuments record={record} />;
}
