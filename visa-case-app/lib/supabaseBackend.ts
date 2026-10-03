import { normalizeFormDetails } from "./formDetails";
import type { AuditOutcome } from "./auditDetail";
import { AppError, toAppError } from "./errors";
import { storageExtension } from "./documentValidation";
import { supabase } from "./supabase";
import {
  EMPTY_APPLICANT,
  EMPTY_EMPLOYMENT,
  type Applicant,
  type CustomRequirement,
  type EmploymentInfo,
  type OrgCategory,
  type RequirementState,
  type RequirementStatus,
  type CaseRecord,
  type CheckRecord,
  type CheckStatus,
  type CheckType,
  type DocumentRecord,
  type DocumentStatus,
  type ProcedureType,
  type WorkflowStatus,
} from "./types";

const BUCKET = "documents";
const GENERATED_BUCKET = "generated-documents";

interface DocumentRow {
  id: string;
  document_type: "residence_card" | "photo";
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  status: DocumentStatus;
  uploaded_at: string;
}
interface ApplicantRow {
  legal_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  residence_status: string | null;
  residence_expiry_date: string | null;
  residence_card_number: string | null;
  work_restriction: string | null;
  confirmation_status: "draft" | "confirmed";
  confirmed_at: string | null;
  confirmed_by: string | null;
}
interface EmploymentRow {
  company_name: string | null;
  company_address: string | null;
  industry: string | null;
  capital: string | null;
  employee_count: string | null;
  category: OrgCategory | null;
  withholding_special: boolean;
  job_description: string | null;
  employment_type: string | null;
  monthly_salary: string | null;
  employment_start_date: string | null;
  contract_period: string | null;
}
interface RequirementRow {
  requirement_id: string;
  status: RequirementStatus;
  due_date: string | null;
  override: "required" | "not_required" | null;
  note: string | null;
}
interface CustomRequirementRow {
  id: string;
  name: string;
  party: "applicant" | "organization";
  is_required: boolean;
  status: RequirementStatus;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

interface CheckRow {
  check_key: string;
  check_type: CheckType;
  check_name: string;
  check_status: CheckStatus;
  note: string | null;
  checked_at: string | null;
  checked_by: string | null;
}
interface CaseRow {
  id: string;
  case_name: string;
  procedure_type: ProcedureType;
  current_status: string | null;
  target_status: string | null;
  memo: string | null;
  workflow_status: WorkflowStatus;
  planned_application_date: string | null;
  check_memo: string | null;
  created_at: string;
  updated_at: string;
  case_checks: CheckRow[] | null;
  applicants: ApplicantRow | ApplicantRow[] | null;
  employment_details: EmploymentRow | EmploymentRow[] | null;
  form_details: { data: unknown } | { data: unknown }[] | null;
  requirement_states: RequirementRow[] | null;
  custom_requirements: CustomRequirementRow[] | null;
  documents: DocumentRow[] | null;
}

function client() {
  if (!supabase) throw new AppError("接続情報が設定されていません。管理者にご確認ください。");
  return supabase;
}

function ok<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw toAppError(res.error);
  return res.data;
}

let orgIdPromise: Promise<string> | null = null;

/** 所属する事務所のIDを返す。所属がなければ事務所を新規作成する。 */
function getOrgId(): Promise<string> {
  if (!orgIdPromise) {
    orgIdPromise = (async () => {
      const db = client();
      const uid = await getUserId();
      const members = ok(await db.from("members").select("organization_id").eq("user_id", uid).limit(1));
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
  if (!id) throw new AppError("ログインしていません。");
  return id;
}

/** 確認者として記録する、ログイン中のユーザーのメールアドレス */
export async function currentUserEmail(): Promise<string> {
  const { data } = await client().auth.getSession();
  return data.session?.user.email ?? "";
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
    gender: a?.gender ?? "",
    address: a?.address ?? "",
    residenceStatus: a?.residence_status ?? "",
    residenceExpiryDate: a?.residence_expiry_date ?? "",
    residenceCardNumber: a?.residence_card_number ?? "",
    workRestriction: a?.work_restriction ?? "",
    confirmationStatus: a?.confirmation_status ?? EMPTY_APPLICANT.confirmationStatus,
    confirmedAt: a?.confirmed_at ?? undefined,
    confirmedBy: a?.confirmed_by ?? undefined,
  };
}

function toEmployment(row: EmploymentRow | EmploymentRow[] | null): EmploymentInfo {
  const e = Array.isArray(row) ? row[0] : row;
  if (!e) return { ...EMPTY_EMPLOYMENT };
  return {
    companyName: e.company_name ?? "",
    companyAddress: e.company_address ?? "",
    industry: e.industry ?? "",
    capital: e.capital ?? "",
    employeeCount: e.employee_count ?? "",
    category: e.category ?? "",
    withholdingSpecial: e.withholding_special,
    jobDescription: e.job_description ?? "",
    employmentType: e.employment_type ?? "",
    monthlySalary: e.monthly_salary ?? "",
    employmentStartDate: e.employment_start_date ?? "",
    contractPeriod: e.contract_period ?? "",
  };
}

function toRequirementStates(rows: RequirementRow[] | null): Record<string, RequirementState> {
  const out: Record<string, RequirementState> = {};
  for (const r of rows ?? []) {
    out[r.requirement_id] = {
      status: r.status,
      dueDate: r.due_date ?? undefined,
      override: r.override ?? undefined,
      note: r.note ?? undefined,
    };
  }
  return out;
}

function toCustomRequirements(rows: CustomRequirementRow[] | null): CustomRequirement[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      name: r.name,
      party: r.party,
      isRequired: r.is_required,
      status: r.status,
      dueDate: r.due_date ?? undefined,
      note: r.note ?? undefined,
    }));
}

