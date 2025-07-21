import type { Task } from '..';
import { getUserPointsPaginated, insertUserPointsHistories } from '../../services';

interface Payload {
	offset: number;
	limit: number;
}

const task: Task<Payload> = async (payload, helpers) => {
	const { offset, limit } = payload;

	const points = await getUserPointsPaginated(offset, limit);

	// No points to process
	if (points.length === 0) {
		return;
	}

	try {
		await insertUserPointsHistories(points);
	} catch (error) {
		helpers.logger.error(`Failed to process user points batch at offset ${offset}:`, {
			error,
			offset,
			limit,
		});
	}
};

export default task;
