"use client";

import { useParams } from "next/navigation";
import { LoadingNotice } from "@/components/LoadingNotice";
import { MobileCaseDetail, MobileCaseNotFound } from "@/components/MobileCaseDetail";
import { useCase, useStoreLoaded } from "@/lib/store";

/** 案件詳細（iPhone 版）。データは PC 版と同じ lib/store.ts のフックから読む（閲覧のみ） */
export default function MobileCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const record = useCase(id);
  const loaded = useStoreLoaded();
  if (!record) {
    return loaded ? (
      <MobileCaseNotFound />
    ) : (
      <div className="px-4 pt-4">
        <LoadingNotice />
      </div>
    );
  }
  return <MobileCaseDetail record={record} />;
}
