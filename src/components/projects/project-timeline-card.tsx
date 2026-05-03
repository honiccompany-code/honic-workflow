import { ProjectTimelineFields } from "@/components/projects/project-timeline-fields";

/**
 * Server component: static copy is identical on server and in the first HTML paint,
 * avoiding hydration mismatches with the interactive fields below.
 */
export function ProjectTimelineCard() {
  return (
    <section
      className="border-dash-border bg-dash-card h-full rounded-2xl border p-5 shadow-sm"
      aria-labelledby="timeline-heading"
    >
      <h3 id="timeline-heading" className="text-dash-foreground mb-1 text-sm font-semibold">
        Project timeline
      </h3>
      <p className="text-dash-muted-foreground mb-4 text-xs leading-relaxed">
        A <span className="text-dash-foreground font-medium">milestone</span> is a planned checkpoint on the calendar
        (for example schematic review, prototype build)—different from the Pipeline checklist, which tracks design
        workflow steps. Optional start/end dates define the project window; milestones help you see what comes next on
        the home Activity table and on this project page.
      </p>
      <ProjectTimelineFields />
    </section>
  );
}
