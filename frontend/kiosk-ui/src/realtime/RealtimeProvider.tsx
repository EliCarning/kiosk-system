import React, { useEffect } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { dispatchRealtime, RealtimeEvents } from "./events";

const HUB_URL =
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:5226") +
  "/hubs/kiosk";

let sharedConnection: HubConnection | null = null;

const getConnection = (): HubConnection => {
  if (sharedConnection) return sharedConnection;
  sharedConnection = new HubConnectionBuilder()
    .withUrl(HUB_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  sharedConnection.on("MachineUpdated", (payload) =>
    dispatchRealtime(RealtimeEvents.MachineUpdated, payload)
  );
  sharedConnection.on("AlertCreated", (payload) =>
    dispatchRealtime(RealtimeEvents.AlertCreated, payload)
  );
  sharedConnection.on("CommandUpdated", (payload) =>
    dispatchRealtime(RealtimeEvents.CommandUpdated, payload)
  );

  return sharedConnection;
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    const connection = getConnection();
    if (
      connection.state === HubConnectionState.Disconnected
    ) {
      connection.start().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("SignalR connection failed", err);
      });
    }
    return () => {
      // keep connection alive for app lifetime; no-op on unmount
    };
  }, []);

  return <>{children}</>;
};
