import 'fastify';
import type { VerifyResponse } from '../utils/jwt';

declare module 'fastify' {
	interface FastifyRequest {
		user?: VerifyResponse;
		authorisedJob?: boolean;
	}
}
