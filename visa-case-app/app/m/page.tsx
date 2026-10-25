import { redirect } from "next/navigation";

/** /m は案件一覧（/m/cases）へ移す。タブの先頭が案件のため */
export default function MobileIndexPage() {
  redirect("/m/cases");
}
