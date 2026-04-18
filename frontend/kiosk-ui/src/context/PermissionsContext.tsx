import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchPermissions, UserPermissions } from "../api/permissions";

interface PermissionsState {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_STATE: PermissionsState = {
  permissions: null,
  loading: true,
  error: null,
  refresh: () => undefined,
};

const PermissionsContext = createContext<PermissionsState>(DEFAULT_STATE);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPermissions();
      setPermissions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load permissions"
      );
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<PermissionsState>(
    () => ({ permissions, loading, error, refresh: load }),
    [permissions, loading, error, load]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsState =>
  useContext(PermissionsContext);

export const useCan = () => {
  const { permissions } = usePermissions();
  return {
    view: permissions?.canView ?? false,
    operate: permissions?.canOperate ?? false,
    reboot: permissions?.canReboot ?? false,
  };
};
