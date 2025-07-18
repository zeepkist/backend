import { type Task, addJob, defaultJobOptions } from '..';
import { getAllLevelIds, getAllLevelIdsWithRecordsSince } from '../../services';

async function* getLevelIdsGenerator(all: boolean): AsyncGenerator<number> {
	if (all) {
		for (const id of await getAllLevelIds()) yield id;
	} else {
		const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
		for (const id of await getAllLevelIdsWithRecordsSince(since)) yield id;
	}
}

interface Payload {
	all: boolean;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { all = false } = payload;

	helpers.logger.info(`Starting updateLevelScores task with all=${all}`);

	for await (const idLevel of getLevelIdsGenerator(all)) {
		addJob('updateLevelScore', { idLevel }, defaultJobOptions);
	}
};

export default task;
