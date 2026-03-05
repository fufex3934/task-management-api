import { ExecutionContext, Injectable,CanActivate } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";


@Injectable()
export class WsJwtGuard implements CanActivate{
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ){}

    async canActivate(context:ExecutionContext):Promise<boolean>{
        try {
            const client:Socket = context.switchToWs().getClient();

             // Get token from multiple possible locations
      const token = 
        client.handshake.auth.token ||
        client.handshake.headers.authorization ||
        client.handshake.query.token;

        if(!token){
            throw new WsException('Missing token');
        }

        // Extract bearer token if present
      const actualToken = token.replace('Bearer ', '');

      // Verify JWT
      const payload = this.jwtService.verify(actualToken, {
        secret: this.configService.get('jwt.secret'),
      });

      // Attach user to socket
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
        } catch (error) {
            throw new WsException('Invalid token');
        }
    }
}