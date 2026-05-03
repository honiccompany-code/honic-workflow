"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSubfolderUnderLinkedTree, validateDriveFolderForProject } from "@/lib/google-drive-server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { PROJECT_TYPES, type ProjectTypeValue } from "@/lib/project-types";

const MAX_TIMELINE_MILESTONES = 50;
const MAX_MILESTONE_TITLE = 200;

function parseOptionalDateField(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function parseTimelineMilestonesPayload(raw: string): { title: string; target_date: string | null }[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: { title: string; target_date: string | null }[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const title = String(rec.title ?? "").trim().slice(0, MAX_MILESTONE_TITLE);
    if (!title) continue;
    const td = rec.target_date;
    let target_date: string | null = null;
    if (td !== null && td !== undefined && td !== "") {
      const s = String(td).slice(0, 10);
      target_date = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    out.push({ title, target_date });
    if (out.length >= MAX_TIMELINE_MILESTONES) break;
  }
  return out;
}

export async function createTrackedProject(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const registered_client_id = String(formData.get("registered_client_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const project_type = String(formData.get("project_type") ?? "product_prototype").trim();
  const allowedTypes = new Set<string>(PROJECT_TYPES.map((p) => p.value));
  if (!allowedTypes.has(project_type as ProjectTypeValue)) {
    throw new Error("Invalid project type.");
  }
  const priority = String(formData.get("priority") ?? "medium").trim();
  const descriptionRaw = formData.get("description");
  const description = descriptionRaw ? String(descriptionRaw).trim() : "";
  const start_date = parseOptionalDateField(formData, "start_date");
  const target_end_date = parseOptionalDateField(formData, "target_end_date");
  const milestones = parseTimelineMilestonesPayload(String(formData.get("timeline_milestones") ?? ""));

  if (!registered_client_id || !title) {
    throw new Error("Registered client and project title are required.");
  }

  const skipDrive = String(formData.get("drive_skip") ?? "").trim() === "1";
  let google_drive_folder_id: string | null = null;

  if (!skipDrive) {
    const driveMode = String(formData.get("drive_folder_mode") ?? "create").trim();
    const useExisting = driveMode === "use";

    if (useExisting) {
      const raw = String(formData.get("drive_existing_folder_id") ?? "").trim();
      if (!raw) {
        throw new Error(
          'Browse Drive and choose which folder to use, or switch to "Create a new folder", or skip Drive.',
        );
      }
      const v = await validateDriveFolderForProject(raw);
      if (!v.ok) {
        throw new Error(v.error);
      }
      google_drive_folder_id = v.folderId;
    } else {
      const parentId = String(formData.get("drive_parent_folder_id") ?? "").trim();
      if (!parentId) {
        throw new Error(
          'Open Drive above and choose a parent folder for the new project folder, or check "Skip Google Drive for now".',
        );
      }
      const folderLabel = String(formData.get("drive_new_folder_name") ?? "").trim() || title;
      const created = await createSubfolderUnderLinkedTree(parentId, folderLabel);
      if (!created.ok) {
        throw new Error(created.error);
      }
      google_drive_folder_id = created.folderId;
    }
  }

  const { data, error } = await supabase
    .from("tracked_projects")
    .insert({
      registered_client_id,
      title,
      description: description || null,
      project_type,
      priority,
      status: "planning",
      start_date,
      target_end_date,
      google_drive_folder_id,
    })
    .select("id")
    .single();

  if (error) {
    let msg = error.message;
    if (msg.includes("tracked_projects_project_type_check")) {
      msg +=
        " Your Supabase `tracked_projects.project_type` check is out of date. Open Supabase → SQL Editor and run `supabase/010_project_type_constraint_fix.sql` from this repo, then try again.";
    }
    throw new Error(msg);
  }

  const projectId = data.id;
  if (milestones.length > 0) {
    const { error: mErr } = await supabase.from("project_milestones").insert(
      milestones.map((m, sort_order) => ({
        tracked_project_id: projectId,
        title: m.title,
        target_date: m.target_date,
        sort_order,
      }))
    );
    if (mErr) {
      throw new Error(mErr.message);
    }
  }

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${data.id}/work`);
}

export async function configureProjectDriveFolder(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const projectId = String(formData.get("tracked_project_id") ?? "").trim();
  const driveCfg = String(formData.get("drive_configure") ?? "create_under").trim();
  const clearDrive = driveCfg === "clear";
  const useExisting = driveCfg === "use_existing";

  if (!projectId) {
    throw new Error("Missing project.");
  }

  let google_drive_folder_id: string | null = null;

  if (clearDrive) {
    google_drive_folder_id = null;
  } else if (useExisting) {
    const raw = String(formData.get("drive_existing_folder_id") ?? "").trim();
    if (!raw) {
      throw new Error("Browse Drive and select the folder to use for this project.");
    }
    const v = await validateDriveFolderForProject(raw);
    if (!v.ok) {
      throw new Error(v.error);
    }
    google_drive_folder_id = v.folderId;
  } else {
    const parentId = String(formData.get("drive_parent_folder_id") ?? "").trim();
    if (!parentId) {
      throw new Error(
        'Choose a parent folder in Drive, pick another option above, or select "Remove Drive folder from this project".',
      );
    }
    const label = String(formData.get("drive_new_folder_name") ?? "").trim();
    const { data: row, error: fetchErr } = await supabase
      .from("tracked_projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();
    if (fetchErr || !row?.title) {
      throw new Error(fetchErr?.message ?? "Project not found.");
    }
    const folderName = label || row.title;
    const created = await createSubfolderUnderLinkedTree(parentId, folderName);
    if (!created.ok) {
      throw new Error(created.error);
    }
    google_drive_folder_id = created.folderId;
  }

  const { error } = await supabase
    .from("tracked_projects")
    .update({ google_drive_folder_id })
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files`);

  redirect(`/projects/${projectId}/files`);
}

export async function createProjectTask(
  formData: FormData
): Promise<{
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  due_date: string | null;
  milestone_id: string | null;
  sort_order: number;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const tracked_project_id = String(formData.get("tracked_project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!tracked_project_id || !title) {
    throw new Error("Task title is required.");
  }

  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      tracked_project_id,
      title,
      status: "todo",
    })
    .select("id, title, status, assignee, due_date, milestone_id, sort_order")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Insert failed.");
  }

  return data;
}

export async function deleteTrackedProject(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const projectId = String(formData.get("tracked_project_id") ?? "").trim();
  if (!projectId) {
    throw new Error("Missing project.");
  }

  const { error } = await supabase.from("tracked_projects").delete().eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/projects");
  revalidatePath("/");

  redirect("/projects");
}

export async function updateTaskStatus(taskId: string, trackedProjectId: string, status: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const allowed = ["todo", "in_progress", "blocked", "done"];
  if (!allowed.includes(status)) {
    throw new Error("Invalid task status.");
  }

  const { error } = await supabase.from("project_tasks").update({ status }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}
