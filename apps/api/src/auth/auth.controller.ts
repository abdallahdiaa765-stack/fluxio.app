import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; tenantId: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, dto.tenantSlug, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Dedicated login endpoint for the super-admin control panel. Deliberately
  // does not accept tenantSlug and rejects anyone whose role isn't
  // SUPER_ADMIN (see AuthService.adminLogin).
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.logout(req.user.userId, token);
  }

  // Body no longer accepts a userId: logging out "all sessions" for someone
  // other than yourself now requires SUPER_ADMIN (see AuthService.assertCanLogoutAll).
  // This closes the IDOR where any authenticated user could force-logout anyone.
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: AuthenticatedRequest, @Body('userId') targetUserId?: string) {
    const userId = targetUserId ?? req.user.userId;
    this.authService.assertCanLogoutAll(req.user, userId);
    return this.authService.logoutAll(userId);
  }
}
