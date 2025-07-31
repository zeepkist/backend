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

export const jwtProvider = {
	gtr: 'gtr',
	steam: 'steam',
	discord: 'discord',
} as const;

export type JwtProvider = (typeof jwtProvider)[keyof typeof jwtProvider];

interface AccessTokenResponse {
	accessToken: string;
	accessTokenExpiry: bigint;
}

interface AbstractAccessTokenPayload {
	jti: `${string}-${string}-${string}-${string}-${string}`;
	aud: string;
	iss: string;
	sub: string;
	steamid: string;
	provider?: JwtProvider;
}

interface GtrAccessTokenPayload extends AbstractAccessTokenPayload {
	provider: typeof jwtProvider.gtr;
}

interface SteamAccessTokenPayload extends AbstractAccessTokenPayload {
	provider: typeof jwtProvider.steam;
}

interface DiscordAccessTokenPayload extends AbstractAccessTokenPayload {
	provider: typeof jwtProvider.discord;
	discordid: string;
}

export type AccessTokenPayload =
	| GtrAccessTokenPayload
	| SteamAccessTokenPayload
	| DiscordAccessTokenPayload;

interface GenerateAccessTokenParams {
	provider: JwtProvider;
	steamId: string;
	discordId?: string;
}

export async function generateAccessToken({
	provider,
	steamId,
	discordId,
}: GenerateAccessTokenParams): Promise<AccessTokenResponse> {
	const payload: AbstractAccessTokenPayload = {
		jti: crypto.randomUUID(),
		aud: JWT_AUDIENCE,
		iss: JWT_ISSUER,
		sub: steamId,
		steamid: steamId,
	};

	console.debug(`Generating access token for user ${steamId} with provider ${provider}`);

	const accessTokenExpiry = BigInt(Date.now() + JWT_EXPIRY) / 1000n;

	if (provider === jwtProvider.gtr) {
		const gtrPayload: GtrAccessTokenPayload = {
			...payload,
			provider: 'gtr',
		};

		return {
			accessToken: await signer(gtrPayload),
			accessTokenExpiry,
		};
	}

	if (provider === jwtProvider.discord && discordId) {
		const discordPayload: DiscordAccessTokenPayload = {
			...payload,
			provider: 'discord',
			discordid: discordId,
		};

		return {
			accessToken: await signer(discordPayload),
			accessTokenExpiry,
		};
	}

	if (provider === jwtProvider.steam) {
		const steamPayload: SteamAccessTokenPayload = {
			...payload,
			provider: 'steam',
		};

		return {
			accessToken: await signer(steamPayload),
			accessTokenExpiry,
		};
	}

	throw new Error(getErrorMessage(ERROR_CODES.AUTH_INVALID_PROVIDER));
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

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
	const verify = createVerifier({
		key: async () => JWT_TOKEN,
		algorithms: [JWT_ALGORITHM],
	});

	try {
		const payload: AccessTokenPayload = await verify(token);

		// Check if the token has the required claims
		if (
			payload.aud !== JWT_AUDIENCE ||
			payload.iss !== JWT_ISSUER ||
			!payload.sub ||
			!payload.provider ||
			!payload.steamid
		) {
			throw new Error(getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN));
		}

		if (payload.provider === jwtProvider.discord && !payload.discordid) {
			throw new Error(getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN));
		}

		return payload;
	} catch (error) {
		console.error('JWT verification failed:', error);
		return null;
	}
}
