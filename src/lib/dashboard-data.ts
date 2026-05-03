import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardBanner, RegisteredClientRow } from "@/lib/dashboard-types";
import { bannerForRegistry, fetchRegisteredClients } from "@/lib/registered-clients";
import { getSupabaseAdminClient, hasSupabaseServiceRoleEnv } from "@/lib/supabase-server";

export type { DashboardBanner, RegisteredClientRow } from "@/lib/dashboard-types";

function startOfUtcMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

async function fetchTrackingCounts(supabase: SupabaseClient): Promise<{
  totalProjects: number | null;
  activeProjects: number | null;
  openTasks: number | null;
}> {
  let totalProjects: number | null = null;
  let activeProjects: number | null = null;
  let openTasks: number | null = null;

  const total = await supabase
    .from("tracked_projects")
    .select("*", { count: "exact", head: true });
  if (!total.error && typeof total.count === "number") {
    totalProjects = total.count;
  }

  const active = await supabase
    .from("tracked_projects")
    .select("*", { count: "exact", head: true })
    .in("status", ["planning", "active", "prototype_phase", "testing"]);
  if (!active.error && typeof active.count === "number") {
    activeProjects = active.count;
  }

  const tasks = await supabase
    .from("project_tasks")
    .select("*", { count: "exact", head: true })
    .neq("status", "done");
  if (!tasks.error && typeof tasks.count === "number") {
    openTasks = tasks.count;
  }

  return { totalProjects, activeProjects, openTasks };
}

export async function loadDashboardData(): Promise<{
  clients: RegisteredClientRow[];
  totalProjects: number | null;
  activeProjects: number | null;
  openTasks: number | null;
  registryNewThisMonth: number;
  banner: DashboardBanner | null;
}> {
  const supabase = getSupabaseAdminClient();
  const usingServiceRole = hasSupabaseServiceRoleEnv();

  if (!supabase) {
    return {
      clients: [],
      totalProjects: null,
      activeProjects: null,
      openTasks: null,
      registryNewThisMonth: 0,
      banner: {
        tone: "error",
        text:
          "No database connection. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.local, then restart npm run dev.",
      },
    };
  }

  const { clients, hints } = await fetchRegisteredClients(supabase);
  const banner = bannerForRegistry({
    clientsLength: clients.length,
    hints,
    usingServiceRole,
  });

  const counts = await fetchTrackingCounts(supabase);

  const monthStart = startOfUtcMonth();
  const registryNewThisMonth = clients.filter((c) => {
    if (!c.firstSeenAt) return false;
    const t = new Date(c.firstSeenAt).getTime();
    return !Number.isNaN(t) && t >= monthStart.getTime();
  }).length;

  return {
    clients,
    totalProjects: counts.totalProjects,
    activeProjects: counts.activeProjects,
    openTasks: counts.openTasks,
    registryNewThisMonth,
    banner,
  };
}
