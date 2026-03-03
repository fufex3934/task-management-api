import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

type AuthenticatedUser = { id: string; email: string; role?: string };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    //get the roles required for this route from the custom @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, let everyone in (like a public park)
    if (!requiredRoles) {
      return true;
    }

    const request = context

      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const { user } = request;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
