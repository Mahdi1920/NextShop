"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@shared/context/session-context";
import { useToast } from "@shared/components/ui/toast";
import { notificationsApi, type NotificationItem } from "@shared/api/notifications";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  onEvent: (event: string, callback: (...args: any[]) => void) => () => void;
};

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
  onEvent: () => () => {},
});

function getSocketServerUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      return envUrl.replace(/\/api(\/.*)?$/, "").replace(/\/+$/, "");
    }
    const host = window.location.hostname || "localhost";
    return `http://${host}:3001`;
  }
  return "http://localhost:3001";
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const { notify } = useToast();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Registry for event subscribers to ensure zero dropped events & stable listener registration
  const listenersRef = React.useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  const onEvent = React.useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);

      return () => {
        listenersRef.current.get(event)?.delete(callback);
      };
    },
    []
  );

  const userId = session.user?._id || (session.user as any)?.id;
  const role = session.role;
  const token = session.accessToken;

  // Stable ref to notify so socket effect doesn't re-run on every render
  const notifyRef = React.useRef(notify);
  React.useEffect(() => { notifyRef.current = notify; }, [notify]);

  // Load notifications
  const refreshNotifications = React.useCallback(async () => {
    if (!session.user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [list, count] = await Promise.all([
        notificationsApi.listMine(100),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Quiet fail if not authenticated yet
    }
  }, [session.user]);

  React.useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  // Connect socket — only after session is resolved (userId known)
  React.useEffect(() => {
    // Don't connect at all if not authenticated
    if (!userId) return;

    const serverUrl = getSocketServerUrl();
    const newSocket = io(serverUrl, {
      auth: { token, userId, role },
      query: { token, userId, role },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      if (userId || role) {
        newSocket.emit("join", { userId, role });
      }
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[Socket.IO] Connection error:", err.message);
      setIsConnected(false);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Universal dispatcher for all registered onEvent subscribers
    newSocket.onAny((event: string, ...args: any[]) => {
      const subscribers = listenersRef.current.get(event);
      if (subscribers && subscribers.size > 0) {
        subscribers.forEach((cb) => {
          try {
            cb(...args);
          } catch (e) {
            console.error(`[Socket.IO] Error in listener for event "${event}":`, e);
          }
        });
      }
    });

    // Handle incoming notifications
    newSocket.on("notification", (incoming: NotificationItem) => {
      setNotifications((prev) => [incoming, ...prev.filter((n) => n._id !== incoming._id)]);
      setUnreadCount((c) => c + 1);

      let variant: "default" | "warning" | "danger" | "success" = "default";
      if (incoming.type === "USER_BLOCKED") variant = "danger";
      else if (incoming.type === "USER_WARNING" || incoming.type === "PRODUCT_OUT_OF_STOCK") variant = "warning";
      else if (incoming.type === "ORDER_CREATED" || incoming.type === "ORDER_OUT_FOR_DELIVERY") variant = "success";

      notifyRef.current({
        title: incoming.title || "Notification",
        message: incoming.message,
        variant,
      });
    });

    // Handle user warnings / bans
    newSocket.on("user:warning", (data: { nbBanned: number; reason?: string }) => {
      notifyRef.current({
        title: `Warning: Strike ${data.nbBanned}/3`,
        message: `You have received a strike warning${data.reason ? ': ' + data.reason : ''}. On the 3rd strike your account will be blocked!`,
        variant: "warning",
      });
    });

    newSocket.on("user:blocked", () => {
      notifyRef.current({
        title: "Account Blocked",
        message: "Your account has been blocked after receiving 3 strikes/bans.",
        variant: "danger",
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, role, token]);

  const markAsRead = React.useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = React.useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        onEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  return React.useContext(SocketContext);
}
