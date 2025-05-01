import { exec, execSync } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import type { Task as GraphileTask } from 'graphile-worker';
import { run } from 'graphile-worker';
import preset from '../../graphile.config';

export type Task<T> = (payload: T, helpers: any) => Promise<void>;

const runner = await run({ preset });

export const addJob = runner.addJob.bind(runner);

export async function registerJobs(app: FastifyInstance) {
	app.log.info('Registering jobs...');

	await runner.promise;
}
