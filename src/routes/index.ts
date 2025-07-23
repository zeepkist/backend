import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { recordRoutes } from './record';
import { userRoutes } from './user';
import { voteRoutes } from './vote';
import { jobRoutes } from './job';

export async function registerRoutes(app: FastifyInstance) {
	app.log.info('Registering routes...');

	app.register(authRoutes, { prefix: '/auth' });
	app.register(userRoutes, { prefix: '/user' });
	app.register(recordRoutes, { prefix: '/record' });
	app.register(voteRoutes, { prefix: '/vote' });
	app.register(jobRoutes, { prefix: '/job' });

	// Ignore favicon in documentation
	app.get(
		'/favicon.ico',
		{
			schema: { hide: true },
		},
		async (_, reply) => {
			return reply.status(204).send();
		},
	);

	// Health check route
	app.get(
		'/healthz',
		{
			schema: { hide: true },
		},
		async (_, reply) => {
			return reply.status(200).send({ status: 'ok' });
		},
	);
}
