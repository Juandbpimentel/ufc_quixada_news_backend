import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { ArticlesModule } from '@/articles/articles.module';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ArticlesModule],
  controllers: [AppController],
})
export class AppModule {}
