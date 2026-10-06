import { buildBlocks } from "@/lib/documents/model";
import { DEFAULT_LANG, type Lang } from "@/lib/documents/lang";
import type { GeneratedDocument } from "@/lib/documents/types";

/** ご案内書類の画面表示。Word・PDF と同じ構成（buildBlocks）を描画する。保存済みの content_json だけを使う。lang は表示の言語（保存しない） */
export function ClientGuideSheet({ doc, lang = DEFAULT_LANG }: { doc: GeneratedDocument; lang?: Lang }) {
  return (
    <article lang={lang} className="paper mx-auto max-w-[210mm] bg-white p-8 text-slate-900 shadow-sm print:shadow-none">
      {buildBlocks(doc, lang).map((b, i) => {
        switch (b.kind) {
          case "eyebrow":
            return (
              <p key={i} className="text-xs text-slate-500">
                {b.text}
              </p>
            );
          case "title":
            return (
              <h1 key={i} className="mt-1 text-xl font-semibold">
                {b.text}
              </h1>
            );
          case "subtitle":
            return (
              <p key={i} className="mt-1 text-sm">
                {b.text}
              </p>
            );
          case "status":
            return (
              <p key={i} className="mb-6 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-slate-800 pb-3 text-xs text-slate-600">
                <span>{b.meta}</span>
                <span className={`rounded px-2 py-0.5 font-medium ${b.confirmed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {b.label}
                </span>
                {b.reviewed && <span>{b.reviewed}</span>}
              </p>
            );
          case "heading":
            return (
              <h2 key={i} className="mb-2 mt-6 border-b border-slate-300 pb-1 text-base font-semibold">
                {b.text}
              </h2>
            );
          case "note":
            return (
              <p key={i} className="mb-2 text-xs text-slate-600">
                {b.text}
              </p>
            );
          case "paragraph":
            return (
              <p key={i} className="mb-2 whitespace-pre-wrap text-sm">
                {b.text}
              </p>
            );
          case "kv":
            return (
              <dl key={i} className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
                {b.rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
              </dl>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      {b.head.map((h) => (
                        <th key={h} className="border border-slate-300 p-1.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((cell, k) => (
                          <td key={k} className="border border-slate-300 p-1.5 whitespace-pre-wrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "notices":
            return (
              <footer key={i} className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-500">
                {b.lines.map((n) => (
                  <p key={n}>{n}</p>
                ))}
              </footer>
            );
        }
      })}
    </article>
  );
}
