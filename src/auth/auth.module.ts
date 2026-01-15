import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/prisma/prisma.module';
import { UsuariosModule } from '@/users/users.module';
import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthService } from '@/auth/services/auth.service';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { MeuContatoService } from '@/auth/meu-contato.service';
import { PasswordResetService } from '@/auth/password-reset.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '30d' },
    }),
    forwardRef(() => UsuariosModule),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    RolesGuard,
    MeuContatoService,
    PasswordResetService,
  ],
  exports: [
    LocalAuthGuard,
    JwtAuthGuard,
    RolesGuard,
    AuthService,
    PasswordResetService,
  ],
})
export class AuthModule {}
