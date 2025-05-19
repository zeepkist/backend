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
		return;
	}

	await insertUserPointsHistories(points);
};

export default task;
