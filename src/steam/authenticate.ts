import { STEAM_API_BASE_URL, STEAM_API_KEY, STEAM_APP_ID } from '../config';
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
