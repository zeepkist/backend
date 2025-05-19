import { type Task, addJob, defaultJobOptions } from '..';
import { getAllLevelIdsWithRecordsSince, getAllLevelIds } from '../../services';

interface Payload {
	all: boolean;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { all = false } = payload;
	let levelIds: number[] = [];

	if (all) {
		levelIds = await getAllLevelIds();

		helpers.logger.info(`Found ${levelIds.length} levels to update`);
	} else {
		const now = new Date();
		const recordsSince = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago

		levelIds = await getAllLevelIdsWithRecordsSince(recordsSince);

		helpers.logger.info(`Found ${levelIds.length} levels to update since ${recordsSince.toISOString()}`);
	}

	for (const idLevel of levelIds) {
		addJob('updateLevelScore', { idLevel }, defaultJobOptions);
	}
};

export default task;
