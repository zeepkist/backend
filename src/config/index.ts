import { parse } from '@lukeed/ms';

const {
	STEAM_APP_ID = '',
	STEAM_API_KEY = '',
	JWT_AUDIENCE = '',
	JWT_ISSUER = '',
	JWT_TOKEN = '',
	DATABASE_URL = '',
	PORT = 3000,
	HOST = '0.0.0.0',
	DEBUG = 0,
	WASABI_ACCESSKEY = '',
	WASABI_SECRETKEY = '',
	WASABI_BUCKET = '',
	WASABI_ENDPOINT = '',
	WASABI_REGION = '',
	GHOST_FOLDER = 'ghosts-dev',
	THUMBNAIL_FOLDER = 'thumbnails-dev',
	OPENTELEMETRY_COLLECTOR_URL = '',
	OPENTELEMETRY_SERVICE_NAME = '',
	ENABLE_WORKERS = false,
	TRIGGER_JOB_TOKEN = '',
	DISCORD_CLIENT_ID = '',
	DISCORD_CLIENT_SECRET = '',
	FRONTEND_URL = '',
} = process.env;

export const STEAM_API_BASE_URL = 'https://api.steampowered.com';
export const STEAM_AUTH_BASE_URL = 'https://steamcommunity.com/openid';
export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRY = parse('5m') ?? 0;
export const JWT_REFRESH_EXPIRY = parse('7d') ?? 0;
export const IS_DEBUG_MODE = Number(DEBUG) === 1;
export const SERVER_PORT = Number(PORT);
export const SERVER_URL = IS_DEBUG_MODE ? `http://localhost:${SERVER_PORT}` : 'https://backend.zeepki.st';
export const DEFAULT_VOTE_RATING = 0.5;

export {
	STEAM_APP_ID,
	STEAM_API_KEY,
	JWT_AUDIENCE,
	JWT_ISSUER,
	JWT_TOKEN,
	DATABASE_URL,
	HOST,
	SERVER_PORT as PORT,
	WASABI_ACCESSKEY,
	WASABI_SECRETKEY,
	WASABI_BUCKET,
	WASABI_ENDPOINT,
	WASABI_REGION,
	GHOST_FOLDER,
	THUMBNAIL_FOLDER,
	OPENTELEMETRY_COLLECTOR_URL,
	OPENTELEMETRY_SERVICE_NAME,
	ENABLE_WORKERS,
	TRIGGER_JOB_TOKEN,
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	FRONTEND_URL,
};

export const COOKIES = {
	AccessToken: 'zeepcentral_access_token',
	RefreshToken: 'zeepcentral_refresh_token',
	SteamId: 'zeepcentral_steam_id',
} as const;
