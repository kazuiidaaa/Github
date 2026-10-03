import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";
import { Badge } from "./ui";

type Tone = "green" | "yellow" | "gray";

const TONES: Partial<Record<WorkflowStatus, Tone>> = {
  applicant_confirmed: "green",
  application_ready: "green",
  review_required: "yellow",
};
/** 色が判別しにくい場合でも状態が分かるよう、記号を併記する */
const MARKS: Record<Tone, string> = { green: "✓", yellow: "!", gray: "・" };

/** 案件のワークフロー状態。色に加えて記号とテキストで示す。 */
export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const tone = TONES[status] ?? "gray";
  return (
    <Badge tone={tone}>
      <span aria-hidden="true">{MARKS[tone]} </span>
      {WORKFLOW_LABELS[status]}
    </Badge>
  );
}
