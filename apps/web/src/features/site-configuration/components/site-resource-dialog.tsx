import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { siteOperationsApi as api } from "@/services/site-operations.api.js";

type Kind = "map" | "view" | "facility" | "part";
export interface SiteResourceEditor {
  kind: Kind;
  id?: string;
  parentId?: string;
  initial?: {
    name?: string;
    code?: string | null;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    isDefault?: boolean;
    imageUrl?: string | null;
  };
}
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().max(50),
  description: z.string().max(2000),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  isDefault: z.boolean(),
});
type Values = z.infer<typeof schema>;
function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened. Use PNG, JPEG or WebP."));
    };
    image.src = url;
  });
}

export function SiteResourceDialog({
  editor,
  projectId,
  onClose,
  onSaved,
}: {
  editor: SiteResourceEditor;
  projectId: string;
  onClose: () => void;
  onSaved: (kind: Kind, id: string) => Promise<void>;
}) {
  const [savedId, setSavedId] = useState(editor.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editor.initial?.name ?? "",
      code: editor.initial?.code ?? "",
      description: editor.initial?.description ?? "",
      sortOrder: editor.initial?.sortOrder ?? 0,
      isActive: editor.initial?.isActive ?? true,
      isDefault: editor.initial?.isDefault ?? false,
    },
  });
  const submit = handleSubmit(async (values) => {
    if (editor.kind === "part" && !values.code) {
      setFieldError("code", { message: "Part code is required" });
      return;
    }
    if (editor.kind === "view" && !editor.id && !file) {
      setError("Choose an image for this View.");
      return;
    }
    setError(null);
    try {
      let id = savedId;
      if (editor.kind === "map")
        id = (
          await api.saveMap(projectId, id, {
            name: values.name,
            description: values.description,
            isActive: values.isActive,
            isDefault: values.isDefault,
          })
        ).data.id;
      if (editor.kind === "facility")
        id = (
          await api.saveFacility(projectId, id, {
            name: values.name,
            code: values.code,
            isActive: values.isActive,
            sortOrder: values.sortOrder,
          })
        ).data.id;
      if (editor.kind === "part")
        id = (
          await api.savePart(editor.parentId!, id, {
            name: values.name,
            code: values.code,
            isActive: values.isActive,
            sortOrder: values.sortOrder,
          })
        ).data.id;
      if (editor.kind === "view") {
        const dimensions = file ? await imageDimensions(file) : null;
        id = (
          await api.saveView(editor.parentId!, id, {
            name: values.name,
            sortOrder: values.sortOrder,
            isActive: !editor.id && file ? false : values.isActive,
          })
        ).data.id;
        setSavedId(id);
        if (file && dimensions) {
          await api.uploadImage(id, file, dimensions.width, dimensions.height);
          await api.saveView(editor.parentId!, id, {
            name: values.name,
            sortOrder: values.sortOrder,
            isActive: values.isActive,
          });
        }
      }
      await onSaved(editor.kind, id!);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Changes could not be saved.");
    }
  });
  const label = { map: "Map", view: "View", facility: "Facility", part: "Work Part" }[editor.kind];
  return (
    <Dialog open onClose={() => !isSubmitting && onClose()} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>
          {editor.id ? "Edit" : "Add"} {label}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label={`${label} name`}
              {...register("name")}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            {editor.kind === "facility" || editor.kind === "part" ? (
              <TextField
                label={editor.kind === "part" ? "Part code" : "Code (optional)"}
                {...register("code")}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
            ) : null}
            {editor.kind === "map" ? (
              <TextField label="Description" multiline rows={2} {...register("description")} />
            ) : (
              <TextField
                label="Display order"
                type="number"
                {...register("sortOrder")}
                error={!!errors.sortOrder}
                helperText={errors.sortOrder?.message}
              />
            )}
            {editor.kind === "view" ? (
              <>
                <Typography component="label" htmlFor="site-view-image">
                  Map image
                </Typography>
                <input
                  id="site-view-image"
                  aria-label="Map image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <Typography variant="caption" color="text.secondary">
                  PNG, JPEG or WebP, up to 20 MB. {editor.id ? "Choose a file to replace the image." : ""}
                </Typography>
                {editor.initial?.imageUrl ? (
                  <Box
                    component="img"
                    src={editor.initial.imageUrl}
                    alt="Current Map View"
                    sx={{ width: "100%", maxHeight: 180, objectFit: "contain" }}
                  />
                ) : null}
              </>
            ) : null}
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  label="Active"
                  control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                />
              )}
            />
            {editor.kind === "map" ? (
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    label="Default Map"
                    control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  />
                )}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} variant="contained" type="submit">
            {isSubmitting ? "Saving…" : `Save ${label}`}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
