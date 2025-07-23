import type { Task } from '..';
import { getChangedLevelPointsPaginated, insertLevelPointsHistories } from '../../services';

interface Payload {
	offset: number;
	limit: number;
}

/**
 * Processes a batch of level points by fetching them with pagination and inserting their histories.
 * Skips the batch if no points are found for the given offset and limit.
 *
 * @param payload - Contains the offset and limit for pagination.
 * @param helpers - Provides utility functions such as logging.
 */
const task: Task<Payload> = async (payload, helpers) => {
	const { offset, limit } = payload;

	try {
		const points = await getChangedLevelPointsPaginated(offset, limit);

		if (points.length === 0) {
			return;
		}

		await insertLevelPointsHistories(points);
	} catch (error) {
		helpers.logger.error(`Failed to process level points batch at offset ${offset}:`, {
			error,
			offset,
			limit,
		});
	}
};

export default task;
