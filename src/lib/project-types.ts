/**
 * Must stay in sync with `tracked_projects.status` check constraint (see supabase/006_project_tracking.sql).
 * Folder names under the project Drive folder use `label` when sorting uploads by status.
 */
export const PROJECT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "prototype_phase", label: "Prototype phase" },
  { value: "testing", label: "Testing" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number]["value"];

export function projectStatusUploadFolderLabel(value: string): string {
  const row = PROJECT_STATUSES.find((s) => s.value === value);
  return row?.label ?? value.replace(/_/g, " ");
}

/**
 * Must stay in sync with `tracked_projects.project_type` check constraint (see supabase/008_project_types.sql).
 */
export const PROJECT_TYPES = [
  { value: "student_fyp", label: "Student final year project (FYP)" },
  { value: "research", label: "Research project" },
  { value: "product_prototype", label: "Product prototype" },
  { value: "product", label: "Product / production" },
  { value: "mvp", label: "MVP (minimum viable product)" },
  { value: "other", label: "Other" },
] as const;

export type ProjectTypeValue = (typeof PROJECT_TYPES)[number]["value"];

const LABEL_BY_VALUE = Object.fromEntries(PROJECT_TYPES.map((p) => [p.value, p.label])) as Record<
  ProjectTypeValue,
  string
>;

/** Human-readable label for tables and detail pages. */
export function formatProjectType(value: string | null | undefined): string {
  if (!value) return "—";
  if (value in LABEL_BY_VALUE) {
    return LABEL_BY_VALUE[value as ProjectTypeValue];
  }
  /* Legacy DB values before migration */
  if (value === "student_final") return "Student final year project (FYP) (legacy)";
  if (value === "prototype") return "Product prototype (legacy)";
  return value.replace(/_/g, " ");
}
