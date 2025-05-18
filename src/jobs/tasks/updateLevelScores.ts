import { type Task, addJob, defaultJobOptions } from '..';
import { getAllLevelIds } from '../../services';

const task: Task<never> = async (payload, helpers) => {
	helpers.logger.info('Update level scores!');
	const levels = await getAllLevelIds();

	for (const idLevel of levels) {
		helpers.logger.info(`Level, ${idLevel}!`);
		addJob('updateLevelScore', { idLevel }, defaultJobOptions);
	}
};

export default task;
