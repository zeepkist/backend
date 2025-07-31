import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { getDiscordAccessToken, getDiscordRedirectUrl, getDiscordUser } from '../../../discord';
import { getUserByDiscordId, insertAuth } from '../../../services';
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

const discordRedirectSchema: FastifySchema = {
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

export const discordAuthRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		'/redirect',
		{
			preValidation: [],
			schema: discordRedirectSchema,
		},
		async (_req, reply) => {
			reply.redirect(getDiscordRedirectUrl(), 302);
		},
	);

	app.get<{ Querystring: DiscordCallbackRequest }>(
		'/callback',
		{
			preValidation: [],
		},
		async (req, reply) => {
			const { code } = req.query;

			if (!code) {
				return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
			}

			const discordAccessToken = await getDiscordAccessToken(code);

			if (!discordAccessToken) {
				return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
			}

			const discordUser = await getDiscordUser(discordAccessToken);

			if (!discordUser) {
				return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
			}

			const discordId = discordUser.id;
			const user = await getUserByDiscordId(discordId);

			if (!user || !user.steamId) {
				return reply.status(400).send(handleError(ERROR_CODES.AUTH_DISCORD_NOT_LINKED));
			}

			const { accessToken, accessTokenExpiry } = await generateAccessToken({
				provider: jwtProvider.discord,
				steamId: user.steamId.toString(),
				discordId,
			});

			const { refreshToken, refreshTokenExpiry } = generateRefreshToken();

			await insertAuth({
				user,
				accessToken,
				accessTokenExpiry,
				refreshToken,
				refreshTokenExpiry,
				provider: jwtProvider.discord,
			});

			setWebCookies({
				reply,
				accessToken,
				refreshToken,
				steamId: user.steamId.toString(),
				accessTokenExpiry,
				refreshTokenExpiry,
				shouldRedirect: true,
			});
		},
	);
};
