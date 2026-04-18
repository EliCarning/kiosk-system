export type LogLevel = "Info" | "Warning" | "Error" | string;

export interface MachineLog {
  machineName: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}
