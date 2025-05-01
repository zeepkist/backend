import { WorkerPreset } from 'graphile-worker';
import { DATABASE_URL } from './src/config';

const preset: GraphileConfig.Preset = {
	extends: [WorkerPreset],
	worker: {
		connectionString: DATABASE_URL,
		maxPoolSize: 10,
		pollInterval: 2000,
		preparedStatements: true,
		taskDirectory: `${__dirname}/src/jobs/tasks`,
		crontabFile: `${__dirname}/src/jobs/crontab`,
		schema: 'graphile_worker',
		concurrentJobs: 5,
		fileExtensions: ['.ts'],
	},
};

export default preset;
