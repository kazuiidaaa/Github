"use client";

import { useParams } from "next/navigation";
import { LoadingNotice } from "@/components/LoadingNotice";
import { LoadingSpinner } from "@/components/mobile/LoadingSpinner";
import { MobileCaseDetail, MobileCaseNotFound } from "@/components/MobileCaseDetail";
import { useCase, useStoreError, useStoreLoaded } from "@/lib/store";

/** 案件詳細（iPhone 版）。データは PC 版と同じ lib/store.ts のフックから読む（閲覧のみ） */
export default function MobileCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const record = useCase(id);
  const loaded = useStoreLoaded();
  const error = useStoreError();
  if (!record) {
    return loaded ? (
      <MobileCaseNotFound />
    ) : (
      // 読み込み中は小さなスピナー（動きを減らす設定では静止）。失敗したときは、再読み込みの案内を出す
      <div className="px-4 pt-4">{error ? <LoadingNotice /> : <LoadingSpinner />}</div>
    );
  }
  return <MobileCaseDetail record={record} />;
}
