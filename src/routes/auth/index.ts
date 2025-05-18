import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { user } from '../../db';
import { verifyModVersion } from '../../hooks';
import { deleteAuth, getAuth, getOrInsertUser, insertAuth } from '../../services';
import { authenticateSteamUser } from '../../steam/authenticate';
import {
	ERROR_CODES,
	generateAccessToken,
	generateRefreshToken,
	getErrorMessage,
} from '../../utils';

interface LoginRequest {
	ModVersion: string;
	SteamId: string;
	AuthenticationTicket: string;
}

interface RefreshRequest {
	ModVersion: string;
	SteamId: string;
	LoginToken: string;
	RefreshToken: string;
}

export const replyWithJwt = async (
	reply: FastifyReply,
	userData: typeof user.$inferSelect,
): Promise<never> => {
	if (!userData?.steamId) {
		return reply.status(401).send({ error: getErrorMessage(ERROR_CODES.AUTH_USER_NOT_FOUND) });
	}

	const { accessToken, accessTokenExpiry } = await generateAccessToken(
		userData.steamId.toString(),
	);
	const { refreshToken, refreshTokenExpiry } = generateRefreshToken();

	await insertAuth({
		user: userData,
		accessToken,
		accessTokenExpiry,
		refreshToken,
		refreshTokenExpiry,
	});

	return reply.status(200).send({
		AccessToken: accessToken,
		AccessTokenExpiry: Number(accessTokenExpiry),
		RefreshToken: refreshToken,
		RefreshTokenExpiry: Number(refreshTokenExpiry),
	});
};

export const authRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: LoginRequest }>(
		'/login',
		{
			preValidation: [verifyModVersion],
		},
		async (req, reply) => {
			try {
				const { ModVersion, SteamId, AuthenticationTicket } = req.body;

				console.log(
					`[Login] Request received for SteamId ${SteamId} with ModVersion: ${ModVersion}`,
				);

				if (!ModVersion || !SteamId || !AuthenticationTicket) {
					return reply
						.status(400)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_MISSING_REQUIRED_FIELDS) });
				}

				const authResponse = await authenticateSteamUser(AuthenticationTicket);

				if (!authResponse.success) {
					return reply.status(401).send({
						error: getErrorMessage(ERROR_CODES.AUTH_STEAM_AUTHENTICATION_FAILED),
					});
				}

				const steamIdFromRequest = BigInt(SteamId);
				const steamIdFromAuth = BigInt(authResponse.steamId);

				if (steamIdFromAuth !== steamIdFromRequest) {
					return reply
						.status(401)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_STEAM_ID_MISMATCH) });
				}

				const user = await getOrInsertUser(steamIdFromAuth);

				await replyWithJwt(reply, user);
			} catch (error) {
				if (!reply.sent) {
					console.error('Error handling login request:', error);
					return reply
						.status(500)
						.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
				}
			}
		},
	);

	app.post<{ Body: RefreshRequest }>(
		'/refresh',
		{
			preValidation: [verifyModVersion],
		},
		async (req, reply) => {
			try {
				const { ModVersion, SteamId, LoginToken, RefreshToken } = req.body;

				console.log(
					`[Refresh] Request received for SteamId ${SteamId} with ModVersion: ${ModVersion}`,
				);

				if (!ModVersion || !SteamId || !LoginToken || !RefreshToken) {
					return reply
						.status(400)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_MISSING_REQUIRED_FIELDS) });
				}

				const steamIdFromRequest = BigInt(SteamId);
				const user = await getOrInsertUser(steamIdFromRequest);
				const auth = await getAuth(user.id, RefreshToken);

				if (
					!auth ||
					(auth.refreshTokenExpiry !== null &&
						Date.now() > Number(auth.refreshTokenExpiry * 1000n))
				) {
					return reply
						.status(401)
						.send({ error: getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN) });
				}

				await deleteAuth(RefreshToken);

				await replyWithJwt(reply, user);
			} catch (error) {
				if (!reply.sent) {
					console.error('Error handling refresh request:', error);
					return reply
						.status(500)
						.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
				}
			}
		},
	);
};
