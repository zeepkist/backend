export function* batchProcess<T>(items: T[], batchSize = 20): Generator<T[]> {
	for (let i = 0; i < items.length; i += batchSize) {
		yield items.slice(i, i + batchSize);
	}
}
