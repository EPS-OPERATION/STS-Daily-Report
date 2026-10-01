export interface CreateProjectInput {
  code: string;
  name: string;
  description?: string | null;
  status?: "active" | "inactive";
}
export type UpdateProjectInput = Partial<CreateProjectInput>;
