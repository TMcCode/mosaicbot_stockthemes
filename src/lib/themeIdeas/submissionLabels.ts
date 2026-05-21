import type { ThemeIdeaSubmissionRow, ThemeIdeaSubmissionStatus } from "@/lib/themeIdeas/types";

const STATUS_LABEL: Record<ThemeIdeaSubmissionStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Not accepted",
  duplicate: "Duplicate",
};

export function submissionStatusLabel(status: ThemeIdeaSubmissionStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function submissionTitle(row: ThemeIdeaSubmissionRow): string {
  if (row.kind === "new_group" && row.proposed_group_name) {
    return `New group: ${row.proposed_group_name}`;
  }
  if (row.proposed_theme_name) {
    const group = row.group_name ? ` (${row.group_name})` : "";
    return `Theme: ${row.proposed_theme_name}${group}`;
  }
  return row.kind === "new_group" ? "New group suggestion" : "Theme suggestion";
}

export function submissionDateUtc(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}
