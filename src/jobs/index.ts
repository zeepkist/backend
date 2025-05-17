import type { FastifyInstance } from 'fastify';
import { CronJob, validateCronExpression } from 'cron';
import { run, type Helpers } from 'graphile-worker';
import preset from './graphile.config';

import updateLevelScore from './tasks/updateLevelScore';
import updateLevelScores from './tasks/updateLevelScores';
import updatePlayerScore from './tasks/updatePlayerScore';
import updatePlayerScores from './tasks/updatePlayerScores';

export type Task<T = unknown> = (payload: T, helpers: Helpers) => Promise<void>;

const cronJobs: CronJob[] = [];

const cronTimes = {
	everyHour: '0 * * * *', // Every hour
	everyFourHoursAt30: '30 */4 * * *', // Every 4 hours at 30 minutes past the hour
}

const cronTasks = [
	{ task: 'updateLevelScores', cronTime: cronTimes.everyFourHoursAt30 },
	{ task: 'updatePlayerScores', cronTime: cronTimes.everyHour },
]

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

	for (const { task, cronTime } of cronTasks) {
		const validation = validateCronExpression(cronTime);

		if (!validation.valid) {
			app.log.error(`Invalid cron time: ${cronTime}`, validation.error);
			continue;
		}

		const job = CronJob.from({
			cronTime,
			onTick: () => {
				app.log.info(`Running task: ${task}`);
				addJob(task, {}, {
					priority: 1,
					maxAttempts: 1,
				});
			},
			start: true,
			timeZone: 'Europe/London'
		})

		cronJobs.push(job);

		app.log.info(`Job ${task} registered with cron time: ${cronTime}`);
	}

	await runner.promise;
}
