import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import ratelimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import noFavIcon from 'fastify-no-icon';
import JSONB from 'when-json-met-bigint';
import { HOST, PORT } from './config';
import { db as realDb } from './db';
import { fastifyOtelInstrumentation } from './otel';
import { registerRoutes } from './routes';

export async function buildServer(db = realDb) {
	const app = await Fastify({
		logger: {
			serializers: {
				res(reply) {
					return {
						statusCode: reply.statusCode,
					};
				},
				req(request) {
					return {
						method: request.method,
						path: request.routeOptions?.url,
						query: request.query,
					};
				},
			},
		},
	});

	await app.register(fastifyOtelInstrumentation.plugin());

	await app.register(swagger, {
		openapi: {
			openapi: '3.0.0',
			info: {
				title: 'Zeepkist Community Hub API',
				description: 'API documentation for the Zeepkist Community Hub',
				version: '1.0.0',
			},
			servers: [
				{
					url: `http://${HOST}:${PORT}`,
					description: 'Development server',
				},
				{
					url: 'https://backend.zeepki.st',
					description: 'Production server',
				},
			],
		},
	});

	await app.register(swaggerUi, {
		routePrefix: '/docs',
		uiConfig: {
			docExpansion: 'full',
			deepLinking: true,
		},
		staticCSP: true,
		transformSpecificationClone: true,
		/*
		logo: {
			type: 'image/png',
			content: Buffer.from('', 'base64'),
			href: '/docs',
			target: '_blank'
		},
		theme: {
			favicon: [
				filename: 'favicon.png',
				rel: 'icon',
				sizes: '16x16',
				type: 'image/png',
				content: Buffer.from('', 'base64'),
			],
		},
		*/
	});

	app.register(helmet, {
		global: true,
	});

	app.register(noFavIcon);

	await app.register(cors, {
		origin: '*',
		maxAge: 86400,
	});

	await app.register(ratelimit, {
		max: 100,
		timeWindow: '1 minute',
		exponentialBackoff: true,
	});

	// Aggresively rate limit 404 routes
	app.setNotFoundHandler(
		{
			preHandler: app.rateLimit({
				max: 100, // TODO: decrease to 2 once GTR mod is live
				timeWindow: '5 minutes',
				exponentialBackoff: true,
			}),
		},
		(_, reply) => {
			reply.status(404).send({
				error: 'Not Found',
				message: 'The requested resource was not found on this server.',
			});
		},
	);

	// Register JSONB support for BigInt
	app.addContentTypeParser('application/json', { parseAs: 'string' }, (_, body, done) => {
		try {
			if (typeof body !== 'string') {
				return done(new Error('Invalid body'));
			}
			const parsed = JSONB.parse(body);
			done(null, parsed);
		} catch (err) {
			if (err instanceof Error || err === null) {
				done(err);
			}
		}
	});

	app.decorate('db', db);

	registerRoutes(app);

	return app;
}