function toChecks(rows: CheckRow[] | null): CheckRecord[] {
  return (rows ?? []).map((r) => ({
    key: r.check_key,
    type: r.check_type,
    name: r.check_name,
    status: r.check_status,
    note: r.note ?? "",
    checkedAt: r.checked_at ?? undefined,
    checkedBy: r.checked_by ?? undefined,
  }));
}

function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    documentType: row.document_type,
    fileName: row.file_name,
    mimeType: row.mime_type ?? "",
    fileSize: row.file_size ?? undefined,
    storagePath: row.storage_path ?? undefined,
    status: row.status,
    uploadedAt: row.uploaded_at,
  };
}

export async function loadAll(): Promise<CaseRecord[]> {
  await getOrgId();
  const rows = ok(
    await client()
      .from("cases")
      // 0009 で (case_id, organization_id) の外部キーが加わり、結びつきが2通りになったため、case_id のものを明示する
      .select(
        "*, applicants!applicants_case_id_fkey(*), employment_details!employment_details_case_id_fkey(*), form_details(*), requirement_states!requirement_states_case_id_fkey(*), custom_requirements!custom_requirements_case_id_fkey(*), case_checks!case_checks_case_id_fkey(*), documents!documents_case_id_fkey(*)",
      )
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
    employment: toEmployment(r.employment_details),
    formDetails: normalizeFormDetails((Array.isArray(r.form_details) ? r.form_details[0] : r.form_details)?.data),
    requirementStates: toRequirementStates(r.requirement_states),
    customRequirements: toCustomRequirements(r.custom_requirements),
    plannedApplicationDate: r.planned_application_date ?? "",
    checkMemo: r.check_memo ?? "",
    checks: toChecks(r.case_checks),
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
      planned_application_date: c.plannedApplicationDate || null,
      check_memo: c.checkMemo || null,
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
      gender: a.gender || null,
      address: a.address || null,
      residence_status: a.residenceStatus || null,
      residence_expiry_date: a.residenceExpiryDate || null,
      residence_card_number: a.residenceCardNumber || null,
      work_restriction: a.workRestriction || null,
      confirmation_status: a.confirmationStatus,
      confirmed_at: a.confirmedAt ?? null,
      confirmed_by: a.confirmedBy ?? null,
      updated_at: c.updatedAt,
    }),
  );

  const emp = c.employment;
  ok(
    await db.from("employment_details").upsert({
      case_id: c.id,
      organization_id: org,
      company_name: emp.companyName || null,
      company_address: emp.companyAddress || null,
      industry: emp.industry || null,
      capital: emp.capital || null,
      employee_count: emp.employeeCount || null,
      category: emp.category || null,
      withholding_special: emp.withholdingSpecial,
      job_description: emp.jobDescription || null,
      employment_type: emp.employmentType || null,
      monthly_salary: emp.monthlySalary || null,
      employment_start_date: emp.employmentStartDate || null,
      contract_period: emp.contractPeriod || null,
    }),
  );

  ok(
    await db.from("form_details").upsert({
      case_id: c.id,
      organization_id: org,
      data: c.formDetails,
      updated_at: c.updatedAt,
    }),
  );

  const stateIds = Object.keys(c.requirementStates);
  const existingStates = ok(await db.from("requirement_states").select("requirement_id").eq("case_id", c.id)) as {
    requirement_id: string;
  }[];
  const staleStates = existingStates.map((r) => r.requirement_id).filter((rid) => !stateIds.includes(rid));
  if (staleStates.length > 0) {
    ok(await db.from("requirement_states").delete().eq("case_id", c.id).in("requirement_id", staleStates));
  }
  if (stateIds.length > 0) {
    ok(
      await db.from("requirement_states").upsert(
        stateIds.map((rid) => ({
          case_id: c.id,
          organization_id: org,
          requirement_id: rid,
          status: c.requirementStates[rid].status,
          due_date: c.requirementStates[rid].dueDate || null,
          override: c.requirementStates[rid].override ?? null,
          note: c.requirementStates[rid].note || null,
          updated_at: c.updatedAt,
        })),
      ),
    );
  }

  const customIds = c.customRequirements.map((r) => r.id);
  const existingCustom = ok(await db.from("custom_requirements").select("id").eq("case_id", c.id)) as { id: string }[];
  const staleCustom = existingCustom.map((r) => r.id).filter((id) => !customIds.includes(id));
  if (staleCustom.length > 0) {
    ok(await db.from("custom_requirements").delete().eq("case_id", c.id).in("id", staleCustom));
  }
  if (c.customRequirements.length > 0) {
    ok(
      await db.from("custom_requirements").upsert(
        c.customRequirements.map((r) => ({
          id: r.id,
          case_id: c.id,
          organization_id: org,
          name: r.name,
          party: r.party,
          is_required: r.isRequired,
          status: r.status,
          due_date: r.dueDate || null,
          note: r.note || null,
        })),
      ),
    );
  }

  const checkKeys = c.checks.map((k) => k.key);
  const existingChecks = ok(await db.from("case_checks").select("check_key").eq("case_id", c.id)) as {
    check_key: string;
  }[];
  const staleChecks = existingChecks.map((r) => r.check_key).filter((k) => !checkKeys.includes(k));
  if (staleChecks.length > 0) {
    ok(await db.from("case_checks").delete().eq("case_id", c.id).in("check_key", staleChecks));
  }
  if (c.checks.length > 0) {
    ok(
      await db.from("case_checks").upsert(
        c.checks.map((k) => ({
          case_id: c.id,
          organization_id: org,
          check_type: k.type,
          check_key: k.key,
          check_name: k.name,
          check_status: k.status,
          note: k.note || null,
          checked_at: k.checkedAt ?? null,
          checked_by: k.checkedBy === "self" ? uid : (k.checkedBy ?? null),
          updated_at: c.updatedAt,
        })),
        { onConflict: "case_id,check_key" },
      ),
    );
  }

  // 差し替えられた書類を削除する（保存ファイルも対象）
  const existing = ok(await db.from("documents").select("id, storage_path").eq("case_id", c.id)) as {
    id: string;
    storage_path: string | null;
  }[];
  const keep = new Set(c.documents.map((d) => d.id));
  const removed = existing.filter((d) => !keep.has(d.id));
  if (removed.length > 0) {
    const paths = removed.map((d) => d.storage_path).filter((p): p is string => Boolean(p));
    await removeFiles(db, paths);
    ok(await db.from("documents").delete().in("id", removed.map((d) => d.id)));
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
        file_size: d.fileSize ?? null,
        storage_path: d.storagePath ?? null,
        status: d.status,
        uploaded_at: d.uploadedAt,
        updated_at: c.updatedAt,
      }),
    );
  }
}

