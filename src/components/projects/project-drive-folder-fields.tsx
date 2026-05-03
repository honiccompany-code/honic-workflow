"use client";

import { useState } from "react";

import { DriveFolderPicker } from "@/components/projects/drive-folder-picker";

export function ProjectDriveFolderFields({
  variant,
}: {
  variant: "create-project" | "configure-project";
}) {
  const [skipDrive, setSkipDrive] = useState(false);
  const [driveFolderMode, setDriveFolderMode] = useState<"create" | "use">("create");
  const [configureMode, setConfigureMode] = useState<"clear" | "create_under" | "use_existing">("create_under");

  return (
    <div className="border-dash-border border-t pt-5">
      <h4 className="text-dash-foreground mb-3 text-sm font-semibold">Google Drive project folder</h4>

      {variant === "create-project" ? (
        <>
          <p className="text-dash-muted-foreground mb-4 text-xs leading-relaxed">
            Choose whether to <span className="text-dash-foreground font-medium">create a new folder</span> under a
            location you pick, or <span className="text-dash-foreground font-medium">use an existing folder</span> as this
            project&apos;s Drive folder. The linked tree must be shared with the service account as{" "}
            <span className="text-dash-foreground font-medium">Editor</span> when creating new folders.
          </p>

          <label className="text-dash-foreground mb-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="drive_skip"
              value="1"
              checked={skipDrive}
              onChange={(e) => setSkipDrive(e.target.checked)}
              className="border-dash-border mt-1 rounded"
            />
            <span>Skip Google Drive for now (set up later on the project Files page)</span>
          </label>

          {!skipDrive ? (
            <div className="border-dash-border bg-dash-muted/15 space-y-4 rounded-xl border p-4">
              <fieldset className="space-y-2">
                <legend className="text-dash-muted-foreground mb-2 text-xs font-medium">Folder setup</legend>
                <label className="text-dash-foreground flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="drive_folder_mode"
                    value="create"
                    checked={driveFolderMode === "create"}
                    onChange={() => setDriveFolderMode("create")}
                    className="border-dash-border"
                  />
                  Create a new folder under a parent I choose
                </label>
                <label className="text-dash-foreground flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="drive_folder_mode"
                    value="use"
                    checked={driveFolderMode === "use"}
                    onChange={() => setDriveFolderMode("use")}
                    className="border-dash-border"
                  />
                  Use an existing folder (selected folder is the project folder)
                </label>
              </fieldset>

              {driveFolderMode === "create" ? (
                <>
                  <div>
                    <label htmlFor="drive_new_folder_name" className="text-dash-muted-foreground mb-1 block text-sm font-medium">
                      New folder name <span className="font-normal opacity-70">(optional — defaults to project title)</span>
                    </label>
                    <input
                      id="drive_new_folder_name"
                      name="drive_new_folder_name"
                      placeholder="e.g. ACME — Motor controller"
                      className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                    />
                  </div>
                  <DriveFolderPicker key="mode-create" purpose="parent_for_new" />
                </>
              ) : (
                <DriveFolderPicker key="mode-use" purpose="existing_project_folder" />
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-dash-muted-foreground mb-4 text-xs leading-relaxed">
            Create a new project folder under a location, attach an existing folder, or remove the stored folder.
          </p>

          <div className="mb-4">
            <label htmlFor="drive_configure" className="text-dash-muted-foreground mb-1 block text-sm font-medium">
              Drive folder
            </label>
            <select
              id="drive_configure"
              name="drive_configure"
              value={configureMode}
              onChange={(e) => setConfigureMode(e.target.value as typeof configureMode)}
              className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            >
              <option value="create_under">Create new project folder under a folder I choose</option>
              <option value="use_existing">Use an existing folder for this project</option>
              <option value="clear">Remove Drive folder from this project</option>
            </select>
          </div>

          {configureMode === "create_under" ? (
            <div className="border-dash-border bg-dash-muted/15 space-y-4 rounded-xl border p-4">
              <div>
                <label htmlFor="drive_new_folder_name_cfg" className="text-dash-muted-foreground mb-1 block text-sm font-medium">
                  New folder name <span className="font-normal opacity-70">(optional — defaults to project title)</span>
                </label>
                <input
                  id="drive_new_folder_name_cfg"
                  name="drive_new_folder_name"
                  placeholder="e.g. ACME — Motor controller"
                  className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                />
              </div>
              <DriveFolderPicker key="cfg-create" purpose="parent_for_new" />
            </div>
          ) : null}

          {configureMode === "use_existing" ? (
            <div className="border-dash-border bg-dash-muted/15 rounded-xl border p-4">
              <DriveFolderPicker key="cfg-use" purpose="existing_project_folder" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
