"use client";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
}

function NavButton({ id, label }: { id: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToId(id)}
      className="text-dash-foreground hover:bg-dash-accent/15 focus-visible:ring-dash-accent min-h-[44px] min-w-[4.5rem] flex-1 rounded-xl px-2 text-center text-xs font-semibold tracking-tight transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
    >
      {label}
    </button>
  );
}

export function ShareStickyNav() {
  return (
    <nav
      className="border-dash-border bg-dash-card/95 supports-[backdrop-filter]:bg-dash-card/80 pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden dark:shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
      aria-label="Jump to section"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-1 px-3">
        <NavButton id="share-overview" label="Overview" />
        <NavButton id="activity-checklist" label="Steps" />
        <NavButton id="share-files" label="Files" />
      </div>
    </nav>
  );
}
