import { buildServer } from './server';
import { HOST, PORT } from './config';
import { registerJobs } from './jobs';

const app = await buildServer();

// Start Graphile Worker
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
