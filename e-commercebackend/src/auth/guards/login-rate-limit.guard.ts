import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type LoginRequest = {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
};

type LoginAttemptWindow = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 1 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, LoginAttemptWindow>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<LoginRequest>();
    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();
    const clientIp = request.ip || request.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const current = this.attempts.get(clientIp);

    if (!current || current.resetAt <= now) {
      this.attempts.set(clientIp, { count: 1, resetAt: now + WINDOW_MS });
      this.removeExpiredEntries(now);
      return true;
    }

    if (current.count >= MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }

  private removeExpiredEntries(now: number): void {
    if (this.attempts.size < 10_000) return;
    for (const [ip, window] of this.attempts) {
      if (window.resetAt <= now) this.attempts.delete(ip);
    }
  }
}
