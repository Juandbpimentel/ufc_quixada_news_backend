import { Request as ExpressRequest } from 'express';
import { User } from '@prisma/client';

export type AuthenticatedRequest = ExpressRequest & {
  user: User;
};
