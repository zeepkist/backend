import { type Task, addJob, defaultJobOptions } from '..';
import { getAllLevelIds, getAllLevelIdsWithRecordsSince } from '../../services';
import { batchProcess } from '../../utils';

interface Payload {
	all?: boolean;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { all = false } = payload;

	const levelIds = all
		? await getAllLevelIds()
		: await getAllLevelIdsWithRecordsSince(new Date(Date.now() - 20 * 60 * 1000));

	helpers.logger.info(
		`Starting updateLevelScores task with all=${all}. Processing ${levelIds.length} levels.`
	);

	for (const batchIds of batchProcess(levelIds)) {
		await Promise.all(
			batchIds.map(idLevel =>
				addJob('updateLevelScore', { idLevel }, defaultJobOptions)
			)
		);
	}
};

export default task;
