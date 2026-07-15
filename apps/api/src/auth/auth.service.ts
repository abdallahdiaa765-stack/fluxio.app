import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/common/prisma.service';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

interface AccessTokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * NOTE (see DECISIONS.md): public self-service registration always creates a
   * brand-new tenant with the caller as RESTAURANT_OWNER. Joining an existing
   * tenant as staff is intentionally NOT supported here - that must go through
   * an authenticated, permission-checked "invite user" flow instead, otherwise
   * anyone could self-enroll into someone else's restaurant by guessing/knowing
   * its tenantSlug.
   */
  async register(dto: RegisterDto) {
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });

    if (existingTenant) {
      throw new BadRequestException('This restaurant URL is already taken');
    }

    // No separate email-uniqueness pre-check is needed here: email is only
    // unique *within* a tenant (@@unique([tenantId, email])), and this flow
    // always creates a brand-new tenant, so the new user can never collide
    // with an existing row on that constraint.

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const createdTenant = await tx.tenant.create({
          data: {
            name: dto.tenantName,
            slug: dto.tenantSlug,
            email: dto.email,
            phone: dto.phone,
          },
        });

        await tx.user.create({
          data: {
            tenantId: createdTenant.id,
            email: dto.email,
            username: crypto.randomUUID(),
            password: passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            role: 'RESTAURANT_OWNER',
            isVerified: true,
          },
        });

        return createdTenant;
      });

      return this.login(dto.email, dto.password, tenant.slug);
    } catch (err: any) {
      // Unique constraint race (e.g. slug/email taken between check and create).
      if (err?.code === 'P2002') {
        throw new BadRequestException('Email or restaurant URL is already in use');
      }
      throw err;
    }
  }

  async login(email: string, password: string, tenantSlug: string, meta?: { ip?: string; userAgent?: string }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    // Do not reveal whether the tenant/user/password was the problem -
    // avoids user & tenant enumeration.
    const invalidCredentials = () => new UnauthorizedException('Invalid email, password, or restaurant URL');

    if (!tenant || tenant.isDeleted || !tenant.isActive) {
      throw invalidCredentials();
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!user || user.isDeleted || !user.isActive) {
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const hashedToken = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.refreshToken !== hashedToken ||
      session.refreshExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: invalidate the old session and issue a brand new pair.
    await this.prisma.session.delete({ where: { id: session.id } });

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      ip: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
    });
  }

  async logout(userId: string, accessToken: string) {
    const hashedToken = this.hashToken(accessToken);
    await this.prisma.session.deleteMany({
      where: { userId, token: hashedToken },
    });
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    return { success: true };
  }

  /**
   * Enforces that only the authenticated user themselves (or a SUPER_ADMIN)
   * can trigger a logout-all for a given userId. Prevents any logged-in user
   * from force-logging-out an arbitrary other account.
   */
  assertCanLogoutAll(requestingUser: { userId: string; role: string }, targetUserId: string) {
    if (requestingUser.userId === targetUserId) return;
    if (requestingUser.role === 'SUPER_ADMIN') return;
    throw new ForbiddenException('You can only log out your own sessions');
  }

  private async issueTokens(params: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    ip?: string;
    userAgent?: string;
  }) {
    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const accessPayload: AccessTokenPayload = {
      sub: params.userId,
      email: params.email,
      tenantId: params.tenantId,
      role: params.role,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessExpiration,
    });

    // Pre-generate the session id so it can be embedded in the refresh JWT
    // payload, letting us create the session row in a single insert (no
    // placeholder-then-update, which would otherwise leave a brief window
    // with a non-unique empty refreshToken under concurrent logins).
    const sessionId = crypto.randomUUID();

    const refreshPayload: RefreshTokenPayload = {
      sub: params.userId,
      tenantId: params.tenantId,
      sessionId,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiration,
    });

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: params.userId,
        token: this.hashToken(accessToken),
        refreshToken: this.hashToken(refreshToken),
        ipAddress: params.ip,
        userAgent: params.userAgent,
        expiresAt: addDuration(new Date(), accessExpiration),
        refreshExpiresAt: addDuration(new Date(), refreshExpiration),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    // Fallback: treat unparseable values as 15 minutes so we always fail closed
    // with a short-lived session rather than crash.
    return new Date(base.getTime() + 15 * 60 * 1000);
  }
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return new Date(base.getTime() + value * unitMs);
}
