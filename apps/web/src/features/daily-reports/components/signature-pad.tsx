import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";

// Tap/draw-to-sign pad. Emits a PNG data URL once the user has drawn a stroke,
// null after "clear". Pointer events cover mouse, pen and touch.
export function SignaturePad({
  onChange,
  error,
  disabled,
}: {
  onChange: (dataUrl: string | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  // Match the backing store to the rendered size (sharp lines on high-DPI phones).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = theme.palette.text.primary;
  }, [theme.palette.text.primary]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // A single tap still leaves a visible dot.
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setSigned(true);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(null);
  };

  return (
    <Stack spacing={0.75}>
      <Box
        sx={{
          position: "relative",
          border: 1.5,
          borderStyle: "dashed",
          borderColor: error ? "error.main" : signed ? "primary.main" : "divider",
          borderRadius: 2,
          bgcolor: "grey.50",
          height: 140,
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="ช่องเซ็นชื่อ"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          style={{ width: "100%", height: "100%", touchAction: "none", display: "block", cursor: "crosshair" }}
        />
        {!signed ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}
          >
            แตะหรือลากนิ้วเพื่อเซ็นชื่อ
          </Typography>
        ) : null}
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color={error ? "error" : "text.secondary"}>
          {error ?? "Prepared by Contractor"}
        </Typography>
        <Button size="small" variant="text" onClick={clear} disabled={!signed || disabled}>
          ล้างลายเซ็น
        </Button>
      </Stack>
    </Stack>
  );
}
