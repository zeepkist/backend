import type { Task } from '../../jobs';
import {
	batchUpdateLevelPoints,
	getAllRankedPersonalBests,
	getTotalUsers,
	getVoteRatings,
} from '../../services';
import { calculateLevelPoints } from '../../utils';

const task: Task<never> = async (payload, helpers) => {
	helpers.logger.info(`Update level scores!`);

	const rankedPersonalBests = await getAllRankedPersonalBests(); // TODO: Add pagination
	const totalUsers = await getTotalUsers();
	const levelRatings = await getVoteRatings();

	const top10PerLevel = rankedPersonalBests.filter((pb) => Number(pb.position) <= 10);

	// Group top10PerLevel by idLevel
	const levels = new Map<number, typeof rankedPersonalBests>();
	const levelScores = new Map<number, number>();

	for (const pb of top10PerLevel) {
		if (!levels.has(pb.idLevel)) {
			levels.set(pb.idLevel, []);
		}
		levels.get(pb.idLevel)?.push(pb);
	}

	// Calculate level points for each level
	for (const [idLevel, personalBests] of levels) {
		const score = calculateLevelPoints({
			topTimes: personalBests.map((pb) => pb.time),
			personalBests: personalBests.length,
			totalUsers,
			levelRating: levelRatings.find((vote) => vote.idLevel === idLevel)?.percentage ?? 0,
		});

		levelScores.set(idLevel, score.points);
	}

	await batchUpdateLevelPoints(levelScores);
};

export default task;
