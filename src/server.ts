import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import ratelimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import noFavIcon from 'fastify-no-icon';
import JSONB from 'when-json-met-bigint';
import { HOST, PORT } from './config';
import { registerJobs } from './jobs';
import { fastifyOtelInstrumentation } from './otel';
import { registerRoutes } from './routes';

const app = await Fastify({
	logger: {
		transport: {
			target: '@fastify/one-line-logger',
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

registerRoutes(app);

registerJobs(app).catch((error) => {
	app.log.error('Error registering jobs:', error);
	process.exit(1);
});

// Start server
const start = async () => {
	try {
		await app.listen({ port: Number(PORT), host: HOST });
		app.log.info(`Server listening on port ${PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

start();
