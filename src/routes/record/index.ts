import type { FastifyPluginAsync } from 'fastify';
import {
	getOrInsertLevel,
	getOrInsertUser,
	insertRecord,
	insertRecordMedia,
	upsertPersonalBest,
	upsertWorldRecord,
} from '../../services';
import {
	ERROR_CODES,
	getErrorMessage,
} from '../../utils';
import { authenticateRequest, verifyModVersion } from '../../hooks';

interface SubmitBody {
	Level: string;
	Time: number;
	Splits: number[];
	Speeds: number[];
	GhostData: string;
	GameVersion: string;
	ModVersion: string;
}

export const recordRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: SubmitBody }>('/submit', {
		preValidation: [verifyModVersion, authenticateRequest]
	}, async (req, reply) => {
		try {
			const { user: authUser } = req;

			if (!authUser) {
				return reply
					.status(401)
					.send({ error: getErrorMessage(ERROR_CODES.AUTH_USER_NOT_FOUND) });
			}

			const { Level, Time, Splits, Speeds, GhostData, GameVersion, ModVersion } = req.body;

			if (!Level || !Time || !Splits || !Speeds || !GhostData || !GameVersion) {
				return reply
					.status(400)
					.send({ error: getErrorMessage(ERROR_CODES.RECORD_SUBMIT_MISSING_PARAMS) });
			}

			const user = await getOrInsertUser(authUser.steamid);
			const level = await getOrInsertLevel(Level);

			if (!level) {
				return reply
					.status(400)
					.send({ error: getErrorMessage(ERROR_CODES.LEVEL_NOT_FOUND) });
			}

			const record = await insertRecord({
				idUser: user.id,
				idLevel: level.id,
				time: Time,
				splits: Splits,
				speeds: Speeds,
				modVersion: ModVersion,
				gameVersion: GameVersion,
			});

			if (!record) {
				return reply
					.status(400)
					.send({ error: getErrorMessage(ERROR_CODES.RECORD_SUBMIT_FAILED) });
			}

			await Promise.all([
				await upsertPersonalBest({
					idUser: user.id,
					idLevel: level.id,
					idRecord: record.id,
					time: Time,
				}),
				await upsertWorldRecord({
					idUser: user.id,
					idLevel: level.id,
					idRecord: record.id,
					time: Time,
				}),
				await insertRecordMedia({
					idRecord: record.id,
					ghostData: GhostData,
				}),
			]);
		} catch (error) {
			if (!reply.sent) {
				console.trace('Error handling record request:', error);
				return reply
					.status(500)
					.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
			}
		}
	});
};
