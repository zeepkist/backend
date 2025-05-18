import { type Task, addJob, defaultJobOptions } from '..';
import { getTotalUserPoints } from '../../services';

const BATCH_SIZE = 200;

const task: Task<never> = async (payload, helpers) => {
	helpers.logger.info('Update user points history!');

	const totalPoints = await getTotalUserPoints();
	const totalBatches = Math.ceil(totalPoints / BATCH_SIZE);

	for (let index = 0; index < totalBatches; index++) {
		const offset = index * BATCH_SIZE;

		addJob('updateUserPointsHistoryBatch', { offset, limit: BATCH_SIZE }, defaultJobOptions);
	}
};

export default task;
