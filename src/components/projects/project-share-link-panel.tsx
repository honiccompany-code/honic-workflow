"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { CreateShareLinkState } from "@/app/projects/[id]/share-actions";
import { createClientShareLinkAction } from "@/app/projects/[id]/share-actions";
import type { ProjectShareLinkRow } from "@/lib/project-share";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="border-dash-border bg-dash-muted/40 text-dash-foreground hover:bg-dash-muted/60 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

export function ProjectShareLinkPanel({
  projectId,
  existingLinks,
  siteOrigin,
}: {
  projectId: string;
  existingLinks: ProjectShareLinkRow[];
  /** e.g. https://app.example.com — used for absolute URLs in the list. */
  siteOrigin: string;
}) {
  const router = useRouter();
  const bound = createClientShareLinkAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<CreateShareLinkState, FormData>(bound, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const origin = siteOrigin.replace(/\/$/, "");
  const linkRows = existingLinks.map((row) => ({
    ...row,
    fullUrl: origin ? `${origin}/share/${row.token}` : `/share/${row.token}`,
  }));

  return (
    <section className="border-dash-border bg-dash-card mb-8 rounded-2xl border p-5 shadow-sm sm:p-6">
      <h2 className="text-dash-foreground mb-1 text-base font-semibold">Client share link</h2>
      <p className="text-dash-muted-foreground mb-4 text-sm leading-relaxed">
        Create an unlisted URL your client can open without logging in. They only see this project summary, the
        activity checklist, and files they can preview or download — not the rest of Honic.
      </p>

      <form action={formAction} className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-dash-accent hover:bg-dash-accent-dim rounded-xl px-4 py-2 text-sm font-semibold text-slate-950 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create new link"}
        </button>
      </form>

      {state && !state.ok ? (
        <p className="text-red-600 dark:text-red-300 mb-4 text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      {state?.ok ? (
        <div className="border-emerald-500/30 bg-emerald-500/10 mb-6 rounded-xl border px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
          <p className="font-medium">New link ready — send this URL to your client:</p>
          <p className="text-dash-foreground mt-2 break-all font-mono text-xs">{state.url}</p>
          <div className="mt-3">
            <CopyButton text={state.url} />
          </div>
        </div>
      ) : null}

      {linkRows.length > 0 ? (
        <div>
          <h3 className="text-dash-foreground mb-2 text-sm font-semibold">Recent links</h3>
          <ul className="divide-dash-border max-h-56 divide-y overflow-y-auto rounded-xl border">
            {linkRows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-dash-foreground truncate font-mono text-xs">{row.fullUrl}</p>
                  <p className="text-dash-muted-foreground mt-1 text-[11px]">
                    {new Date(row.created_at).toLocaleString()}
                    {row.expires_at ? ` · Expires ${new Date(row.expires_at).toLocaleString()}` : ""}
                    {row.label ? ` · ${row.label}` : ""}
                  </p>
                </div>
                <CopyButton text={row.fullUrl} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-dash-muted-foreground text-xs">No links created yet.</p>
      )}
    </section>
  );
}
