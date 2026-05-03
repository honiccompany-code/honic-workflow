"use client";

import { useState } from "react";

import { createProjectTask, updateTaskStatus } from "@/app/projects/actions";
import type { ProjectTaskRow } from "@/lib/projects-data";

function taskStatusLabel(status: string) {
  switch (status) {
    case "todo":
      return "Todo";
    case "in_progress":
      return "In progress";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    default:
      return status;
  }
}

export function ProjectTasksPanel({
  projectId,
  tasks,
  readOnly = false,
}: {
  projectId: string;
  tasks: ProjectTaskRow[];
  /** When true (e.g. project detail view page), hide add/edit controls — display only. */
  readOnly?: boolean;
}) {
  const [localTasks, setLocalTasks] = useState(tasks);

  const displayTasks = readOnly ? tasks : localTasks;

  async function onStatusChange(taskId: string, status: string) {
    const prev = localTasks;
    setLocalTasks((t) => t.map((x) => (x.id === taskId ? { ...x, status } : x)));
    try {
      await updateTaskStatus(taskId, projectId, status);
    } catch {
      setLocalTasks(prev);
    }
  }

  async function onAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;

    const optimistic: ProjectTaskRow = {
      id: `temp-${Date.now()}`,
      title,
      status: "todo",
      assignee: null,
      due_date: null,
      milestone_id: null,
      sort_order: 0,
    };
    const rollback = localTasks;
    setLocalTasks((t) => [...t, optimistic]);

    try {
      const row = await createProjectTask(fd);
      setLocalTasks((t) => [...t.filter((x) => x.id !== optimistic.id), row]);
      form.reset();
    } catch {
      setLocalTasks(rollback);
    }
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <form onSubmit={(e) => void onAddTask(e)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="tracked_project_id" value={projectId} />
          <div className="min-w-0 flex-1">
            <label htmlFor="task-title" className="text-dash-muted-foreground sr-only">
              New task
            </label>
            <input
              id="task-title"
              name="title"
              required
              placeholder="New task…"
              className="border-dash-border bg-dash-card text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="border-dash-border bg-dash-muted hover:bg-dash-border rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
          >
            Add task
          </button>
        </form>
      ) : null}

      <ul className="divide-dash-border divide-y rounded-xl border border-dashed">
        {displayTasks.length === 0 ? (
          <li className="text-dash-muted-foreground px-4 py-8 text-center text-sm">No tasks yet.</li>
        ) : (
          displayTasks.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-dash-foreground font-medium">{t.title}</p>
                <p className="text-dash-muted-foreground text-xs">
                  {t.assignee ? `${t.assignee} · ` : ""}
                  {t.due_date ? `Due ${t.due_date}` : "No due date"}
                </p>
              </div>
              {readOnly ? (
                <span className="border-dash-border bg-dash-muted text-dash-foreground shrink-0 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize">
                  {taskStatusLabel(t.status)}
                </span>
              ) : (
                <select
                  aria-label={`Status for ${t.title}`}
                  className="border-dash-border bg-dash-card text-dash-foreground rounded-lg border px-2 py-1.5 text-xs font-medium capitalize"
                  value={t.status}
                  onChange={(e) => void onStatusChange(t.id, e.target.value)}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
