import { useMemo } from "react";
import { useOrganization } from "./useOrganization";
import { Kiosk } from "../types/org";

export interface UseKiosksResult {
  kiosks: Kiosk[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useKiosks(): UseKiosksResult {
  const { org, loading, error, refresh } = useOrganization();

  const kiosks = useMemo<Kiosk[]>(() => {
    if (!org) return [];
    return org.sites.flatMap((s) =>
      s.departments.flatMap((d) => d.kiosks)
    );
  }, [org]);

  return { kiosks, loading, error, refresh };
}
