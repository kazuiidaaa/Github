import { supabase } from "./supabase";
import type {
  Applicant,
  CaseRecord,
  DocumentRecord,
  DocumentStatus,
  Extraction,
  FieldKey,
  ProcedureType,
  WorkflowStatus,
} from "./types";

const BUCKET = "documents";

interface ExtractionRow {
  field_name: string;
  extracted_value: string | null;
  reviewed_value: string | null;
  confidence: number | null;
  review_status: "pending" | "confirmed";
}
interface DocumentRow {
  id: string;
  document_type: "residence_card";
  file_name: string;
  mime_type: string | null;
  storage_path: string | null;
  status: DocumentStatus;
  uploaded_at: string;
  document_extractions: ExtractionRow[];
}
interface ApplicantRow {
  legal_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  residence_status: string | null;
  residence_expiry_date: string | null;
  confirmation_status: "unconfirmed" | "confirmed";
  confirmed_at: string | null;
  confirmed_by: string | null;
}
interface CaseRow {
  id: string;
  case_name: string;
  procedure_type: ProcedureType;
  current_status: string | null;
  target_status: string | null;
  memo: string | null;
  workflow_status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  applicants: ApplicantRow | ApplicantRow[] | null;
  documents: DocumentRow[] | null;
}

function client() {
  if (!supabase) throw new Error("Supabase の接続情報が設定されていません。");
  return supabase;
}

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

let orgIdPromise: Promise<string> | null = null;

/** 所属する事務所のIDを返す。所属がなければ事務所を新規作成する。 */
function getOrgId(): Promise<string> {
  if (!orgIdPromise) {
    orgIdPromise = (async () => {
      const db = client();
      const members = ok(await db.from("members").select("organization_id").limit(1));
      if (members && members.length > 0) return members[0].organization_id as string;
      return ok(await db.rpc("bootstrap_organization", { org_name: "自分の事務所" })) as string;
    })().catch((e) => {
      orgIdPromise = null;
      throw e;
    });
  }
  return orgIdPromise;
}

async function getUserId(): Promise<string> {
  const { data } = await client().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("ログインしていません。");
  return id;
}

export function reset() {
  orgIdPromise = null;
}

function toApplicant(row: ApplicantRow | ApplicantRow[] | null): Applicant {
  const a = Array.isArray(row) ? row[0] : row;
  return {
    legalName: a?.legal_name ?? "",
    nationality: a?.nationality ?? "",
    dateOfBirth: a?.date_of_birth ?? "",
    residenceStatus: a?.residence_status ?? "",
    residenceExpiryDate: a?.residence_expiry_date ?? "",
    confirmationStatus: a?.confirmation_status ?? "unconfirmed",
    confirmedAt: a?.confirmed_at ?? undefined,
    confirmedBy: a?.confirmed_by ?? undefined,
  };
}

function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    documentType: row.document_type,
    fileName: row.file_name,
    mimeType: row.mime_type ?? "",
    storagePath: row.storage_path ?? undefined,
    status: row.status,
    uploadedAt: row.uploaded_at,
    extractions: row.document_extractions.map(
      (e): Extraction => ({
        field: e.field_name as FieldKey,
        extractedValue: e.extracted_value ?? "",
        value: e.reviewed_value ?? "",
        confidence: Number(e.confidence ?? 0),
        reviewStatus: e.review_status,
      }),
    ),
  };
}

export async function loadAll(): Promise<CaseRecord[]> {
  await getOrgId();
  const rows = ok(
    await client()
      .from("cases")
      .select("*, applicants(*), documents(*, document_extractions(*))")
      .order("updated_at", { ascending: false }),
  ) as CaseRow[];
  return rows.map((r) => ({
    id: r.id,
    caseName: r.case_name,
    procedureType: r.procedure_type,
    currentStatus: r.current_status ?? "",
    targetStatus: r.target_status ?? "",
    memo: r.memo ?? "",
    workflowStatus: r.workflow_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    applicant: toApplicant(r.applicants),
    documents: (r.documents ?? []).map(toDocument),
  }));
}

export async function persistCase(c: CaseRecord): Promise<void> {
  const db = client();
  const org = await getOrgId();
  const uid = await getUserId();

  ok(
    await db.from("cases").upsert({
      id: c.id,
      organization_id: org,
      case_name: c.caseName,
      procedure_type: c.procedureType,
      current_status: c.currentStatus || null,
      target_status: c.targetStatus || null,
      memo: c.memo || null,
      workflow_status: c.workflowStatus,
      created_by: uid,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }),
  );

  const a = c.applicant;
  ok(
    await db.from("applicants").upsert({
      case_id: c.id,
      organization_id: org,
      legal_name: a.legalName || null,
      nationality: a.nationality || null,
      date_of_birth: a.dateOfBirth || null,
      residence_status: a.residenceStatus || null,
      residence_expiry_date: a.residenceExpiryDate || null,
      confirmation_status: a.confirmationStatus,
      confirmed_at: a.confirmedAt ?? null,
      confirmed_by: a.confirmedBy ?? null,
    }),
  );

  // 差し替えられた書類を削除する（関連する抽出結果と保存ファイルも対象）
  const existing = ok(await db.from("documents").select("id, storage_path").eq("case_id", c.id)) as {
    id: string;
    storage_path: string | null;
  }[];
  const keep = new Set(c.documents.map((d) => d.id));
  const removed = existing.filter((d) => !keep.has(d.id));
  if (removed.length > 0) {
    ok(await db.from("documents").delete().in("id", removed.map((d) => d.id)));
    const paths = removed.map((d) => d.storage_path).filter((p): p is string => Boolean(p));
    if (paths.length > 0) await db.storage.from(BUCKET).remove(paths);
  }

  for (const d of c.documents) {
    ok(
      await db.from("documents").upsert({
        id: d.id,
        case_id: c.id,
        organization_id: org,
        document_type: d.documentType,
        file_name: d.fileName,
        mime_type: d.mimeType || null,
        storage_path: d.storagePath ?? null,
        status: d.status,
        uploaded_at: d.uploadedAt,
      }),
    );
    if (d.extractions.length > 0) {
      ok(
        await db.from("document_extractions").upsert(
          d.extractions.map((e) => ({
            document_id: d.id,
            organization_id: org,
            field_name: e.field,
            extracted_value: e.extractedValue,
            reviewed_value: e.value,
            confidence: e.confidence,
            review_status: e.reviewStatus,
          })),
          { onConflict: "document_id,field_name" },
        ),
      );
    }
  }
}

export async function deleteCase(id: string): Promise<void> {
  const db = client();
  const docs = ok(await db.from("documents").select("storage_path").eq("case_id", id)) as {
    storage_path: string | null;
  }[];
  const paths = docs.map((d) => d.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length > 0) await db.storage.from(BUCKET).remove(paths);
  ok(await db.from("cases").delete().eq("id", id));
}

export async function audit(caseId: string, action: string, detail?: Record<string, unknown>) {
  const db = client();
  ok(
    await db.from("audit_logs").insert({
      organization_id: await getOrgId(),
      case_id: caseId,
      user_id: await getUserId(),
      action,
      detail: detail ?? null,
    }),
  );
}

export async function uploadFile(caseId: string, docId: string, file: File): Promise<string> {
  const db = client();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const path = `${await getOrgId()}/${caseId}/${docId}${ext ? "." + ext : ""}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) throw new Error(error?.message ?? "署名付きURLを取得できません。");
  return data.signedUrl;
}
