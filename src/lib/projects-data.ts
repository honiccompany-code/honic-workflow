import type { RegisteredClientRow } from "@/lib/dashboard-types";
import { fetchRegisteredClients } from "@/lib/registered-clients";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { normalizeRegisteredClientJoin } from "@/lib/supabase-relations";

export type TrackedProjectListRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_type: string;
  updated_at: string;
  registered_client_id: string;
  registered_clients: { name: string } | null;
};

export type TrackedProjectDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_type: string;
  workflow_checklist: unknown;
  start_date: string | null;
  target_end_date: string | null;
  updated_at: string;
  registered_client_id: string;
  /** Google Drive folder for uploads / files (under GOOGLE_DRIVE_FOLDER_ID). */
  google_drive_folder_id: string | null;
  registered_clients: { name: string } | null;
};

export type ProjectMilestoneRow = {
  id: string;
  title: string;
  target_date: string | null;
  sort_order: number;
  completed_at: string | null;
};

export type ProjectTaskRow = {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  due_date: string | null;
  milestone_id: string | null;
  sort_order: number;
};

export async function loadProjectsList(clientId?: string): Promise<{
  projects: TrackedProjectListRow[];
  error: string | null;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { projects: [], error: "Database not configured." };
  }

  let q = supabase
    .from("tracked_projects")
    .select(
      "id, title, status, priority, project_type, updated_at, registered_client_id, registered_clients ( name )"
    )
    .order("updated_at", { ascending: false });

  if (clientId) {
    q = q.eq("registered_client_id", clientId);
  }

  const { data, error } = await q;

  if (error) {
    return { projects: [], error: error.message };
  }

  const projects: TrackedProjectListRow[] = (data ?? []).map((row) => {
    const r = row as {
      id: string;
      title: string;
      status: string;
      priority: string;
      project_type: string;
      updated_at: string;
      registered_client_id: string;
      registered_clients: unknown;
    };
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      project_type: r.project_type,
      updated_at: r.updated_at,
      registered_client_id: r.registered_client_id,
      registered_clients: normalizeRegisteredClientJoin(r.registered_clients),
    };
  });

  return { projects, error: null };
}

export async function loadProjectDetail(projectId: string): Promise<{
  project: TrackedProjectDetail | null;
  milestones: ProjectMilestoneRow[];
  tasks: ProjectTaskRow[];
  error: string | null;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { project: null, milestones: [], tasks: [], error: "Database not configured." };
  }

  const { data: proj, error: pErr } = await supabase
    .from("tracked_projects")
    .select(
      "id, title, description, status, priority, project_type, workflow_checklist, start_date, target_end_date, updated_at, registered_client_id, google_drive_folder_id, registered_clients ( name )"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !proj) {
    return {
      project: null,
      milestones: [],
      tasks: [],
      error: pErr?.message ?? "Project not found.",
    };
  }

  const { data: ms, error: mErr } = await supabase
    .from("project_milestones")
    .select("id, title, target_date, sort_order, completed_at")
    .eq("tracked_project_id", projectId)
    .order("sort_order", { ascending: true });

  const { data: ts, error: tErr } = await supabase
    .from("project_tasks")
    .select("id, title, status, assignee, due_date, milestone_id, sort_order")
    .eq("tracked_project_id", projectId)
    .order("sort_order", { ascending: true });

  const errMsg = mErr?.message ?? tErr?.message ?? null;

  const project: TrackedProjectDetail = {
    ...(proj as unknown as TrackedProjectDetail),
    registered_clients: normalizeRegisteredClientJoin(
      (proj as { registered_clients: unknown }).registered_clients
    ),
  };

  return {
    project,
    milestones: (ms ?? []) as ProjectMilestoneRow[],
    tasks: (ts ?? []) as ProjectTaskRow[],
    error: errMsg,
  };
}

export async function loadClientsForProjectForms(): Promise<{
  clients: RegisteredClientRow[];
  error: string | null;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { clients: [], error: "Database not configured." };
  }

  const { clients, hints } = await fetchRegisteredClients(supabase);
  if (clients.length === 0 && hints.length > 0) {
    return { clients: [], error: hints[0] ?? "No registered clients." };
  }

  return { clients, error: null };
}
