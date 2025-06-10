import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import noFavIcon from 'fastify-no-icon';
import JSONB from 'when-json-met-bigint';
import { HOST, PORT } from './config';
import { db as realDb } from './db';
import { fastifyOtelInstrumentation } from './otel';
import { registerRoutes } from './routes';
import { ERROR_CODES, handleError } from './utils';

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

	app.setNotFoundHandler(
		(_, reply) => {
			reply.status(404).send(handleError(ERROR_CODES.GENERIC_NOT_FOUND));
		},
	);

	// Register JSONB support for BigInt
	app.addContentTypeParser('application/json', { parseAs: 'string' }, (_, body, done) => {
		try {
			if (typeof body !== 'string') {
				return done(new Error('Invalid body'));
			}
			const parsed = JSONB.parse(body || '{}');
			done(null, parsed);
		} catch (err) {
			if (err instanceof Error || err === null) {
				done(err);
			}
		}
	});

	app.setErrorHandler((error, req, reply) => {
		req.log.error(error);

		if ('validation' in error || 'validationContext' in error) {
			const response = handleError(ERROR_CODES.GENERIC_INVALID_REQUEST);
			response.error.details = error.validation?.map((e) => (
				e.message || 'Unknown validation error'
			));
			return reply.status(400).send(response);
		}

		switch (error.code) {
			case 'FST_ERR_NOT_FOUND': {
				return reply.status(404).send(handleError(ERROR_CODES.GENERIC_NOT_FOUND));
			}
			case 'FST_ERR_BAD_STATUS_CODE': {
				return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR));
			}
			case 'FST_ERR_CONTENT_TYPE_INVALID':
			case 'FST_ERR_CONTENT_TYPE_UNSUPPORTED': {
				return reply.status(415).send(handleError(ERROR_CODES.GENERIC_INVALID_REQUEST));
			}
			default: {
				const response = handleError(ERROR_CODES.INTERNAL_SERVER_ERROR);
				return reply.status(500).send(response);
			}
		}
	});

	app.decorate('db', db);

	registerRoutes(app);

	return app;
}
