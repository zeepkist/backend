import { EventEmitter } from 'node:events';
import { WorkerPreset } from 'graphile-worker';
import { DATABASE_URL } from '../config';

export const events = new EventEmitter();

events.on('job:start', ({ job }) => {
	//console.log(`Worker started job ${job.id}!`);
})

events.on('job:success', ({ job }) => {
	//console.log(`Horrah! Worker completed job ${job.id}!`)
})

events.on('job:error', ({ job, error }) => {
	console.error(`Oh no! Worker failed job ${job.id} with error: ${error}`);
	console.error(error);
})

events.on('job:failed', ({ job }) => {
	console.log(`Oh no! Worker failed job ${job.id}!`);
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
		concurrentJobs: 10,
		fileExtensions: ['.ts'],
		events,
	},
};

export default preset;
