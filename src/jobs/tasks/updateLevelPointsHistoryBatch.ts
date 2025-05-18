import type { Task } from '..';
import { getLevelPointsPaginated, insertLevelPointsHistories } from '../../services';

interface Payload {
	offset: number;
	limit: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { offset, limit } = payload;

	const points = await getLevelPointsPaginated(offset, limit);

	if (points.length === 0) {
		helpers.logger.info('No more level points to process.');
		return;
	}

	helpers.logger.info(`Processing level points batch: ${offset} - ${offset + limit}`);

	await insertLevelPointsHistories(points);
};

export default task;
