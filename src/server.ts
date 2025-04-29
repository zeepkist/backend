import Fastify from 'fastify';
import JSONB from 'when-json-met-bigint';
import { HOST, PORT } from './config';
import { registerJobs } from './jobs';
import { registerRoutes } from './routes';

const app = Fastify({
	logger: true,
});

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