async function removeFiles(db: ReturnType<typeof client>, paths: string[], bucket = BUCKET): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await db.storage.from(bucket).remove(paths);
  if (error) throw toAppError(error, "ファイルを削除できませんでした。データは削除していません。時間をおいて再度お試しください。");
}

export async function deleteCase(id: string): Promise<void> {
  const db = client();
  const docs = ok(await db.from("documents").select("storage_path").eq("case_id", id)) as {
    storage_path: string | null;
  }[];
  const paths = docs.map((d) => d.storage_path).filter((p): p is string => Boolean(p));
  // ファイルを削除できなかった場合は、DB の行を残す（保存先が分からなくなり、ファイルが残り続けることを防ぐ）
  await removeFiles(db, paths);
  // 生成したWord・PDFにも個人情報が含まれるため、案件の削除と一緒に削除する（行は案件の削除で連鎖して消える）
  const generated = ok(await db.from("generated_documents").select("storage_path").eq("case_id", id)) as {
    storage_path: string | null;
  }[];
  await removeFiles(
    db,
    generated.map((d) => d.storage_path).filter((p): p is string => Boolean(p)),
    GENERATED_BUCKET,
  );
  ok(await db.from("cases").delete().eq("id", id));
}

export async function audit(
  caseId: string | null,
  action: string,
  detail?: Record<string, unknown>,
  outcome: AuditOutcome = "success",
) {
  const db = client();
  ok(
    await db.from("audit_logs").insert({
      organization_id: await getOrgId(),
      case_id: caseId,
      user_id: await getUserId(),
      action,
      detail: detail ?? null,
      outcome,
    }),
  );
}

