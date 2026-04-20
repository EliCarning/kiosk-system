import { useCallback, useEffect, useRef, useState } from "react";
import { createCommand } from "../api/actions";
import { CommandType } from "../types/command";

export type ActionPhase = "sending" | "success" | "error";

export interface ActionFeedback {
  type: CommandType;
  phase: ActionPhase;
  message: string;
}

export interface UseKioskActionsResult {
  pending: CommandType | null;
  feedback: ActionFeedback | null;
  trigger: (type: CommandType, label: string, payload?: string) => Promise<void>;
  clearFeedback: () => void;
}

const FEEDBACK_CLEAR_MS = 4000;

export function useKioskActions(
  machineName: string,
  onSuccess?: () => void
): UseKioskActionsResult {
  const [pending, setPending] = useState<CommandType | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleClear = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, FEEDBACK_CLEAR_MS);
  }, []);

  const trigger = useCallback<UseKioskActionsResult["trigger"]>(
    async (type, label, payload = "") => {
      if (pending) return;
      clearTimer();
      setPending(type);
      setFeedback({
        type,
        phase: "sending",
        message: `Sending ${label}…`,
      });
      try {
        await createCommand(machineName, type, payload);
        setFeedback({
          type,
          phase: "success",
          message: `${label} queued on ${machineName}`,
        });
        if (onSuccess) onSuccess();
        scheduleClear();
      } catch (err) {
        setFeedback({
          type,
          phase: "error",
          message:
            err instanceof Error ? err.message : `${label} failed`,
        });
        scheduleClear();
      } finally {
        setPending(null);
      }
    },
    [pending, machineName, onSuccess, scheduleClear]
  );

  const clearFeedback = useCallback(() => {
    clearTimer();
    setFeedback(null);
  }, []);

  useEffect(() => clearTimer, []);

  return { pending, feedback, trigger, clearFeedback };
}
