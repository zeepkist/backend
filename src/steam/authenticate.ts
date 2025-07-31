import {
	SERVER_URL,
	STEAM_API_BASE_URL,
	STEAM_API_KEY,
	STEAM_APP_ID,
	STEAM_AUTH_BASE_URL,
} from '../config';
import { ERROR_CODES, getErrorMessage } from '../utils';

interface AuthenticateSuccessResponse {
	success: true;
	steamId: string;
}

interface AuthenticateErrorResponse {
	success: false;
	error: string;
}

type AuthenticateResponse = AuthenticateSuccessResponse | AuthenticateErrorResponse;

interface SteamAuthenticateUserTicketErrorResponse {
	response: {
		error: {
			errorcode: number;
			errordesc: string;
		};
	};
}

interface SteamAuthenticateUserTicketSuccessResponse {
	response: {
		params: {
			result: string;
			steamid: string;
			ownersteamid: string;
			vacbanned: boolean;
			publisherbanned: boolean;
		};
	};
}

export interface SteamCallbackRequest {
	'openid.ns': string;
	'openid.mode': string;
	'openid.op_endpoint': string;
	'openid.claimed_id': string;
	'openid.identity': string;
	'openid.return_to': string;
	'openid.response_nonce': string;
	'openid.assoc_handle': string;
	'openid.signed': string;
	'openid.sig': string;
}

type SteamAuthenticateUserTicketResponse =
	| SteamAuthenticateUserTicketErrorResponse
	| SteamAuthenticateUserTicketSuccessResponse;

export async function authenticateSteamUser(ticket: string): Promise<AuthenticateResponse> {
	try {
		const url = `${STEAM_API_BASE_URL}/ISteamUserAuth/AuthenticateUserTicket/v1/?key=${STEAM_API_KEY}&appid=${STEAM_APP_ID}&ticket=${ticket}`;
		const response = await fetch(url);

		if (!response.ok) {
			console.error(`Steam API request failed with status: ${response.status}`);
			return {
				success: false,
				error: getErrorMessage(ERROR_CODES.STEAM_AUTH_REQUEST_FAILED),
			};
		}

		const data = (await response.json()) as SteamAuthenticateUserTicketResponse;

		if ('error' in data.response) {
			console.error('Invalid Steam API response:', data.response.error);
			return {
				success: false,
				error: getErrorMessage(ERROR_CODES.STEAM_AUTH_REQUEST_FAILED),
			};
		}

		// At this point, TypeScript knows it's a success response
		const params = data.response.params;

		if (params.publisherbanned) {
			console.error('User is publisher banned');
			return { success: false, error: getErrorMessage(ERROR_CODES.STEAM_PUBLISHER_BANNED) };
		}

		if (params.vacbanned) {
			console.error('User is VAC banned');
			return { success: false, error: getErrorMessage(ERROR_CODES.STEAM_VAC_BANNED) };
		}

		if (params.ownersteamid && params.ownersteamid !== params.steamid) {
			console.error('User is not the owner of the game');
			return { success: false, error: getErrorMessage(ERROR_CODES.STEAM_NOT_OWNER) };
		}

		return { success: true, steamId: params.steamid };
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error('Error authenticating with Steam:', error.message);
		}

		return { success: false, error: getErrorMessage(ERROR_CODES.STEAM_UNKNOWN_ERROR) };
	}
}

export const getSteamRedirectUrl = () => {
	const params = new URLSearchParams({
		'openid.ns': 'http://specs.openid.net/auth/2.0',
		'openid.mode': 'checkid_setup',
		'openid.return_to': `${SERVER_URL}/auth/steam/callback`,
		'openid.realm': SERVER_URL,
		'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
		'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
	});

	return `${STEAM_AUTH_BASE_URL}/login?${params.toString()}`;
};

export const isSteamLoginSignatureValid = async (query: SteamCallbackRequest): Promise<boolean> => {
	const params = new URLSearchParams({
		...query,
		'openid.mode': 'check_authentication',
	});

	const response = await fetch(`${STEAM_AUTH_BASE_URL}/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: params.toString(),
	});

	const text = await response.text();

	if (!text.includes('is_valid:true')) {
		return false;
	}

	const claimedId = query['openid.claimed_id'];
	const steamIdMatch = claimedId?.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);

	return typeof steamIdMatch?.[1] === 'string';
};
