import { EventEmitter } from 'node:events';
import { WorkerPreset } from 'graphile-worker';
import { DATABASE_URL } from '../config';

export const events = new EventEmitter();

events.on('job:start', ({ worker, job }) => {
	console.log(`Worker ${worker.id} started job ${job.id}!`);
})

events.on('job:success', ({ worker, job }) => {
	console.log(`Horrah! Worker ${worker.id} completed job ${job.id}!`)
})

events.on('job:error', ({ worker, job, error }) => {
	console.error(`Oh no! Worker ${worker.id} failed job ${job.id} with error: ${error}`);
})

events.on('job:failed', ({ worker, job }) => {
	console.log(`Oh no! Worker ${worker.id} failed job ${job.id}!`);
})

const preset: GraphileConfig.Preset = {
	extends: [WorkerPreset],
	worker: {
		connectionString: DATABASE_URL,
		maxPoolSize: 10,
		pollInterval: 2000,
		preparedStatements: true,
		//taskDirectory: `${__dirname}/tasks`, // tasks imported by runner
		//crontabFile: `${__dirname}/crontab`,
		schema: 'graphile_worker',
		concurrentJobs: 5,
		fileExtensions: ['.ts'],
		events,
	},
};

export default preset;
