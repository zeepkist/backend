import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { authenticateGtr, authenticateRequest } from '../../hooks';
import { updateDiscordId } from '../../services';
import { ERROR_CODES, errorSchema, handleError } from '../../utils';

interface UpdateNameBody {
	Name: string;
}

interface UpdateDiscordIdBody {
	Id: string;
}

const updateSteamNameSchema: FastifySchema = {
	deprecated: true,
	tags: ['User'],
	operationId: 'updateSteamName',
	summary: 'Update the Steam name of the authenticated user',
	description:
		"Update the logged in user's Steam name. If no name is provided, it will not perform any action.",
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ GTR: [] }],
	body: {
		type: 'object',
		required: ['Name'],
		properties: {
			Name: {
				type: 'string',
				description: 'New Steam name of the user',
			},
		},
		examples: [
			{
				Name: 'John Doe',
			},
		],
	},
	response: {
		200: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
};

const updateDiscordIdSchema: FastifySchema = {
	tags: ['User'],
	operationId: 'updateDiscordId',
	summary: 'Update the Discord ID of the authenticated user',
	description:
		'Link or unlink a Discord account to the logged in user. If the ID is "-1", it will unlink the existing Discord account, otherwise it will link the provided Discord ID to the user.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ GTR: [], Web: [] }],
	body: {
		type: 'object',
		required: ['Id'],
		properties: {
			Id: {
				type: 'string',
				description: 'Discord ID of the user or "-1" to unset',
				oneOf: [
					{
						type: 'string',
						pattern: '^[0-9]{18}$',
						description: 'Link Discord ID',
					},
					{
						type: 'string',
						const: '-1',
						description: 'Unset Discord ID',
					},
				],
			},
		},
		examples: [
			{
				Id: '000000000000000000',
			},
			{
				Id: '-1',
			},
		],
	},
	response: {
		200: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
};

export const userRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: UpdateNameBody }>(
		'/updateSteamName',
		{
			preValidation: [authenticateGtr],
			schema: updateSteamNameSchema,
		},
		async (req, reply) => {
			try {
				const { user: authUser } = req;

				if (!authUser) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
				}

				// This route is deprecated and performs no action.
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
