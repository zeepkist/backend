import type { FastifyPluginAsync } from 'fastify';
import { authenticateRequest } from '../../hooks';
import { updateDiscordId, updateUserName } from '../../services';
import { ERROR_CODES, getErrorMessage } from '../../utils';

interface UpdateNameBody {
	Name: string;
}

interface UpdateDiscordIdBody {
	Id: string;
}

export const userRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: UpdateNameBody }>(
		'/updateSteamName',
		{
			preValidation: [authenticateRequest],
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply
						.status(401)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_USER_NOT_FOUND) });
				}

				const { Name } = req.body;

				if (!Name) {
					return reply.status(200).send();
				}

				await updateUserName(authUser.steamid, Name);

				return reply.status(200).send();
			} catch (error) {
				if (!reply.sent) {
					console.error('Error handling user update request:', error);
					return reply
						.status(500)
						.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
				}
			}
		},
	);

	app.post<{ Body: UpdateDiscordIdBody }>(
		'/updateDiscordId',
		{
			preValidation: [authenticateRequest],
			/*
			schema: {
				body: {
					type: 'object',
					properties: {
						Id: { type: 'string', maxLength: 18 },
					},
					required: ['Id'],
				},
			}
			*/
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply
						.status(401)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_USER_NOT_FOUND) });
				}

				const { Id } = req.body as UpdateDiscordIdBody;

				if (!Id) {
					return reply.status(200).send();
				}

				await updateDiscordId(authUser.steamid, BigInt(Id));

				return reply.status(200).send();
			} catch (error) {
				if (!reply.sent) {
					console.error('Error handling user update request:', error);
					return reply
						.status(500)
						.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
				}
			}
		},
	);
};
