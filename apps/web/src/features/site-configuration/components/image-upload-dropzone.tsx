import { useEffect, useId, useRef, useState } from "react";
import { Alert, Box, ButtonBase, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

export function ImageUploadDropzone({
  file,
  currentUrl,
  disabled,
  onChange,
}: {
  file: File | null;
  currentUrl?: string | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const choose = (candidate?: File) => {
    setDragging(false);
    if (disabled || !candidate) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(candidate.type) ||
      !candidate.size ||
      candidate.size > 20 * 1024 * 1024
    ) {
      onChange(null);
      setError("Choose a PNG, JPEG or WebP image up to 20 MB.");
      return;
    }
    setError(null);
    onChange(candidate);
  };
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Map image *</Typography>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label="Map image file"
        disabled={disabled}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Paper
        variant="outlined"
        sx={{
          overflow: "hidden",
          borderStyle: "dashed",
          borderColor: dragging ? "primary.main" : "divider",
          bgcolor: dragging ? "action.hover" : "background.default",
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files[0]);
        }}
      >
        <ButtonBase
          disabled={disabled}
          onClick={() => input.current?.click()}
          aria-label="Choose Map image"
          sx={{
            width: "100%",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
          }}
        >
          {preview || currentUrl ? (
            <Box
              component="img"
              src={preview ?? currentUrl!}
              alt={file ? "Selected Map image" : "Current Map image"}
              sx={{ width: "100%", height: 190, objectFit: "contain" }}
            />
          ) : (
            <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
          )}
          <Typography variant="body2">
            {preview || currentUrl
              ? "Click or drop to replace image"
              : "Drop PNG, JPEG or WebP here, or click to browse"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Maximum 20 MB
          </Typography>
        </ButtonBase>
      </Paper>
      {file ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
            {file.name}
          </Typography>
          <IconButton
            size="small"
            aria-label="Clear selected image"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setError(null);
            }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
