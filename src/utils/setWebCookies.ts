import type { FastifyReply } from 'fastify';
import { COOKIES, FRONTEND_URL, IS_DEBUG_MODE } from '../config';

const REDIRECT_URL = new URL('/auth/callback', FRONTEND_URL);
const COOKIE_DOMAIN = IS_DEBUG_MODE ? 'localhost' : `.${new URL(FRONTEND_URL).hostname}`;

const setCookie = (reply: FastifyReply, name: string, value: string, expiresIn: number) => {
	reply.setCookie(name, String(value), {
		path: '/',
		httpOnly: !IS_DEBUG_MODE,
		sameSite: 'lax',
		secure: !IS_DEBUG_MODE,
		domain: COOKIE_DOMAIN,
		maxAge: Math.round(expiresIn),
	});
};

interface SetWebCookiesOptions {
	reply: FastifyReply;
	accessToken: string;
	accessTokenExpiry: bigint;
	refreshToken: string;
	refreshTokenExpiry: bigint;
	steamId: string;
	shouldRedirect?: boolean;
}

export const setWebCookies = ({
	reply,
	accessToken,
	accessTokenExpiry,
	refreshToken,
	refreshTokenExpiry,
	steamId,
	shouldRedirect = true,
}: SetWebCookiesOptions): void => {
	const accessTokenExpires = (Number(accessTokenExpiry) * 1000 - Date.now()) / 1000;
	const refreshTokenExpires = (Number(refreshTokenExpiry) * 1000 - Date.now()) / 1000;

	setCookie(reply, COOKIES.AccessToken, accessToken, accessTokenExpires);
	setCookie(reply, COOKIES.RefreshToken, refreshToken, refreshTokenExpires);
	setCookie(reply, COOKIES.SteamId, steamId, refreshTokenExpires);

	// Redirect to ZeepCentral frontend
	if (shouldRedirect) {
		reply.redirect(REDIRECT_URL.href, 302);
	}
};
