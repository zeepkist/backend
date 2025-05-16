import { addJob, type Task } from '..';
import {
	getAllLevelIds,
} from '../../services';

const task: Task<never> = async (payload, helpers) => {
	helpers.logger.info('Update level scores!');
	const levels = await getAllLevelIds();

	for (const idLevel of levels) {
		helpers.logger.info(`Level, ${idLevel}!`);
		addJob('updateLevelScore', { idLevel }, {
			priority: 1,
			maxAttempts: 3,
		});
	}
};

export default task;
