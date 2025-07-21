import { type Task, addJob, defaultJobOptions } from '..';
import { getTotalUserPoints } from '../../services';

const BATCH_SIZE = 200;

const task: Task<never> = async (_payload, _helpers) => {
	const totalPoints = await getTotalUserPoints();
	const totalBatches = Math.ceil(totalPoints / BATCH_SIZE);

	for (let index = 0; index < totalBatches; index++) {
		const offset = index * BATCH_SIZE;

		await addJob('updateUserPointsHistoryBatch', { offset, limit: BATCH_SIZE }, defaultJobOptions);
	}
};

export default task;
