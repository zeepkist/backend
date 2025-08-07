import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import JSONB from 'when-json-met-bigint';
import { COOKIES, FRONTEND_URL, HOST, IS_DEBUG_MODE, PORT } from './config';
import { db as realDb } from './db';
import { fastifyOtelInstrumentation } from './otel';
import { registerRoutes } from './routes';
import { ERROR_CODES, handleError } from './utils';
import { collectHeaderMetrics } from './middleware';

type OpenApi = Partial<OpenAPIV3.Document<object> | OpenAPIV3_1.Document<object>> | undefined;

const openapi: OpenApi = {
	openapi: '3.0.0',
	info: {
		title: 'Zeepkist Community Hub API',
		description:
			"Private API documentation for the Zeepkist Community Hub. This REST interface powers internal services such as the GTR mod in Zeepkist and Web client. If you're looking to integrate with Zeepkist Community Hub as a third-party developer, refer to the public [GraphQL API](https://graphql.zeepki.st) instead.",
		version: '1.1.0',
	},
	servers: [
		{
			url: 'https://backend.zeepki.st',
			description: 'Production',
		},
	],
	components: {
		securitySchemes: {
			Web: {
				type: 'apiKey',
				in: 'cookie',
				name: COOKIES.AccessToken,
				description:
					'Web authentication token for API access.\n\n**Note:** This cookie is set with the `HttpOnly` flag and is not accessible via JavaScript.',
			},
			GTR: {
				type: 'http',
				scheme: 'bearer',
				description: 'GTR authentication token for API access.',
			},
			Job: {
				type: 'http',
				scheme: 'bearer',
				description: 'Job authentication token for triggering jobs.',
			},
		},
	},
};

if (IS_DEBUG_MODE) {
	openapi.servers?.push({
		url: `http://${HOST}:${PORT}`,
		description: 'Development',
	});
}

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

	app.addHook('onRequest', collectHeaderMetrics);

	app.register(helmet, {
		global: true,
		hidePoweredBy: true,
	});

	await app.register(cors, {
		origin: FRONTEND_URL,
		credentials: true, // Allow web auth cookies to be sent
	});

	app.register(cookie);

	await app.register(swagger, {
		openapi,
	});

	/**
	 * Register Swagger UI to the root path
	 */
	await app.register(swaggerUi, {
		routePrefix: '/',
		uiConfig: {
			docExpansion: 'list',
			deepLinking: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
			tryItOutEnabled: false,
			showCommonExtensions: true,
			showExtensions: true,
			syntaxHighlight: {
				activate: true,
				theme: 'agate',
			},
			defaultModelExpandDepth: 2,
			defaultModelsExpandDepth: 2,
			defaultModelRendering: 'example',
			displayRequestDuration: true,
			displayOperationId: false,
			filter: false,
			layout: 'BaseLayout',
		},
		staticCSP: false,
		transformStaticCSP: () => '',
		transformSpecificationClone: true,
		uiHooks: {
			onRequest: (_, reply, done) => {
				// Remove Content Security Policy header
				reply.removeHeader('Content-Security-Policy');
				done();
			},
		},
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

	app.setNotFoundHandler((_, reply) => {
		reply.status(404).send(handleError(ERROR_CODES.GENERIC_NOT_FOUND));
	});

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
			response.error.details = error.validation?.map(
				(e) => e.message || 'Unknown validation error',
			);
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
