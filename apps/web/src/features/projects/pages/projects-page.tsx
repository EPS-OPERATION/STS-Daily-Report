import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PageHeader } from "@/components/shared/page-header.js";
import { EmptyState } from "@/components/shared/empty-state.js";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import { useCanManageSiteConfiguration } from "@/features/auth/hooks/use-site-configuration-permission.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { projectApi, type ProjectContractorOption, type ProjectOption } from "@/features/projects/api/project.api.js";
import { useProjectContractors, useProjects } from "@/features/projects/hooks/use-projects.js";
import { projectKeys } from "@/consts/query-keys/projects.js";
import { useContractors } from "@/features/contractors/hooks/use-contractors.js";

const schema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().max(2000),
});
type Values = z.infer<typeof schema>;

export function ProjectsPage() {
  const canManage = useCanManageSiteConfiguration();
  const projects = useProjects("all");
  const { setProjectId } = useCurrentProject();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editor, setEditor] = useState<ProjectOption | "new" | null>(null);
  const [assignment, setAssignment] = useState<ProjectOption | null>(null);
  const [selected, setSelected] = useState<ProjectContractorOption[]>([]);
  const [search, setSearch] = useState("");
  const assigned = useProjectContractors(assignment?.id ?? null);
  const contractors = useContractors({ page: 1, pageSize: 100, search });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", code: "", description: "" } });
  useEffect(() => {
    reset(
      editor && editor !== "new"
        ? { name: editor.name, code: editor.code, description: editor.description ?? "" }
        : { name: "", code: "", description: "" },
    );
    setError(null);
  }, [editor, reset]);
  useEffect(() => {
    if (assigned.data) setSelected(assigned.data.data);
  }, [assigned.data]);
  const save = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    try {
      const result = await projectApi.save(editor === "new" ? null : editor!.id, values);
      await client.invalidateQueries({ queryKey: ["projects", "list"] });
      setEditor(null);
      if (editor === "new") {
        setProjectId(result.data.id);
        navigate("/site-configuration");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  });
  const saveAssignments = async () => {
    setSaving(true);
    setError(null);
    try {
      await projectApi.assignContractors(
        assignment!.id,
        selected.map((row) => row.id),
      );
      await client.invalidateQueries({ queryKey: projectKeys.contractors(assignment!.id) });
      setAssignment(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Assignments could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle="Create a Project, then set up its Maps and Facilities."
        actions={
          canManage ? (
            <Button variant="contained" onClick={() => setEditor("new")}>
              Add Project
            </Button>
          ) : undefined
        }
      />
      {projects.isLoading ? <LinearProgress /> : null}
      {projects.isError ? (
        <Alert severity="error">
          Projects could not be loaded.{" "}
          <Button variant="text" onClick={() => void projects.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}
      {!projects.isLoading && projects.data?.data.length === 0 ? (
        <EmptyState
          icon={<FolderOutlinedIcon />}
          title="No Projects yet"
          description={
            canManage
              ? "Create your first Project to add Maps and Facilities."
              : "Ask an administrator to create a Project and grant setup access."
          }
          action={canManage ? <Button onClick={() => setEditor("new")}>Create first Project</Button> : undefined}
        />
      ) : null}
      <Stack spacing={1}>
        {projects.data?.data.map((project) => (
          <Paper key={project.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="subtitle1">{project.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {project.code}
                  {project.status !== "active" ? " · Inactive" : ""}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {canManage ? (
                  <>
                    <Button variant="text" onClick={() => setEditor(project)}>
                      Edit
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => {
                        setAssignment(project);
                        setSelected([]);
                        setError(null);
                      }}
                    >
                      Contractors
                    </Button>
                    <Button
                      variant="outlined"
                      component={RouterLink}
                      to="/site-configuration"
                      onClick={() => setProjectId(project.id)}
                    >
                      Site Configuration
                    </Button>
                  </>
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Dialog open={!!editor} onClose={() => !saving && setEditor(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={save}>
          <DialogTitle>{editor === "new" ? "Create Project" : "Edit Project"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Project name"
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField
                label="Project code"
                {...register("code")}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
              <TextField label="Description" multiline rows={2} {...register("description")} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" color="inherit" disabled={saving} onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Save Project"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={!!assignment} onClose={() => !saving && setAssignment(null)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Contractors — {assignment?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {assigned.isError || contractors.isError ? (
              <Alert severity="error">Contractors could not be loaded.</Alert>
            ) : null}
            <Autocomplete
              multiple
              options={[
                ...new Map([...selected, ...(contractors.data?.data ?? [])].map((row) => [row.id, row])).values(),
              ]}
              value={selected}
              onChange={(_, rows) => setSelected(rows)}
              onInputChange={(_, value) => setSearch(value)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(row) => `${row.code} ${row.name}`}
              loading={assigned.isLoading || contractors.isFetching}
              renderInput={(params) => <TextField {...params} label="Contractors" />}
            />
            <Button variant="text" component={RouterLink} to="/contractors" onClick={() => setAssignment(null)}>
              Create / manage Contractors
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" disabled={saving} onClick={() => setAssignment(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || assigned.isLoading || assigned.isError || contractors.isError}
            onClick={() => void saveAssignments()}
          >
            Save assignments
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
