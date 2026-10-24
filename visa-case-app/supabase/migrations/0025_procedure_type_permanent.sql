-- 手続種別に「永住許可申請」(permanent) を追加する(Issue #420)
-- 既存の案件・データへの影響はありません(許可する値が1つ増えるのみ)。
-- 実行前に、データベースのバックアップを取得してください。実行せずに最新のアプリを使うと、
-- 手続種別「永住許可申請」の案件を保存できません(他の手続種別は従来どおり動作します)。

alter table public.cases drop constraint if exists cases_procedure_type_check;
alter table public.cases
  add constraint cases_procedure_type_check
  check (procedure_type in ('renewal', 'change', 'coe', 'acquisition', 'permanent', 'other'));
