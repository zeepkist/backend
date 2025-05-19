import { CronJob, validateCronExpression } from 'cron';
import type { FastifyInstance } from 'fastify';
import { type Helpers, type TaskSpec, run } from 'graphile-worker';
import preset from './graphile.config';

import updateLevelPointsHistory from './tasks/updateLevelPointsHistory';
import updateLevelPointsHistoryBatch from './tasks/updateLevelPointsHistoryBatch';
import updateLevelScore from './tasks/updateLevelScore';
import updateLevelScores from './tasks/updateLevelScores';
import updatePlayerScore from './tasks/updatePlayerScore';
import updatePlayerScores from './tasks/updatePlayerScores';
import updateUserPointsHistory from './tasks/updateUserPointsHistory';
import updateUserPointsHistoryBatch from './tasks/updateUserPointsHistoryBatch';

export type Task<T = unknown> = (payload: T, helpers: Helpers) => Promise<void>;

interface CronTask {
	task: string;
	cronTime: string;
	payload?: object;
}

const cronJobs: CronJob[] = [];

const cronTimes = {
	everyHour: '0 * * * *', // Every hour
	everyFourHoursAt30: '30 */4 * * *', // Every 4 hours at 30 minutes past the hour
	everyDayAtMidnight: '0 0 * * *',
	everyMondayAt1am: '0 1 * * 1',
} as const;

const cronTasks: CronTask[] = [
	{ task: 'updateLevelScores', cronTime: cronTimes.everyMondayAt1am, payload: { all: true } },
	{ task: 'updateLevelScores', cronTime: cronTimes.everyFourHoursAt30 },
	{ task: 'updatePlayerScores', cronTime: cronTimes.everyHour },
	{ task: 'updateLevelPointsHistory', cronTime: cronTimes.everyDayAtMidnight },
	{ task: 'updateUserPointsHistory', cronTime: cronTimes.everyDayAtMidnight },
];

export const defaultJobOptions: TaskSpec = {
	priority: 1,
	maxAttempts: 1,
};

const runner = await run({
	crontabFile: '', // Disable reading crontab
	preset,
	taskList: {
		updateLevelPointsHistory: updateLevelPointsHistory as Task,
		updateLevelPointsHistoryBatch: updateLevelPointsHistoryBatch as Task,
		updateLevelScore: updateLevelScore as Task,
		updateLevelScores: updateLevelScores as Task,
		updatePlayerScore: updatePlayerScore as Task,
		updatePlayerScores: updatePlayerScores as Task,
		updateUserPointsHistory: updateUserPointsHistory as Task,
		updateUserPointsHistoryBatch: updateUserPointsHistoryBatch as Task,
	},
});

export const addJob = runner.addJob.bind(runner);

export async function registerJobs(app: FastifyInstance) {
	app.log.info('Registering jobs...');

	for (const { task, cronTime, payload } of cronTasks) {
		const validation = validateCronExpression(cronTime);

		if (!validation.valid) {
			app.log.error(`Invalid cron time: ${cronTime}`, validation.error);
			continue;
		}

		const job = CronJob.from({
			cronTime,
			onTick: () => {
				app.log.info(`Running task: ${task}`);
				addJob(task, payload ?? {}, defaultJobOptions);
			},
			start: true,
			timeZone: 'Europe/London',
		});

		cronJobs.push(job);

		app.log.info(`Job ${task} registered with cron time: ${cronTime}`);
	}

	await runner.promise;
}
