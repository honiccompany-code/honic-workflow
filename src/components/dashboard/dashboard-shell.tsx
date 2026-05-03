"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  /** Custom active match; default is pathname === href or pathname.startsWith(href + "/") */
  isActive?: (pathname: string) => boolean;
};

type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Workflow home", isActive: (p) => p === "/" },
      { href: "/about", label: "About", isActive: (p) => p === "/about" || p.startsWith("/about/") },
    ],
  },
  {
    title: "Projects",
    items: [
      {
        href: "/projects",
        label: "All projects",
        isActive: (p) =>
          p === "/projects" || (p.startsWith("/projects/") && !p.startsWith("/projects/new")),
      },
      {
        href: "/projects/new",
        label: "New project",
        isActive: (p) => p === "/projects/new" || p.startsWith("/projects/new/"),
      },
    ],
  },
  {
    title: "Google Drive",
    items: [
      {
        href: "/drive",
        label: "Browse folders",
        isActive: (p) =>
          p === "/drive" || p.startsWith("/drive/folder/") || p.startsWith("/drive/view/"),
      },
      {
        href: "/drive/upload",
        label: "Upload file",
        isActive: (p) => p === "/drive/upload",
      },
    ],
  },
];

function itemActive(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardShell({
  children,
  title,
  subtitle,
  statusDotClass,
  headerBelow,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  /** Tailwind bg class for live indicator */
  statusDotClass: string;
  /** Renders directly under the sticky page header (e.g. in-page shortcuts). */
  headerBelow?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="bg-dash-canvas text-dash-foreground flex min-h-screen">
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        id="dash-sidebar"
        className={`border-dash-border bg-dash-sidebar text-dash-sidebar-muted fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-xl transition-transform lg:static lg:z-auto lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Link
          href="/"
          className="border-dash-border flex items-center gap-3 border-b px-5 py-6"
          onClick={() => setOpen(false)}
        >
          <div className="from-dash-accent to-dash-accent-dim flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg shadow-cyan-500/15">
            <span className="text-slate-950 font-bold tracking-tight">H</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-slate-50">Honic Ops</p>
            <p className="text-dash-sidebar-muted truncate text-xs">Project tracker</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3" aria-label="Main navigation">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-dash-sidebar-muted px-3 pb-2 text-[10px] font-semibold tracking-widest uppercase">
                {section.title}
              </p>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = itemActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-dash-accent/20 text-cyan-100 ring-1 ring-cyan-500/30"
                            : "hover:bg-dash-sidebar-hover text-dash-sidebar-muted hover:text-slate-50"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-dash-border text-dash-sidebar-muted mt-auto p-4 text-xs leading-relaxed border-t">
          Clients from invoices → <span className="font-medium text-slate-200">registered_clients</span>. Projects in{" "}
          <span className="font-medium text-slate-200">tracked_projects</span>.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-dash-border bg-dash-header/80 sticky top-0 z-30 flex items-center gap-4 border-b px-4 py-3 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="hover:bg-dash-muted inline-flex rounded-lg p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="dash-sidebar"
            onClick={() => setOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-dash-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
            <p className="text-dash-muted-foreground truncate text-sm">{subtitle}</p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className={`h-2 w-2 rounded-full ${statusDotClass}`} aria-hidden />
            <span className="text-dash-muted-foreground text-xs font-medium">Live data</span>
          </div>
        </header>

        {headerBelow ? (
          <div className="border-dash-border bg-dash-header/50 border-b px-4 py-2.5 lg:px-8">{headerBelow}</div>
        ) : null}

        <div className="dash-grid-bg flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
