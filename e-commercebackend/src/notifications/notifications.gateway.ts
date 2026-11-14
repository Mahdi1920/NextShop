import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Reflect origin so credentials work without wildcard origin error
      callback(null, true);
    },
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Active socket clients tracking: socket.id -> { userId, role }
  private readonly activeSockets = new Map<string, { userId?: string; role?: string }>();

  // Debounce timer for presence broadcasts to avoid rapid-fire updates
  private presenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly jwtService: JwtService) {}

  getOnlineUsersCount(): number {
    const userIds = new Set<string>();
    // Count only authenticated non-admin users (by unique userId)
    for (const [, info] of this.activeSockets.entries()) {
      if (!info.userId) continue;
      if (info.role && info.role.toString().toUpperCase() === 'ADMIN') continue;
      userIds.add(info.userId);
    }
    return userIds.size;
  }

  broadcastPresence() {
    if (!this.server) return;
    // Debounce: wait 300ms after the last connect/disconnect before emitting
    // This handles rapid reconnect cycles (e.g. React StrictMode, transport upgrades)
    if (this.presenceTimer) clearTimeout(this.presenceTimer);
    this.presenceTimer = setTimeout(() => {
      const count = this.getOnlineUsersCount();
      this.sendToRole('ADMIN', 'presence:update', { count });
      this.broadcast('presence:update', { count });
      this.logger.log(`Presence broadcast: ${count} online users`);
      this.presenceTimer = null;
    }, 300);
  }

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth || {};
      const query = client.handshake.query || {};
      const rawToken = auth.token || query.token;
      let userId = auth.userId || query.userId;
      let role = auth.role || query.role;

      if (rawToken && typeof rawToken === 'string') {
        const token = rawToken.replace(/^Bearer\s+/i, '');
        try {
          const decoded = this.jwtService.decode(token) as any;
          if (decoded) {
            userId = decoded.sub || decoded.userId || userId;
            role = decoded.role || role;
          }
        } catch (e) {
          this.logger.warn(`Failed to decode JWT on socket connection: ${e}`);
        }
      }

      // Track socket client presence
      this.activeSockets.set(client.id, { userId, role });

      if (userId) {
        const uid = String(userId);
        client.join(`user:${uid}`);
        this.logger.log(`Client ${client.id} joined user:${uid}`);
      }

      if (role) {
        const r = String(role);
        client.join(`role:${r}`);
        client.join(`role:${r.toUpperCase()}`);
        client.join(`role:${r.toLowerCase()}`);
        this.logger.log(`Client ${client.id} joined role:${r}`);
      }

      this.logger.log(
        `Client connected: ${client.id} (user: ${userId}, role: ${role}) - Tracked online: ${this.getOnlineUsersCount()}`,
      );

      // Broadcast updated online count (debounced)
      this.broadcastPresence();

      // Immediately send current count to the newly connected client
      client.emit('presence:update', { count: this.getOnlineUsersCount() });
    } catch (err) {
      this.logger.error(`Error in handleConnection: ${err}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.activeSockets.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} - Tracked online: ${this.getOnlineUsersCount()}`,
    );
    // Broadcast updated online count (debounced)
    this.broadcastPresence();
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { userId?: string; role?: string }) {
    if (payload?.userId) {
      const uid = String(payload.userId);
      client.join(`user:${uid}`);
      const curr = this.activeSockets.get(client.id);
      if (curr) curr.userId = uid;
    }
    if (payload?.role) {
      const r = String(payload.role);
      client.join(`role:${r}`);
      client.join(`role:${r.toUpperCase()}`);
      client.join(`role:${r.toLowerCase()}`);
      const curr = this.activeSockets.get(client.id);
      if (curr) curr.role = r;
    }
    this.broadcastPresence();
    return { status: 'joined', onlineCount: this.getOnlineUsersCount() };
  }

  sendToUser(userId: string, event: string, payload: any) {
    if (!this.server) return;
    const uid = String(userId);
    this.server.to(`user:${uid}`).emit(event, payload);
    this.logger.log(`Emitted [${event}] to user:${uid}`);
  }

  sendToRole(role: string, event: string, payload: any) {
    if (!this.server) return;
    const r = String(role);
    this.server.to(`role:${r}`).emit(event, payload);
    this.server.to(`role:${r.toUpperCase()}`).emit(event, payload);
    this.server.to(`role:${r.toLowerCase()}`).emit(event, payload);
    this.logger.log(`Emitted [${event}] to role:${r}`);
  }

  broadcast(event: string, payload: any) {
    if (!this.server) return;
    this.server.emit(event, payload);
    this.logger.log(`Broadcasted [${event}]`);
  }
}
