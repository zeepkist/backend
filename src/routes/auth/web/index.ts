import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { COOKIES } from '../../../config';
import { deleteAuth, getAuth, getUser, insertAuth } from '../../../services';
import {
	ERROR_CODES,
	generateAccessToken,
	generateRefreshToken,
	handleError,
	jwtProvider,
	setWebCookies,
	errorSchema
} from '../../../utils';

const webRefreshSchema: FastifySchema = {
	tags: ['Authentication (Web)'],
	operationId: 'webRefresh',
	summary: 'Refresh access tokens for Steam/Discord authentication',
	description: 'Refreshes the access token and refresh token for the authenticated user using cookies.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ Web: [] }],
	response: {
		200: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
};

export const webAuthRoutes: FastifyPluginAsync = async (app) => {
	app.post(
		'/refresh',
		{
			preValidation: [],
			schema: webRefreshSchema,
		},
		async (req, reply) => {
			const cookieAccessToken = req.cookies?.[COOKIES.AccessToken];
			const cookieRefreshToken = req.cookies?.[COOKIES.RefreshToken];
			const cookieSteamId = req.cookies?.[COOKIES.SteamId];

			if (!cookieAccessToken || !cookieRefreshToken || !cookieSteamId) {
				return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
			}

			const user = await getUser(cookieSteamId);

			if (!user) {
				return reply.status(404).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
			}

			const auth = await getAuth(user.id, cookieRefreshToken);

			if (
				!auth ||
				(auth.refreshTokenExpiry !== null &&
					Date.now() > Number(auth.refreshTokenExpiry * 1000n))
			) {
				return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
			}

			await deleteAuth(cookieRefreshToken);

			const { accessToken, accessTokenExpiry } = await generateAccessToken({
				provider: jwtProvider.steam, // TODO: Should we have a webRefresh provider?
				steamId: cookieSteamId,
			});
			const { refreshToken, refreshTokenExpiry } = generateRefreshToken();

			await insertAuth({
				user,
				accessToken,
				accessTokenExpiry,
				refreshToken,
				refreshTokenExpiry,
				provider: jwtProvider.steam, // TODO: Should we have a webRefresh provider?
			});

			setWebCookies({
				reply,
				accessToken,
				refreshToken,
				steamId: cookieSteamId,
				accessTokenExpiry,
				refreshTokenExpiry,
				shouldRedirect: false,
			});

			return reply.status(200).send();
		},
	);
};
