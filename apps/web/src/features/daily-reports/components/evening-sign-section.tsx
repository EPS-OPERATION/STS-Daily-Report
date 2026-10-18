import { Controller } from "react-hook-form";
import { SectionCard } from "./section-card.js";
import { SignaturePad } from "./signature-pad.js";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningSignSection({ ed }: { ed: UseEveningFormState }) {
  const { hasExistingSignature, control, setValue, formState, watch } = ed;
  return (
    <SectionCard id="sec-sign" index={6} tone="navy" title="ลงนามยืนยัน (Digital Signature)">
      <Stack spacing={1.5}>
        <Controller
          name="signatureName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Reporter name"
              size="small"
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <SignaturePad
          hasExistingSignature={hasExistingSignature && watch("signatureData") === "existing"}
          onChange={(url) => setValue("signatureData", url ?? "", { shouldValidate: formState.isSubmitted })}
          error={formState.errors.signatureData?.message}
        />
      </Stack>
    </SectionCard>
  );
}
