import Typography from "@mui/material/Typography";
import { useContractor } from "../hooks/use-contractor.js";

export function ContractorDetail({ id }: { id: string }) {
  const query = useContractor(id);
  if (query.isLoading) return <Typography>Loading…</Typography>;
  if (query.isError) return <Typography color="error">Failed to load contractor</Typography>;
  if (!query.data) return null;
  return <Typography variant="h6">{query.data.data.name}</Typography>;
}
