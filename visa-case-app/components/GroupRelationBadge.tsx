"use client";

import { Badge } from "@/components/ui";
import { relationKey } from "@/lib/i18n/caseGroup";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { GroupRelation } from "@/lib/types";

/**
 * 「主たる申請人との関係」の印（表示用のみ）。色だけでなく文字でも示す。
 * 主たる申請人は青、帯同者・その他は灰色。判定・自動処理には使わない。
 */
export function GroupRelationBadge({ relation }: { relation: GroupRelation | undefined }) {
  const t = useT();
  if (!relation) return null;
  return (
    <Badge tone={relation === "primary" ? "blue" : "gray"} icon={false}>
      {t(relationKey(relation))}
    </Badge>
  );
}
