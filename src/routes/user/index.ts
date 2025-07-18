import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { authenticateRequest } from '../../hooks';
import { updateDiscordId, updateUserName } from '../../services';
import { ERROR_CODES, handleError } from '../../utils';

interface UpdateNameBody {
	Name: string;
}

interface UpdateDiscordIdBody {
	Id: string;
}

const updateSteamNameSchema: FastifySchema = {
	tags: ['User'],
	operationId: 'updateSteamName',
	summary: 'Update the Steam name of the authenticated user',
	description:
		'Allows the authenticated user to update their Steam name. If no name is provided, it will not perform any action.',
	produces: ['application/json'],
	consumes: ['application/json'],
	body: {
		type: 'object',
		properties: {
			Name: {
				type: 'string',
				description: 'New Steam name of the user',
			},
		},
		required: ['Name'],
	},
};

const updateDiscordIdSchema: FastifySchema = {
	tags: ['User'],
	operationId: 'updateDiscordId',
	summary: 'Update the Discord ID of the authenticated user',
	description:
		'Allows the authenticated user to update their Discord ID. If no ID is provided, it will not perform any action.',
	produces: ['application/json'],
	consumes: ['application/json'],
	body: {
		type: 'object',
		properties: {
			Id: {
				type: 'string',
				maxLength: 18,
				minLength: 18,
				pattern: '^[0-9]{18}$', // Discord IDs are 18 digits
				description: 'Discord ID of the user',
			},
		},
		required: ['Id'],
	},
};

export const userRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: UpdateNameBody }>(
		'/updateSteamName',
		{
			preValidation: [authenticateRequest],
			schema: updateSteamNameSchema,
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
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
					return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR));
				}
			}
		},
	);

	app.post<{ Body: UpdateDiscordIdBody }>(
		'/updateDiscordId',
		{
			preValidation: [authenticateRequest],
			schema: updateDiscordIdSchema,
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
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
					return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR));
				}
			}
		},
	);
};
