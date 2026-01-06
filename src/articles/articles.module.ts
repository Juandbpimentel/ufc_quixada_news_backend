import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './controllers/articles.controller';
import { AdminArticlesController } from './controllers/admin-articles.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ArticlesController, AdminArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
