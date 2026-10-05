import type { Metadata } from "next";
import { PROTOTYPE_NOTICE, REVIEW_NOTICE } from "@/lib/notices";

export const metadata: Metadata = { title: "ご利用にあたって｜在留資格案件管理" };

const SECTION = "rounded-2xl border border-slate-200 bg-white p-6";
const LIST = "list-disc space-y-1 pl-5";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm">
      <h1 className="text-xl font-bold">ご利用にあたって</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
        {PROTOTYPE_NOTICE}。{REVIEW_NOTICE}。
      </p>

      <section className={SECTION} aria-labelledby="can">
        <h2 id="can" className="mb-2 font-bold">このアプリでできること</h2>
        <ul className={LIST}>
          <li>在留資格の申請に関する案件の登録と、進み具合の管理</li>
          <li>申請人情報・雇用情報・公式様式の項目の入力</li>
          <li>書類のアップロードと、必要書類の収集状況の確認</li>
          <li>申請前チェックの記録</li>
          <li>入力内容から、内部確認用の書類（Word・PDF）や、公式様式（Excel）の下書きを作ること</li>
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="cannot">
        <h2 id="cannot" className="mb-2 font-bold">このアプリでできないこと</h2>
        <ul className={LIST}>
          <li>アップロードした画像の文字の読み取り（OCR）は行いません。原本を見ながら入力します。</li>
          <li>出入国在留管理庁などへ、申請を送信する機能はありません。</li>
          <li>生成する書類は、内部確認用または下書きです。公式の申請書そのものではありません。</li>
          <li>書類の適否や、申請の可否の判断は行いません。</li>
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="privacy">
        <h2 id="privacy" className="mb-2 font-bold">個人情報の取扱い</h2>
        <ul className={LIST}>
          <li>扱う情報：氏名、住所、在留カードや旅券の情報、雇用に関する情報、犯罪を理由とする処分の有無など。</li>
          <li>保管場所：ログインして使う場合、入力内容は事務所ごとに分けて、データベース（Supabase）に保存します。書類のファイルも、同じ事務所の所属者のみが見られる設定で保管します。</li>
          <li>仮データ方式（接続情報が未設定の場合）やデモでは、入力内容はサーバーに保存されません。</li>
          <li>監査ログ（操作の記録）には、操作した人、案件、操作の種類、変更された項目名、日時を記録します。氏名・住所・番号・ファイル名などの値は記録しません。</li>
          <li>試作版の間は、実在の個人情報を入力・アップロードしないでください。</li>
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="duty">
        <h2 id="duty" className="mb-2 font-bold">利用者の責任</h2>
        <ul className={LIST}>
          <li>入力内容と生成した書類の確認は、行政書士が行います。</li>
          <li>提出前に、原本と最新の公式様式で照合してください。</li>
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="rules">
        <h2 id="rules" className="mb-2 font-bold">事務所の規程が必要な事項（要確認）</h2>
        <ul className={LIST}>
          <li>書類や記録の保存期間：事務所の規程に従う（要確認）。</li>
          <li>個人情報の安全管理の措置：事務所の規程に従う（要確認）。</li>
          <li>監査ログは、現在は削除しない運用としています。期間を定める場合は見直します（要確認）。</li>
          <li>問い合わせ先：事務所で定めた窓口に確認してください（要確認）。</li>
        </ul>
      </section>
    </div>
  );
}
