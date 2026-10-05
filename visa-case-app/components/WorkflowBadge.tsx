import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";
import { Badge } from "./ui";

type Tone = "green" | "yellow" | "gray";

const TONES: Partial<Record<WorkflowStatus, Tone>> = {
  applicant_confirmed: "green",
  application_ready: "green",
  review_required: "yellow",
};

/** 案件のワークフロー状態。色に加えて図形とテキストで示す。 */
export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const tone = TONES[status] ?? "gray";
  return (
    <Badge tone={tone}>{WORKFLOW_LABELS[status]}</Badge>
  );
}
