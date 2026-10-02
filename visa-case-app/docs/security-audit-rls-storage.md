# フェーズ7-2・7-3：RLS・Storage 監査結果

対象：`supabase/migrations/0001`〜`0008`（9＋4テーブル、`documents` バケット）。
この文書は調査結果と修正案です。R1〜R3 は `supabase/migrations/0009_security_hardening.sql` として追加し、S1 はコードへ反映済みです（いずれも **Supabase へは未適用**）。R7（`document_extractions`）は、ご判断待ちのため未対応です。

## 1. RLS 監査

### 1-1 テーブル別の状況

| テーブル | RLS | SELECT | INSERT | UPDATE | DELETE | 備考 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| organizations | 有効 | 所属者 | 不可（関数経由） | 所有者のみ | 不可 | 意図どおり |
| members | 有効 | 本人のみ | 不可 | 不可 | 不可 | 意図どおり |
| cases | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| applicants | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| documents | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| document_extractions | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | 旧OCR用。残存 |
| employment_details | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| requirement_states | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| custom_requirements | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| case_checks | 有効 | 所属者 | 所属者 | 所属者 | 所属者 | `for all` |
| generated_documents | 有効 | 所属者 | 所属者（作成者=本人） | 所属者（トリガーで制限） | 不可 | 意図的 |
| audit_logs | 有効 | 所属者 | 所属者（user_id=本人） | 不可 | 不可 | 追記専用 |

ご指示の `user_id` 方式ではなく、`organization_id` と `is_member()` による事務所単位の所有者確認です。
ご指示にあった `document_templates`、`case_requirements`、`requirement_documents` は、実装が別名（`custom_requirements` など）または未実装のため、対象外です。

### 1-2 問題一覧

| # | 重要度 | 内容 | 修正 |
| :-- | :-- | :-- | :-- |
| R1 | 高 | 子テーブル8つは、`case_id` が自事務所の案件を指すことを検証していない。ログイン済みの他事務所の利用者が、他事務所の案件IDを知っている場合、自事務所の `organization_id` で行を差し込める。`loadAll` は案件に紐づく子行を結合して読むため、他事務所の案件画面に混入し得る（案件IDはUUIDで推測は困難だが、防御は DB 側で担保すべき） | 複合外部キー `(case_id, organization_id)` を追加 |
| R2 | 中 | `anon` ロールに、テーブルへの既定の権限が付いている（RLSで拒否されるが、権限自体を残す理由がない） | `anon` の権限を取り消す |
| R3 | 中 | `guard_generated_documents()` に `search_path` が未指定（Security Advisor の警告対象） | `search_path` を固定 |
| R4 | 低 | すべてのポリシーが「所属者なら全操作可」。現状は所有者のみのため問題はないが、フェーズ10で役割（viewer等）を導入する際に再設計が必要 | 現時点では対応不要。要記録 |
| R5 | 低 | `cases.created_by` は、INSERT 時に本人と一致するかを検証していない | 任意。トリガーで補正可 |
| R6 | 低 | `is_member()` が行ごとに評価される（件数が増えると遅くなる） | 任意。ポリシーを `(select public.is_member(...))` へ書き換え |
| R7 | 要判断 | `document_extractions`（旧OCRの抽出値）が残っている。個人情報を含み得る | 不要であれば削除を推奨（データ削除のため、ご判断が必要） |
| R8 | 要判断 | `generated_documents` は DELETE 不可。案件削除時のみ連鎖削除される。保存方針の決定後に、削除の扱いを確定 | 保存方針の決定後 |

### 1-3 修正SQL（案）

