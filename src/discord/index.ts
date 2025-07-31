import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SERVER_URL } from '../config';

interface DiscordTokenResponse {
	access_token: string;
}

interface DiscordUserResponse {
	id: string;
}

const DISCORD_API_BASE_URL = 'https://discord.com/api';
const DISCORD_AUTHORIZE_URL = `${DISCORD_API_BASE_URL}/oauth2/authorize`;
const DISCORD_TOKEN_URL = `${DISCORD_API_BASE_URL}/oauth2/token`;
const DISCORD_USER_URL = `${DISCORD_API_BASE_URL}/users/@me`;
const DISCORD_REDIRECT_URI = `${SERVER_URL}/auth/discord/callback`;

export const getDiscordRedirectUrl = () => {
	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: DISCORD_REDIRECT_URI,
		response_type: 'code',
		scope: 'identify',
	});

	return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
};

export const getDiscordAccessToken = async (code: string) => {
	const response = await fetch(DISCORD_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: DISCORD_CLIENT_ID,
			client_secret: DISCORD_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code,
			redirect_uri: DISCORD_REDIRECT_URI,
		}),
	});

	const data = (await response.json()) as DiscordTokenResponse;

	return data?.access_token || null;
};

export const getDiscordUser = async (accessToken: string) => {
	const response = await fetch(DISCORD_USER_URL, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		return null;
	}

	const data = (await response.json()) as DiscordUserResponse;

	return data;
};
