import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { recordRoutes } from './record';
import { userRoutes } from './user';
import { voteRoutes } from './vote';

export async function registerRoutes(app: FastifyInstance) {
	app.log.info('Registering routes...');

	app.register(authRoutes, { prefix: '/auth' });
	app.register(userRoutes, { prefix: '/user' });
	app.register(recordRoutes, { prefix: '/record' });
	app.register(voteRoutes, { prefix: '/vote' });

	// Ignore favicon in documentation
	app.get('/favicon.ico', {
		schema: { hide: true },
	}, async (_, reply) => {
		return reply.status(204).send();
	});

	// Health check route
	app.get('/healthz', {
		schema: { hide: true }
	}, async (_, reply) => {
		return reply.status(200).send({ status: 'ok' });
	});
}
