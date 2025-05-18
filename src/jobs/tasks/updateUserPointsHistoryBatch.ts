import type { Task } from '..';
import { getUserPointsPaginated, insertUserPointsHistories } from '../../services';

interface Payload {
	offset: number;
	limit: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { offset, limit } = payload;

	const points = await getUserPointsPaginated(offset, limit);

	if (points.length === 0) {
		helpers.logger.info('No more user points to process.');
		return;
	}

	helpers.logger.info(`Processing user points batch: ${offset} - ${offset + limit}`);

	await insertUserPointsHistories(points);
};

export default task;
