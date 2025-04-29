import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const file = Bun.file(join(__dirname, './levelScores.json'));
const content = await file.text();

const levelScores = JSON.parse(content);
const levelScoresMap = new Map<string, number>(
	Object.entries(levelScores).map(([key, value]) => [key, value as number]),
);

const highestScore = Math.max(...Array.from(levelScoresMap.values()));

const lowestScore = Math.min(...Array.from(levelScoresMap.values()));

const averageScore =
	Array.from(levelScoresMap.values()).reduce((a, b) => a + b, 0) / levelScoresMap.size;

const medianScore = Array.from(levelScoresMap.values()).sort((a, b) => a - b)[
	Math.floor(levelScoresMap.size / 2)
];

const stdDevScore = Math.sqrt(
	Array.from(levelScoresMap.values()).reduce((a, b) => a + (b - averageScore) ** 2, 0) /
		levelScoresMap.size,
);

const varianceScore = stdDevScore ** 2;

const scoreRange = highestScore - lowestScore;

const scoreDistribution = Array.from(levelScoresMap.values()).reduce((acc, score) => {
	const bucket = Math.floor((score - lowestScore) / (scoreRange / 10));
	acc[bucket] = (acc[bucket] || 0) + 1;
	return acc;
}, Array(10).fill(0));

const bucketRanges = Array.from({ length: 10 }, (_, i) => {
	const start = lowestScore + i * (scoreRange / 10);
	const end = start + scoreRange / 10;
	return { start, end };
});

bucketRanges.forEach((range, index) => {
	console.log(
		`Bucket ${index + 1}: ${range.start.toFixed(2)} - ${range.end.toFixed(2)}, Count: ${scoreDistribution[index]}`,
	);
});

const scoreDistributionPercentages = scoreDistribution.map(
	(count) => (count / levelScoresMap.size) * 100,
);

console.log('Highest Score:', highestScore);
console.log('Lowest Score:', lowestScore);
console.log('Average Score:', averageScore);
console.log('Median Score:', medianScore);
console.log('Standard Deviation:', stdDevScore);
console.log('Variance:', varianceScore);
console.log('Score Range:', scoreRange);
console.log('Score Distribution:', scoreDistribution);
console.log('Score Distribution Percentages:', scoreDistributionPercentages);
console.log('Bucket Ranges:', bucketRanges);

// log the top 10 levels by score
const top10Levels = Array.from(levelScoresMap.entries())
	.sort((a, b) => b[1] - a[1])
	.slice(0, 10)
	.map(([id, score]) => ({ id, score }));

console.log('Top 10 Levels by Score:');

for (const level of top10Levels) {
	console.log(`- Level \`${level.id}\` with \`${level.score}\` pts`);
}
