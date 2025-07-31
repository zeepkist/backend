import type { FastifyReply, FastifyRequest } from 'fastify';
import { COOKIES } from '../config';
import { ERROR_CODES, handleError, jwtProvider, verifyAccessToken } from '../utils';

export async function authenticateWeb(req: FastifyRequest, reply: FastifyReply) {
	// Split `Bearer <token>` to get the token
	const authHeaderToken = req.headers.authorization?.split(' ')[1];
	const cookieToken = req.cookies[COOKIES.AccessToken];
	const token = authHeaderToken || cookieToken;

	if (!token) {
		return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
	}

	const verifiedToken = await verifyAccessToken(token);

	if (!verifiedToken) {
		return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
	}

	const isAllowedProvider = [jwtProvider.discord, jwtProvider.steam].includes(
		verifiedToken.provider as typeof jwtProvider.steam | typeof jwtProvider.discord,
	);

	if (!isAllowedProvider) {
		return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
	}

	req.user = verifiedToken;
}
