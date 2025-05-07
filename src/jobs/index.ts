import type { FastifyInstance } from 'fastify';
import { run, type Helpers } from 'graphile-worker';
import preset from './graphile.config';

import updateLevelScore from './tasks/updateLevelScore';
import updateLevelScores from './tasks/updateLevelScores';
import updatePlayerScore from './tasks/updatePlayerScore';
import updatePlayerScores from './tasks/updatePlayerScores';

export type Task<T = unknown> = (payload: T, helpers: Helpers) => Promise<void>;

const runner = await run({
	preset,
	taskList: {
		updateLevelScore: updateLevelScore as Task,
		updateLevelScores: updateLevelScores as Task,
		updatePlayerScore: updatePlayerScore as Task,
		updatePlayerScores: updatePlayerScores as Task,
	}
});

export const addJob = runner.addJob.bind(runner);

export async function registerJobs(app: FastifyInstance) {
	app.log.info('Registering jobs...');

	await runner.promise;
}
