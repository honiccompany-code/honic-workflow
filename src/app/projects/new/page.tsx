import Link from "next/link";

import { NewProjectForm } from "@/components/projects/new-project-form";
import { ProjectTimelineCard } from "@/components/projects/project-timeline-card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";
import { loadClientsForProjectForms } from "@/lib/projects-data";

export default async function NewProjectPage(props: {
  searchParams?: Promise<{ client?: string }>;
}) {
  const sp = props.searchParams ? await props.searchParams : {};
  const preferredClient =
    typeof sp.client === "string" && sp.client.trim() ? sp.client.trim() : "";

  const dash = await loadDashboardData();
  const { clients, error } = await loadClientsForProjectForms();

  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  const initialClientId =
    preferredClient && clients.some((c) => c.id === preferredClient) ? preferredClient : "";

  return (
    <DashboardShell
      title="New project"
      subtitle="Link work to a registered client from your invoice-derived registry."
      statusDotClass={statusDotClass}
    >
      {error ? (
        <div
          role="alert"
          className="border-dash-border bg-dash-card mb-6 rounded-2xl border border-amber-500/35 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          {error}
        </div>
      ) : null}

      {clients.length === 0 ? (
        <div className="border-dash-border bg-dash-card rounded-2xl border px-5 py-10 text-center">
          <p className="text-dash-foreground font-medium">No registered clients available.</p>
          <p className="text-dash-muted-foreground mt-2 text-sm">
            Populate <code className="text-dash-foreground text-xs">registered_clients</code> first (migration 005).
          </p>
          <Link
            href="/"
            className="text-dash-accent mt-4 inline-block font-semibold underline-offset-2 hover:underline"
          >
            Go to home
          </Link>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-1">
          <NewProjectForm clients={clients} initialClientId={initialClientId}>
            <ProjectTimelineCard />
          </NewProjectForm>
        </div>
      )}

      <p className="text-dash-muted-foreground mt-8 text-center text-xs">
        <Link href="/projects" className="text-dash-accent font-medium underline-offset-2 hover:underline">
          ← All projects
        </Link>
      </p>
    </DashboardShell>
  );
}
