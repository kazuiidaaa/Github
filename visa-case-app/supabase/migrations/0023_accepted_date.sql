-- 受任日(行政書士が依頼を受けた日)を、案件に追加する。
-- 任意項目。既存の行は null(未入力)のまま。既存の列・ポリシー・トリガーは変更しない。
-- 0022(client_guide)の実行後に実行する。
alter table public.cases add column if not exists accepted_date date;
