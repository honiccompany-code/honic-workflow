import Link from "next/link";

/** Static HTML at build time — use for fixed public copy only; app dashboards stay dynamic. */
export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <main className="bg-dash-canvas text-dash-foreground flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="text-dash-muted-foreground mt-3 text-sm leading-relaxed">
          Example of a public page that can stay static. Swap this for marketing or legal content. Home, projects, and
          manage views use dynamic rendering with Supabase.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  );
}
