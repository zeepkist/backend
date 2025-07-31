import 'fastify';
import type { AccessTokenPayload } from '../utils/jwt';

declare module 'fastify' {
	interface FastifyRequest {
		user?: AccessTokenPayload;
		authorisedJob?: boolean;
	}
}