```sql
-- 0009_security_hardening.sql（案・未適用）

-- ① 適用前の確認：次の各クエリが 0 件であること（0 件でなければ、不整合なデータが存在する）
--   select count(*) from public.applicants a join public.cases c on c.id = a.case_id where c.organization_id <> a.organization_id;
--   （documents / employment_details / requirement_states / custom_requirements / case_checks / generated_documents も同様）

-- R1：案件と事務所の組を、子テーブルから参照できるようにする
alter table public.cases add constraint cases_id_org_unique unique (id, organization_id);

alter table public.applicants add constraint applicants_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.documents add constraint documents_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.employment_details add constraint employment_details_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.requirement_states add constraint requirement_states_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.custom_requirements add constraint custom_requirements_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.case_checks add constraint case_checks_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.generated_documents add constraint generated_documents_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;

alter table public.documents add constraint documents_id_org_unique unique (id, organization_id);
alter table public.document_extractions add constraint document_extractions_doc_org_fk
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete cascade;

-- R2：anon に権限を残さない（ログイン前に、テーブルを直接読む必要はない）
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- R3
alter function public.guard_generated_documents() set search_path = public;
```

## 2. Storage 監査（`documents` バケット）

### 2-1 確認結果

| 項目 | 結果 |
| :-- | :-- |
| 非公開 | 適合（`public = false`、0004で再設定） |
| ファイルサイズ・MIME制限 | 適合（20MB、JPEG/PNG/PDFのみ。画面側も `documentValidation` で検証） |
| `storage.objects` のポリシー | SELECT・INSERT・DELETE を設定。UPDATE は設けず上書き不可（適合） |
| パスによるアクセス制御 | `事務所ID/案件ID/書類ID.拡張子`。SELECT・DELETE は事務所IDで制御。INSERT は案件が当該事務所のものかも確認（適合） |
| 署名付きURL | 使用（300秒）。`getPublicUrl` の使用なし（適合） |
| Service Role Key | コード内に使用なし（適合） |
| 他事務所のファイル取得 | ポリシー上は不可。実機での拒否テストが未実施（手順を3に記載） |
| `generated-documents` バケット | 存在しない。現状の生成文書はHTMLをDBに保存するため不要。Word・PDF出力の実装時に、同等のポリシーで作成すること |

前回の報告で「サイズ・MIME制限がない」としたのは、0004適用前の状態に基づくもので、現在は対応済みです。

### 2-2 問題一覧

| # | 重要度 | 内容 | 修正 |
| :-- | :-- | :-- | :-- |
| S1 | 中 | 案件削除・書類削除で `storage.remove` の失敗を確認していない（`lib/supabaseBackend.ts` の2か所）。失敗しても DB 行だけ削除され、個人情報のファイルが残り、後から特定できない | 失敗時は例外を投げ、DB行の削除を中止する |
| S2 | 低 | SELECT・DELETE のポリシーは、パスの2番目（案件ID）を検証しない（事務所IDのみ）。同一事務所内では問題ない | 現状は許容 |
| S3 | 低 | 孤立ファイルを検出する手段がない | 運用手順へ追記（定期確認） |

S1 の修正方針（コード、承認後に実施）：

```ts
const { error } = await db.storage.from(BUCKET).remove(paths);
if (error) throw toAppError(error, "ファイルを削除できませんでした。案件は削除していません。");
```

## 3. 拒否テストの手順（適用前後に実施）

2つの事務所（A・B）を、別のユーザーで作成して確認します。**開発用プロジェクトで、ダミーデータのみを使用してください。**

1. A でログインし、案件と書類を作成する。
2. B でログインし、A の案件が一覧に出ないことを確認する。
3. B から、A の案件IDを指定して、次の操作が拒否される（0件・エラー）ことを確認する。
   - 各テーブルの SELECT / UPDATE / DELETE
   - 子テーブルへ、B の `organization_id` と A の `case_id` で INSERT（R1 の修正後はエラーになる）
4. B から、A のファイルパスで、署名付きURL取得・ダウンロード・削除が拒否されることを確認する。
5. ログアウト状態（anon）で、Supabase の REST API を直接呼び、全テーブルが 0件または拒否になることを確認する。
6. Supabase の **Security Advisor** を実行し、警告がないことを確認する。
