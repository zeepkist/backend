import { and, eq } from 'drizzle-orm';
import { db, zslLevelResult } from '../db'

export async function upsertZslLevelResult({
	idLevel,
	idUser,
	idRecord,
	position,
	points,
	time
}: {
	idLevel: number;
	idUser: number;
	idRecord?: number;
	position: number;
	points: number;
	time: number;
}) {
	await db.transaction(async (tx) => {
		const [existing] = await tx
			.select(
				{
					idLevel: zslLevelResult.idLevel,
					idUser: zslLevelResult.idUser,
					idRecord: zslLevelResult.idRecord,
					position: zslLevelResult.position,
					points: zslLevelResult.points,
					time: zslLevelResult.time,
				}
			)
			.from(zslLevelResult)
			.where(
				and(
					eq(zslLevelResult.idLevel, idLevel),
					eq(zslLevelResult.idUser, idUser)
				)
			)

		if (existing) {
			await tx
				.update(zslLevelResult)
				.set({ position, points, time, idRecord })
				.where(
					and(
						eq(zslLevelResult.idLevel, idLevel),
						eq(zslLevelResult.idUser, idUser)
					)
				);
		} else {
			await tx
				.insert(zslLevelResult)
				.values({ idLevel, idUser, idRecord, position, points, time });
		}
	});
}
