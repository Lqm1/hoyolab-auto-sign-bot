import { JSEncrypt } from "jsencrypt";
import ky from "ky";
import type { KyInstance } from "ky";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4PMS2JVMwBsOIrYWRluY
wEiFZL7Aphtm9z5Eu/anzJ09nB00uhW+ScrDWFECPwpQto/GlOJYCUwVM/raQpAj
/xvcjK5tNVzzK94mhk+j9RiQ+aWHaTXmOgurhxSp3YbwlRDvOgcq5yPiTz0+kSeK
ZJcGeJ95bvJ+hJ/UMP0Zx2qB5PElZmiKvfiNqVUk8A8oxLJdBB5eCpqWV6CUqDKQ
KSQP4sM0mZvQ1Sr4UcACVcYgYnCbTZMWhJTWkrNXqI8TMomekgny3y+d6NX/cFa6
6jozFIF4HCX5aW8bp8C8vq2tFvFbleQ/Q3CU56EWWKMrOcpmFtRmC18s9biZBVR/
8QIDAQAB
-----END PUBLIC KEY-----`;

function encryptCredentials(text: string): string {
	const encryptor = new JSEncrypt();
	encryptor.setPublicKey(PUBLIC_KEY);

	const encrypted = encryptor.encrypt(text);

	if (!encrypted) {
		throw new Error("Encryption failed");
	}

	return encrypted;
}

const stringToCookies = (str: string) => {
	const cookies: Record<string, string> = {};
	for (const cookie of str.split("; ")) {
		const [key, value] = cookie.split("=");
		cookies[key] = value;
	}
	return cookies;
};

const cookiesToString = (cookies: Record<string, string>) => {
	return Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ");
};

class HoYoLABRequiredLogin extends Error {
	public name = "HoYoLABRequiredLogin";
}

class HoYoLABError extends Error {
	public retcode: number;

	constructor(retcode: number, message: string) {
		super(message);
		this.name = "HoYoLABError";
		this.retcode = retcode;
	}
}

class HoYoLAB {
	private readonly client = ky.create({
		headers: {
			"x-rpc-language": "en-us",
			"x-rpc-app_id": "c9oqaq3s3gu8",
			"x-rpc-client_type": "4",
			Origin: "https://account.hoyolab.com",
			Referer: "https://account.hoyolab.com/",
		},
	});
	private readonly _ltuid_v2?: number;
	private readonly _ltoken_v2?: string;
	public readonly locale: string = "en-us";

	constructor(ltuid_v2?: number, ltoken_v2?: string, locale = "en-us") {
		this._ltuid_v2 = ltuid_v2;
		this._ltoken_v2 = ltoken_v2;
		this.locale = locale;
		if (this._ltuid_v2 && this._ltoken_v2) {
			this.client = this.client.extend({
				headers: {
					Cookie: cookiesToString({
						ltuid_v2: this._ltuid_v2.toString(),
						ltoken_v2: this._ltoken_v2,
					}),
				},
			});
		}
		if (this.locale) {
			this.client = this.client.extend({
				headers: {
					"x-rpc-language": this.locale,
				},
			});
		}
	}

	public get ltuid_v2() {
		if (this._ltuid_v2) return this._ltuid_v2;
		throw new HoYoLABRequiredLogin("ltuid_v2 is required");
	}

	public get ltoken_v2() {
		if (this._ltoken_v2) return this._ltoken_v2;
		throw new HoYoLABRequiredLogin("ltoken_v2 is required");
	}

	public async getGameRecordCard() {
		const response = await this.client.get(
			"https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard",
			{
				searchParams: new URLSearchParams({
					uid: this.ltuid_v2.toString(),
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async houkai3rdClaimDailyReward() {
		const response = await this.client.post(
			"https://sg-public-api.hoyolab.com/event/mani/sign",
			{
				json: {
					act_id: "e202110291205111",
					lang: this.locale,
				},
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async genshinClaimDailyReward() {
		const response = await this.client.post(
			"https://sg-hk4e-api.hoyolab.com/event/sol/sign",
			{
				json: {
					act_id: "e202102251931481",
					lang: this.locale,
				},
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async totClaimDailyReward() {
		const response = await this.client.post(
			"https://sg-public-api.hoyolab.com/event/luna/os/sign",
			{
				json: {
					act_id: "e202308141137581",
					lang: this.locale,
				},
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async hsrClaimDailyReward() {
		const response = await this.client.post(
			"https://sg-public-api.hoyolab.com/event/luna/os/sign",
			{
				json: {
					act_id: "e202303301540311",
					lang: this.locale,
				},
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async zenlessClaimDailyReward() {
		const response = await this.client.post(
			"https://sg-public-api.hoyolab.com/event/luna/zzz/os/sign",
			{
				headers: {
					"x-rpc-signgame": "zzz",
				},
				json: {
					act_id: "e202406031448091",
					lang: this.locale,
				},
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async houkai3rdGetMonthlyRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/mani/home",
			{
				searchParams: new URLSearchParams({
					act_id: "e202110291205111",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async genshinGetMonthlyRewards() {
		const response = await this.client.get(
			"https://sg-hk4e-api.hoyolab.com/event/sol/home",
			{
				searchParams: new URLSearchParams({
					act_id: "e202102251931481",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async totGetMonthlyRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/home",
			{
				searchParams: new URLSearchParams({
					act_id: "e202308141137581",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async hsrGetMonthlyRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/home",
			{
				searchParams: new URLSearchParams({
					act_id: "e202303301540311",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async zenlessGetMonthlyRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/zzz/os/home",
			{
				headers: {
					"x-rpc-signgame": "zzz",
				},
				searchParams: new URLSearchParams({
					act_id: "e202406031448091",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async houkai3rdGetClaimedRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/mani/award",
			{
				searchParams: new URLSearchParams({
					act_id: "e202110291205111",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async genshinGetClaimedRewards() {
		const response = await this.client.get(
			"https://sg-hk4e-api.hoyolab.com/event/sol/award",
			{
				searchParams: new URLSearchParams({
					act_id: "e202102251931481",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async totGetClaimedRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/award",
			{
				searchParams: new URLSearchParams({
					act_id: "e202308141137581",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async hsrGetClaimedRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/award",
			{
				searchParams: new URLSearchParams({
					act_id: "e202303301540311",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async zenlessGetClaimedRewards() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/zzz/os/award",
			{
				headers: {
					"x-rpc-signgame": "zzz",
				},
				searchParams: new URLSearchParams({
					act_id: "e202406031448091",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async houkai3rdGetRewardInfo() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/mani/info",
			{
				searchParams: new URLSearchParams({
					act_id: "e202110291205111",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async genshinGetRewardInfo() {
		const response = await this.client.get(
			"https://sg-hk4e-api.hoyolab.com/event/sol/info",
			{
				searchParams: new URLSearchParams({
					act_id: "e202102251931481",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async totGetRewardInfo() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/info",
			{
				searchParams: new URLSearchParams({
					act_id: "e202308141137581",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async hsrGetRewardInfo() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/os/info",
			{
				searchParams: new URLSearchParams({
					act_id: "e202303301540311",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}

	public async zenlessGetRewardInfo() {
		const response = await this.client.get(
			"https://sg-public-api.hoyolab.com/event/luna/zzz/os/info",
			{
				headers: {
					"x-rpc-signgame": "zzz",
				},
				searchParams: new URLSearchParams({
					act_id: "e202406031448091",
					lang: this.locale,
				}),
			},
		);
		// biome-ignore lint:ignore
		const responseJson = await response.json<any>();
		if (responseJson.retcode !== 0) {
			throw new HoYoLABError(responseJson.retcode, responseJson.message);
		}
		return responseJson.data;
	}
}

export {
	stringToCookies,
	cookiesToString,
	encryptCredentials,
	HoYoLABError,
	HoYoLAB,
};
