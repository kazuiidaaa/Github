"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const SECTION = "rounded-2xl border border-slate-200 bg-white p-6";
const LIST = "list-disc space-y-1 pl-5";

type Section = { id: string; title: MessageKey; items: MessageKey[] };

const SECTIONS: Section[] = [
  { id: "can", title: "about.canTitle", items: ["about.can1", "about.can2", "about.can3", "about.can4", "about.can5"] },
  { id: "cannot", title: "about.cannotTitle", items: ["about.cannot1", "about.cannot2", "about.cannot3", "about.cannot4"] },
  {
    id: "privacy",
    title: "about.privacyTitle",
    items: ["about.privacy1", "about.privacy2", "about.privacy3", "about.privacy4", "about.privacy5", "about.privacy6"],
  },
  { id: "duty", title: "about.dutyTitle", items: ["about.duty1", "about.duty2"] },
  { id: "rules", title: "about.rulesTitle", items: ["about.rules1", "about.rules2", "about.rules3", "about.rules4"] },
];

/** 「ご利用にあたって」の本文（表示言語に合わせる） */
export function AboutContent() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm">
      <h1 className="text-xl font-bold">{t("about.title")}</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-amber-900">{t("about.notice")}</p>
      {SECTIONS.map((s) => (
        <section key={s.id} className={SECTION} aria-labelledby={s.id}>
          <h2 id={s.id} className="mb-2 font-bold">
            {t(s.title)}
          </h2>
          <ul className={LIST}>
            {s.items.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
