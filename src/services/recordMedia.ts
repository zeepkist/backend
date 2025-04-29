import { GHOST_FOLDER } from '../config';
import { db, recordMedia } from '../db';
import { uploadFile } from '../s3';
import { generateUid } from '../utils';

interface InsertRecordMedia {
	idRecord: number;
	ghostData: string;
}

export async function insertRecordMedia({ idRecord, ghostData }: InsertRecordMedia) {
	const now = new Date().toISOString();
	const uid = generateUid();
	const ghostUrl = `${GHOST_FOLDER}/${uid}.bin`;

	uploadFile(ghostUrl, Buffer.from(ghostData, 'base64'));

	const result = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(recordMedia)
			.values({
				idRecord,
				ghostUrl,
				dateCreated: now,
				dateUpdated: now,
			})
			.returning();

		return inserted;
	});

	if (!result) {
		throw new Error(`Failed to insert record media for record ${idRecord}`);
	}

	console.debug(`Record media for record ${idRecord} inserted (${result.id})`);

	return result;
}
