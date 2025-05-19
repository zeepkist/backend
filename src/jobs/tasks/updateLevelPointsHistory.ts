import { type Task, addJob, defaultJobOptions } from '..';
import { getTotalLevelPoints } from '../../services';

const BATCH_SIZE = 200;

const task: Task<never> = async (payload, helpers) => {
	const totalPoints = await getTotalLevelPoints();
	const totalBatches = Math.ceil(totalPoints / BATCH_SIZE);

	for (let index = 0; index < totalBatches; index++) {
		const offset = index * BATCH_SIZE;

		addJob('updateLevelPointsHistoryBatch', { offset, limit: BATCH_SIZE }, defaultJobOptions);
	}
};

export default task;
