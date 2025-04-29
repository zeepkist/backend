import { createSigner, createVerifier } from 'fast-jwt';
import {
	JWT_ALGORITHM,
	JWT_AUDIENCE,
	JWT_EXPIRY,
	JWT_ISSUER,
	JWT_REFRESH_EXPIRY,
	JWT_TOKEN,
} from '../config';
import { ERROR_CODES, getErrorMessage } from './';

const signer = createSigner({
	key: async () => JWT_TOKEN,
	algorithm: JWT_ALGORITHM,
	expiresIn: JWT_EXPIRY,
});

interface AccessTokenResponse {
	accessToken: string;
	accessTokenExpiry: bigint;
}

export async function generateAccessToken(steamId: string): Promise<AccessTokenResponse> {
	const payload = {
		jti: crypto.randomUUID(),
		aud: JWT_AUDIENCE,
		iss: JWT_ISSUER,
		sub: steamId,
		steamid: steamId,
	};

	const accessTokenExpiry = BigInt(Date.now() + JWT_EXPIRY) / 1000n;

	return {
		accessToken: await signer(payload),
		accessTokenExpiry,
	};
}

interface RefreshTokenResponse {
	refreshToken: string;
	refreshTokenExpiry: bigint;
}

export function generateRefreshToken(): RefreshTokenResponse {
	const refreshTokenExpiry = BigInt(Date.now() + JWT_REFRESH_EXPIRY) / 1000n;

	return {
		refreshToken: crypto.randomUUID(),
		refreshTokenExpiry,
	};
}

interface VerifyResponse {
	jti: string;
	aud: string;
	iss: string;
	sub: string;
	steamid: string;
}

export async function verifyAccessToken(token: string): Promise<VerifyResponse | null> {
	const verify = createVerifier({
		key: async () => JWT_TOKEN,
		algorithms: [JWT_ALGORITHM],
	});

	try {
		const payload = await verify(token);

		// Check if the token has the required claims
		if (
			payload.aud !== JWT_AUDIENCE ||
			payload.iss !== JWT_ISSUER ||
			!payload.sub ||
			!payload.steamid
		) {
			throw new Error(getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN));
		}

		return payload;
	} catch (error) {
		console.error('JWT verification failed:', error);
		return null;
	}
}
