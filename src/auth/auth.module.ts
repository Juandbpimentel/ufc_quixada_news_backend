import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/prisma/prisma.module';
import { UsersModule } from '@/users/users.module';
import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthService } from '@/auth/services/auth.service';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '30d' },
    }),
    forwardRef(() => UsersModule),
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
  ],
  exports: [LocalAuthGuard, JwtAuthGuard, RolesGuard, AuthService],
})
export class AuthModule {}
