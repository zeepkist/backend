import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { authenticateRequest, verifyModVersion } from '../../hooks';
import {
	getOrInsertLevel,
	getUser,
	insertRecord,
	insertRecordMedia,
	upsertPersonalBest,
	upsertWorldRecord,
} from '../../services';
import { ERROR_CODES, handleError, errorSchema } from '../../utils';

interface SubmitBody {
	Level: string;
	Time: number;
	Splits: number[];
	Speeds: number[];
	GhostData: string;
	GameVersion: string;
	ModVersion: string;
}

const recordSubmitSchema: FastifySchema = {
	tags: ['Record'],
	operationId: 'submitRecord',
	summary: 'Submit a record for a level',
	description: 'Allows authenticated users to submit a record for a specific level.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ GTR: [] }],
	body: {
		type: 'object',
		required: ['Level', 'Time', 'Splits', 'Speeds', 'GhostData', 'GameVersion', 'ModVersion'],
		properties: {
			Level: {
				type: 'string',
				description: 'Level hash of the level being submitted',
			},
			Time: {
				type: 'number',
				description: 'Time taken to complete the level in seconds',
			},
			Splits: {
				type: 'array',
				items: {
					type: 'number',
				},
				description: 'Array of split times for the level',
			},
			Speeds: {
				type: 'array',
				items: {
					type: 'number',
				},
				description: 'Array of speed values for the level',
			},
			GhostData: {
				type: 'string',
				description: 'Serialized ghost data for the record',
			},
			GameVersion: {
				type: 'string',
				description: 'Version of the game used to submit the record',
			},
			ModVersion: {
				type: 'string',
				description: 'Version of the mod used to submit the record',
			},
		},
		examples: [
			{
				Level: '61C096367AFC76A1D2E8024AA638F516912444CC',
				Time: 12.345678,
				Splits: [1.234567, 5.678901, 10.98765],
				Speeds: [123.45, 81.23, 90.12],
				GhostData: '',
				GameVersion: '1.0.0',
				ModVersion: '1.0.0',
			},
		],
	},
	response: {
		200: {
			type: 'object',
			properties: {},
		},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	}
}

export const recordRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: SubmitBody }>(
		'/submit',
		{
			preValidation: [verifyModVersion, authenticateRequest],
			schema: recordSubmitSchema,
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
				}

				const { Level, Time, Splits, Speeds, GhostData, GameVersion, ModVersion } =
					req.body;

				if (!Level || !Time || !Splits || !Speeds || !GhostData || !GameVersion) {
					return reply
						.status(400)
						.send(handleError(ERROR_CODES.RECORD_SUBMIT_MISSING_PARAMS));
				}

				const user = await getUser(authUser.steamid);

				if (!user) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
				}

				const level = await getOrInsertLevel(Level);

				if (!level) {
					return reply.status(400).send(handleError(ERROR_CODES.LEVEL_NOT_FOUND));
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
					return reply.status(400).send(handleError(ERROR_CODES.RECORD_SUBMIT_FAILED));
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
					return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR));
				}
			}
		},
	);
};
