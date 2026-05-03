"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { WORKFLOW_STEPS, type WorkflowStepKey, type WorkflowStepStatus } from "@/lib/workflow-checklist";

const VALID = new Set<string>(["pending", "in_progress", "done", "not_provided"]);

export async function updateWorkflowStep(
  projectId: string,
  stepKey: WorkflowStepKey,
  status: WorkflowStepStatus
) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  if (!WORKFLOW_STEPS.some((s) => s.key === stepKey)) {
    throw new Error("Invalid workflow step.");
  }

  if (!VALID.has(status)) {
    throw new Error("Invalid status.");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("tracked_projects")
    .select("workflow_checklist")
    .eq("id", projectId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(fetchErr.message);
  }

  const current =
    row?.workflow_checklist && typeof row.workflow_checklist === "object"
      ? { ...(row.workflow_checklist as Record<string, string>) }
      : {};

  current[stepKey] = status;

  const { error: upErr } = await supabase
    .from("tracked_projects")
    .update({
      workflow_checklist: current,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (upErr) {
    throw new Error(upErr.message);
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/work`);
}
