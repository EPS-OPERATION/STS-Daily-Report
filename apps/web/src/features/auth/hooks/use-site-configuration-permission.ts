import { useMe } from "./use-me.js";

export function useCanManageSiteConfiguration(): boolean {
  const me = useMe();
  return !me.isError && me.data?.data.user.canManageSiteConfiguration === true;
}
