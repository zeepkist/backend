import { type Task, addJob, defaultJobOptions } from '..';
import { getAllLevelIdsWithRecordsSince } from '../../services';

const task: Task<never> = async (payload, helpers) => {
	const now = new Date();
	const recordsSince = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
	const levels = await getAllLevelIdsWithRecordsSince(recordsSince);

	helpers.logger.info(`Found ${levels.length} levels to update since ${recordsSince.toISOString()}`);

	for (const idLevel of levels) {
		addJob('updateLevelScore', { idLevel }, defaultJobOptions);
	}
};

export default task;
