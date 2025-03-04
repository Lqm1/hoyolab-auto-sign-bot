import ky from "ky";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	Routes,
} from "discord-api-types/v10";
import type { RESTPutAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

const main = async () => {
	if (process.env.DISCORD_TOKEN === undefined) {
		throw new Error("DISCORD_TOKEN is not defined");
	}

	if (process.env.DISCORD_CLIENT_ID === undefined) {
		throw new Error("DISCORD_CLIENT_ID is not defined");
	}

	if (process.env.DISCORD_PUBLIC_KEY === undefined) {
		throw new Error("DISCORD_PUBLIC_KEY is not defined");
	}

	const rest = ky.create({
		prefixUrl: "https://discord.com/api/v10",
		throwHttpErrors: true,
	});

	const json: RESTPutAPIApplicationCommandsJSONBody = [
		{
			name: "hoyolab_login",
			name_localizations: {
				ja: "hoyolabログイン",
			},
			type: ApplicationCommandType.ChatInput,
			description: "Log in to HoYoLAB via Discord",
			description_localizations: {
				ja: "HoYoLABにDiscord経由でログイン",
			},
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "account",
					name_localizations: {
						ja: "アカウント",
					},
					description: "Your HoYoLAB username or email",
					description_localizations: {
						ja: "HoYoLABのユーザー名またはメールアドレス",
					},
					required: true,
					min_length: 1,
					max_length: 100,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "password",
					name_localizations: {
						ja: "パスワード",
					},
					description: "Your HoYoLAB account password",
					description_localizations: {
						ja: "HoYoLABのアカウントのパスワード",
					},
					required: true,
					// reference: https://account.hoyolab.com/login-platform/index.html?st=https%3A%2F%2Fwww.hoyolab.com%2Fsignup&token_type=6&client_type=4&app_id=c9oqaq3s3gu8&game_biz=bbs_oversea&lang=ja-jp&theme=dark-hoyolab&ux_mode=popup&iframe_level=1#/email-register
					min_length: 8,
					max_length: 30,
				},
			],
		},
	];

	const response = await rest.put(
		Routes.applicationCommands(process.env.DISCORD_CLIENT_ID).slice(1),
		{
			headers: {
				Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
			},
			json,
		},
	);

	console.log(
		response.ok
			? "Successfully registered commands"
			: "Failed to register commands",
	);
};

main();
