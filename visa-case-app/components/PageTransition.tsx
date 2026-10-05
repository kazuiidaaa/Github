"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** 画面を切り替えたときに、内容をなめらかに表示する。 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="anim-page-enter">
      {children}
    </div>
  );
}
