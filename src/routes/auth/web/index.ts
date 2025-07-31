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
} from '../../../utils';

interface DiscordCallbackRequest {
	code: string;
}

const webRefreshSchema: FastifySchema = {
	tags: ['Authentication'],
	operationId: 'discordRedirect',
	summary: 'Discord OAuth2 Redirect',
	description: 'Redirects to Discord OAuth2 for authentication.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [],
	response: {
		302: {},
	},
};

export const webAuthRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Querystring: DiscordCallbackRequest }>(
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
		},
	);
};
