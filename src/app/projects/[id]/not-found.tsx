import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="bg-dash-canvas text-dash-foreground flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="text-dash-muted-foreground mt-2 text-center text-sm">
        That ID may be invalid or the row was removed.
      </p>
      <Link href="/projects" className="text-dash-accent mt-6 font-semibold underline-offset-2 hover:underline">
        Back to projects
      </Link>
    </div>
  );
}
