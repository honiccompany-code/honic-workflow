import type { DashboardBanner } from "@/lib/dashboard-types";
import { bannerForRegistry, fetchRegisteredClients } from "@/lib/registered-clients";
import { getSupabaseAdminClient, hasSupabaseServiceRoleEnv } from "@/lib/supabase-server";
import { formatHomeTimelineSummary } from "@/lib/timeline-summary";
import { normalizeRegisteredClientJoin } from "@/lib/supabase-relations";

export type WorkflowProjectRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_type: string;
  workflow_checklist: unknown;
  registered_client_id: string;
  registered_clients: { name: string } | null;
  /** Preformatted one-line schedule summary for the home table */
  timeline_summary: string;
};

export type HomeWorkflowSummaries = {
  totalClients: number;
  totalProjects: number;
  completedProjects: number;
  incompleteProjects: number;
  criticalProjects: number;
  onHoldProjects: number;
  activeProjects: number;
};

export async function loadHomeWorkflowPage(): Promise<{
  banner: DashboardBanner | null;
  projects: WorkflowProjectRow[];
  summaries: HomeWorkflowSummaries;
}> {
  const supabase = getSupabaseAdminClient();
  const usingServiceRole = hasSupabaseServiceRoleEnv();

  const emptySummaries: HomeWorkflowSummaries = {
    totalClients: 0,
    totalProjects: 0,
    completedProjects: 0,
    incompleteProjects: 0,
    criticalProjects: 0,
    onHoldProjects: 0,
    activeProjects: 0,
  };

  if (!supabase) {
    return {
      banner: {
        tone: "error",
        text: "Configure Supabase in .env.local (including SUPABASE_SERVICE_ROLE_KEY for server reads).",
      },
      projects: [],
      summaries: emptySummaries,
    };
  }

  const { clients, hints } = await fetchRegisteredClients(supabase);
  const banner = bannerForRegistry({
    clientsLength: clients.length,
    hints,
    usingServiceRole,
  });

  const { data: rawProjects, error } = await supabase
    .from("tracked_projects")
    .select(
      "id, title, status, priority, project_type, workflow_checklist, start_date, target_end_date, registered_client_id, registered_clients ( name ), project_milestones ( title, target_date, completed_at, sort_order )"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    const msg = error.message.includes("workflow_checklist")
      ? `${error.message} Run supabase/007_workflow_checklist.sql to add the checklist column.`
      : error.message;
    return {
      banner: {
        tone: "error",
        text: msg,
      },
      projects: [],
      summaries: {
        ...emptySummaries,
        totalClients: clients.length,
      },
    };
  }

  const projects: WorkflowProjectRow[] = (rawProjects ?? []).map((p) => {
    const rawMs = (p as { project_milestones?: unknown }).project_milestones;
    const milestones = Array.isArray(rawMs)
      ? rawMs
          .filter(
            (m): m is { title: string; target_date: string | null; completed_at: string | null; sort_order: number } =>
              typeof m === "object" &&
              m !== null &&
              "title" in m &&
              "sort_order" in m
          )
          .map((m) => ({
            title: String(m.title),
            target_date: m.target_date ?? null,
            completed_at: m.completed_at ?? null,
            sort_order: Number(m.sort_order),
          }))
      : [];

    const start_date = ((p as { start_date?: string | null }).start_date ?? null) as string | null;
    const target_end_date = ((p as { target_end_date?: string | null }).target_end_date ?? null) as string | null;

    return {
      id: p.id as string,
      title: p.title as string,
      status: p.status as string,
      priority: p.priority as string,
      project_type: (p.project_type as string) ?? "other",
      workflow_checklist: p.workflow_checklist,
      registered_client_id: p.registered_client_id as string,
      registered_clients: normalizeRegisteredClientJoin(p.registered_clients),
      timeline_summary: formatHomeTimelineSummary(start_date, target_end_date, milestones),
    };
  });

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const incompleteProjects = totalProjects - completedProjects;
  const criticalProjects = projects.filter((p) => p.priority === "critical").length;
  const onHoldProjects = projects.filter((p) => p.status === "on_hold").length;
  const activeProjects = projects.filter((p) =>
    ["planning", "active", "prototype_phase", "testing"].includes(p.status)
  ).length;

  return {
    banner,
    projects,
    summaries: {
      totalClients: clients.length,
      totalProjects,
      completedProjects,
      incompleteProjects,
      criticalProjects,
      onHoldProjects,
      activeProjects,
    },
  };
}
