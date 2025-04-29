import type { FastifyPluginAsync } from 'fastify';
import { updateDiscordId, updateUserName } from '../../services';
import { ERROR_CODES, authenticateRequest, getErrorMessage } from '../../utils';

interface UpdateNameBody {
	Name: string;
}

interface UpdateDiscordIdBody {
	DiscordId: string;
}

export const userRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: UpdateNameBody }>('/updateSteamName', async (req, reply) => {
		try {
			const { steamid } = await authenticateRequest(req, reply, req.url);
			const { Name } = req.body;

			if (!Name) {
				return reply.status(200).send();
			}

			await updateUserName(steamid, Name);

			return reply.status(200).send();
		} catch (error) {
			if (!reply.sent) {
				console.error('Error handling user update request:', error);
				return reply
					.status(500)
					.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
			}
		}
	});

	app.post<{ Body: UpdateDiscordIdBody }>('/updateDiscordId', async (req, reply) => {
		try {
			const { steamid } = await authenticateRequest(req, reply, req.url);
			const { DiscordId } = req.body as UpdateDiscordIdBody;

			if (!DiscordId) {
				return reply.status(200).send();
			}

			await updateDiscordId(steamid, DiscordId);

			return reply.status(200).send();
		} catch (error) {
			if (!reply.sent) {
				console.error('Error handling user update request:', error);
				return reply
					.status(500)
					.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
			}
		}
	});
};
