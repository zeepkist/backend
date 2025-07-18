import { HOST, PORT } from './config';
import { registerJobs, stopJobs } from './jobs';
import { buildServer } from './server';

const app = await buildServer();

// Start Graphile Worker
registerJobs(app).catch(async (error) => {
	app.log.error('Error registering jobs:', error);

	await app.close();

	process.exit(1);
});

const startServer = async () => {
	try {
		await app.listen({ port: Number(PORT), host: HOST });
		app.log.info(`Server listening on port ${PORT}`);
	} catch (err) {
		app.log.error(err);

		await app.close();

		process.exit(1);
	}
};

const gracefulShutdown = async (signal: string) => {
	console.log(`Received ${signal}. Closing server...`);

	try {
		await Promise.all([app.close(), stopJobs()]);
		console.log('Server closed');
	} catch (err) {
		console.error('Error closing server:', err);
	} finally {
		process.exit(0);
	}
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer();
