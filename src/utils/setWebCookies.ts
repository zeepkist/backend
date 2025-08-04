import type { FastifyReply } from 'fastify';
import { COOKIES, FRONTEND_URL, IS_DEBUG_MODE } from '../config';

const REDIRECT_URL = new URL('/auth/callback', FRONTEND_URL);
const COOKIE_DOMAIN = IS_DEBUG_MODE ? 'localhost' : `.${new URL(FRONTEND_URL).hostname}`;

interface SetCookieOptions {
	reply: FastifyReply;
	name: string;
	value: string;
	expiresIn: number;
	httpOnly?: boolean;
}

const setCookie = ({
	reply,
	name,
	value,
	expiresIn,
	httpOnly = !IS_DEBUG_MODE,
}: SetCookieOptions) => {
	reply.setCookie(name, String(value), {
		path: '/',
		httpOnly: httpOnly,
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

	setCookie({
		reply,
		name: COOKIES.AccessToken,
		value: accessToken,
		expiresIn: accessTokenExpires,
	});

	setCookie({
		reply,
		name: COOKIES.RefreshToken,
		value: refreshToken,
		expiresIn: refreshTokenExpires,
	});

	setCookie({
		reply,
		name: COOKIES.SteamId,
		value: steamId,
		expiresIn: refreshTokenExpires,
		httpOnly: false, // Steam ID cookie is accessible via JavaScript
	});

	// Redirect to ZeepCentral frontend
	if (shouldRedirect) {
		reply.redirect(REDIRECT_URL.href, 302);
	}
};
