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
		return;
	}

	await insertLevelPointsHistories(points);
};

export default task;
