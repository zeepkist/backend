import { STEAM_API_BASE_URL, STEAM_API_KEY } from '../config';
import { ERROR_CODES, getErrorMessage } from '../utils';

interface SteamUserPublicData {
	/**
	 * The user's current visibility state.
	 * 1: Private / Friends Only
	 * 3: Public
	 */
	communityvisibilitystate: 3;
	steamId: string;
	personaname: string;
	profileurl: string;
	avatar: string;
	avatarmedium: string;
	avatarfull: string;
	/**
	 * The user's current status.
	 * 0: Offline
	 * 1: Online
	 * 2: Busy
	 * 3: Away
	 * 4: Snooze
	 * 5: Looking to trade
	 * 6: Looking to play
	 */
	personastate: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	profilestate: 0 | 1;
	lastlogoff: number;
	commentpermission: 0 | 1;
}

interface SteamUserPrivateData extends Omit<SteamUserPublicData, 'communityvisibilitystate'> {
	/**
	 * The user's current visibility state.
	 * 1: Private / Friends Only
	 * 3: Public
	 */
	communityvisibilitystate: 1;
	realname: string;
	primaryclanid: string;
	timecreated: number;
	gameid: string;
	gameserverip: string;
	gameextrainfo: string;
	cityid: number;
	loccountrycode: string;
	locstatecode: string;
	loccityid: number;
}

type SteamUserData = SteamUserPublicData | SteamUserPrivateData;

interface GetPlayerSummariesResponse {
	response: {
		players: SteamUserData[];
	};
}

export async function getSteamUser(steamId: string): Promise<SteamUserData> {
	const url = `${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
	const response = await fetch(url);

	if (!response.ok) {
		console.error(`Steam API request failed with status: ${response.status}`);
		throw new Error(getErrorMessage(ERROR_CODES.STEAM_USER_REQUEST_FAILED));
	}

	const data = (await response.json()) as GetPlayerSummariesResponse;
	const player = data.response.players[0];

	if (!player) {
		throw new Error(getErrorMessage(ERROR_CODES.STEAM_USER_NOT_FOUND));
	}

	return player;
}
