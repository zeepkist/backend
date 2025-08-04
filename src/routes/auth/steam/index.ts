import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { getOrInsertUser, insertAuth } from '../../../services';
import {
	type SteamCallbackRequest,
	getSteamRedirectUrl,
	isSteamLoginSignatureValid,
} from '../../../steam';
import {
	ERROR_CODES,
	errorSchema,
	generateAccessToken,
	generateRefreshToken,
	handleError,
	jwtProvider,
	setWebCookies,
} from '../../../utils';

const steamRedirectSchema: FastifySchema = {
	tags: ['Authentication (Web)'],
	operationId: 'steamRedirect',
	summary: 'Steam OpenID Redirect',
	description: 'Redirects to Steam OpenID for authentication.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [],
	response: {
		302: {},
	},
};

const steamCallbackSchema: FastifySchema = {
	tags: ['Authentication (Web)'],
	operationId: 'steamCallback',
	summary: 'Steam OpenID Callback',
	description: 'Handles the callback from Steam OpenID after user authentication.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [],
	querystring: {
		type: 'object',
		required: ['openid.identity'],
		properties: {
			'openid.identity': {
				type: 'string',
				description: 'Steam OpenID identity URL',
			},
		},
	},
	response: {
		302: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
};

export const steamAuthRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		'/redirect',
		{
			preValidation: [],
			schema: steamRedirectSchema,
		},
		async (_req, reply) => {
			reply.redirect(getSteamRedirectUrl(), 302);
		},
	);

	app.get<{ Querystring: SteamCallbackRequest }>(
		'/callback',
		{
			preValidation: [],
			schema: steamCallbackSchema,
		},
		async (req, reply) => {
			const { 'openid.identity': steamIdentity } = req.query;

			const isValid = await isSteamLoginSignatureValid(req.query);

			if (!isValid) {
				return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
			}

			const steamId = steamIdentity.split('/').pop();

			if (!steamId) {
				return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
			}

			const user = await getOrInsertUser(steamId);
			const { accessToken, accessTokenExpiry } = await generateAccessToken({
				provider: jwtProvider.steam,
				steamId,
			});
			const { refreshToken, refreshTokenExpiry } = generateRefreshToken();

			await insertAuth({
				user,
				accessToken,
				accessTokenExpiry,
				refreshToken,
				refreshTokenExpiry,
				provider: jwtProvider.steam,
			});

			setWebCookies({
				reply,
				accessToken,
				refreshToken,
				steamId: steamId,
				accessTokenExpiry,
				refreshTokenExpiry,
				shouldRedirect: true,
			});
		},
	);
};
