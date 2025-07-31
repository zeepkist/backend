import { CronJob, validateCronExpression } from 'cron';
import type { FastifyInstance } from 'fastify';
import { type Helpers, type TaskSpec, run } from 'graphile-worker';
import { ENABLE_WORKERS } from '../config';
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

const createRunner = () => {
	if (!ENABLE_WORKERS) {
		console.warn('Graphile Worker is disabled. No jobs will be run.');
		return {
			addJob: () => Promise.resolve(),
			stop: () => Promise.resolve(),
			promise: Promise.resolve(),
		};
	}

	return run({
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
		noHandleSignals: true, // Stop Graphile Worker hijacking Fastify graceful shutdown
	});
};

const cronJobs: CronJob[] = [];

const cronTimes = {
	every5MinutesOffset30Seconds: '30 */5 * * * *',
	// 00, 10, 20, 30, 40, 50 minutes past the hour
	every10Minutes: '*/10 * * * *',
	// 5, 15, 25, 35, 45, 55 minutes past the hour
	every10MinutesOffset5Minutes: '5-59/10 * * * *',
	everyHour: '0 * * * *',
	everyHourAt30: '30 * * * *',
	every6Hours: '0 1,7,13,19 * * *',
	every12Hours: '0 0,12 * * *',
	everyDayAtMidnight: '0 0 * * *',
	everyMondayAt1am: '0 1 * * 1',
} as const;

const cronTasks: CronTask[] = [
	// Weekly task to keep level points up-to-date
	{ task: 'updateLevelScores', cronTime: cronTimes.everyMondayAt1am, payload: { all: true } },
	// Near-real-time tasks to keep level points and player points up-to-date
	{ task: 'updateLevelScores', cronTime: cronTimes.every10Minutes, payload: { all: false } },
	{ task: 'updatePlayerScores', cronTime: cronTimes.every5MinutesOffset30Seconds },
	// Daily tasks to keep points histories for levels and users up-to-date
	{ task: 'updateLevelPointsHistory', cronTime: cronTimes.everyHour },
	{ task: 'updateUserPointsHistory', cronTime: cronTimes.every12Hours },
];

export const defaultJobOptions: TaskSpec = {
	priority: 1,
	maxAttempts: 1,
};

const runner = await createRunner();

export const addJob = runner.addJob.bind(runner);

export const stopJobs = runner.stop.bind(runner);

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