export async function uploadFile(caseId: string, docId: string, file: File): Promise<string> {
  const db = client();
  const path = `${await getOrgId()}/${caseId}/${docId}.${storageExtension(file.type)}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw toAppError(error, "ファイルを保存できませんでした。");
  return path;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) throw toAppError(error ?? {}, "ファイルを表示できませんでした。");
  return data.signedUrl;
}

export interface AccountInfo {
  email: string;
  userId: string;
  lastSignInAt: string | null;
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  caseId: string | null;
  outcome: AuditOutcome;
  createdAt: string;
}

export async function getAccount(): Promise<AccountInfo> {
  const db = client();
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  if (!user) throw new AppError("ログインしていません。");
  await getOrgId();
  const rows = ok(
    await db.from("members").select("role, organizations(name, id)").eq("user_id", user.id).limit(1),
  ) as unknown as {
    role: string;
    organizations: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  const org = Array.isArray(rows[0]?.organizations) ? rows[0].organizations[0] : rows[0]?.organizations;
  return {
    email: user.email ?? "",
    userId: user.id,
    lastSignInAt: user.last_sign_in_at ?? null,
    organizationId: org?.id ?? "",
    organizationName: org?.name ?? "",
    role: rows[0]?.role ?? "",
  };
}

/** 所有者のみ変更できる（データベース側の規則でも制限している） */
export async function renameOrganization(name: string): Promise<void> {
  const db = client();
  const org = await getOrgId();
  const updated = ok(await db.from("organizations").update({ name }).eq("id", org).select("id")) as { id: string }[];
  if (updated.length === 0) throw new AppError("事務所名を変更する権限がありません。");
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const rows = ok(
    await client()
      .from("audit_logs")
      .select("id, action, case_id, outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as { id: string; action: string; case_id: string | null; outcome: AuditOutcome; created_at: string }[];
  return rows.map((r) => ({ id: r.id, action: r.action, caseId: r.case_id, outcome: r.outcome, createdAt: r.created_at }));
}

export interface MemberInfo {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
}

// メンバー管理の関数が返す内部メッセージは画面に出さず、原因ごとの文言に置き換える
function memberError(e: { message?: string; code?: string }): AppError {
  const m = e.message ?? "";
  if (/last owner/i.test(m)) return new AppError("最後の所有者は、降格または削除できません。");
  if (/forbidden/i.test(m)) return new AppError("この操作を行う権限がありません。");
  if (/cannot add member/i.test(m)) {
    return new AppError("追加できません。メールアドレスと、相手のアカウントの状態をご確認ください。");
  }
  if (/not found/i.test(m)) return new AppError("対象のメンバーが見つかりません。");
  return toAppError(e);
}

/** owner / admin のみ。メールアドレスを含むため、権限のない場合は拒否される */
export async function listMembers(): Promise<MemberInfo[]> {
  const res = await client().rpc("list_members", { p_org: await getOrgId() });
  if (res.error) throw memberError(res.error);
  return ((res.data ?? []) as { user_id: string; email: string; role: string; created_at: string }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
  }));
}

export async function addMember(email: string, role: string): Promise<void> {
  const res = await client().rpc("add_member_by_email", { p_org: await getOrgId(), p_email: email, p_role: role });
  if (res.error) throw memberError(res.error);
}

export async function setMemberRole(userId: string, role: string): Promise<void> {
  const res = await client().rpc("set_member_role", { p_org: await getOrgId(), p_user: userId, p_role: role });
  if (res.error) throw memberError(res.error);
}

export async function removeMember(userId: string): Promise<void> {
  const res = await client().rpc("remove_member", { p_org: await getOrgId(), p_user: userId });
  if (res.error) throw memberError(res.error);
}
