import { Hono } from "hono";
import discord from "./discord";
import geetest from "./geetest";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { HoYoLAB } from "../utils/hoyolab";
import ky from "ky";
import { Routes } from "discord-api-types/v10";
import type {
	APIDMChannel,
	RESTPostAPIChannelMessageJSONBody,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
} from "discord-api-types/v10";
import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "../utils/discord";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/stats", async (c) => {
	const adapter = new PrismaD1(c.env.DB);
	const prisma = new PrismaClient({ adapter });
	const discordUserCount = await prisma.discordUser.count();
	const hoyolabAccountCount = await prisma.hoYoLABAccount.count();
	return c.json({ discordUserCount, hoyolabAccountCount });
});

app.route("/discord", discord);

app.route("/geetest", geetest);

const scheduled: ExportedHandlerScheduledHandler<CloudflareBindings> = async (
	event,
	env,
	ctx,
) => {
	switch (event.cron) {
		case "0 20 * * *": {
			const rest = ky.create({
				prefixUrl: "https://discord.com/api/v10",
				headers: {
					Authorization: `Bot ${env.DISCORD_TOKEN}`,
				},
			});
			const adapter = new PrismaD1(env.DB);
			const prisma = new PrismaClient({ adapter });
			const hoyolabAccounts = await prisma.hoYoLABAccount.findMany();
			ctx.waitUntil(
				Promise.all(
					hoyolabAccounts.map(async (hoyolabAccount) => {
						const hoyolabClient = new HoYoLAB(
							hoyolabAccount.ltuid_v2,
							hoyolabAccount.ltoken_v2,
						);
						const gameRecordCard = await hoyolabClient.getGameRecordCard();
						for (const gameRecord of gameRecordCard) {
							switch (gameRecord.game_id) {
								case 2: {
									await hoyolabClient.genshinClaimDailyReward();
									const createDmChannelJson: RESTPostAPICurrentUserCreateDMChannelJSONBody =
										{
											recipient_id: hoyolabAccount.discordUserId,
										};
									const dmChannel = await rest
										.post(Routes.userChannels().slice(1), {
											json: createDmChannelJson,
										})
										.json<APIDMChannel>();
									const embed = new EmbedBuilder()
										.setTitle("Genshin Impact")
										.setDescription("Daily Reward Claimed")
										.setColor(Colors.Green)
										.setFooter({
											text: "Powered by HoYoLAB",
										})
										.setTimestamp();
									const messageJson: RESTPostAPIChannelMessageJSONBody = {
										embeds: [embed.toJSON()],
									};
									await rest.post(
										Routes.channelMessages(dmChannel.id).slice(1),
										{
											json: messageJson,
										},
									);
									break;
								}
								case 6: {
									await hoyolabClient.hsrClaimDailyReward();
									const createDmChannelJson: RESTPostAPICurrentUserCreateDMChannelJSONBody =
										{
											recipient_id: hoyolabAccount.discordUserId,
										};
									const dmChannel = await rest
										.post(Routes.userChannels().slice(1), {
											json: createDmChannelJson,
										})
										.json<APIDMChannel>();
									const embed = new EmbedBuilder()
										.setTitle("Honkai: Star Rail")
										.setDescription("Daily Reward Claimed")
										.setColor(Colors.Green)
										.setFooter({
											text: "Powered by HoYoLAB",
										})
										.setTimestamp();
									const messageJson: RESTPostAPIChannelMessageJSONBody = {
										embeds: [embed.toJSON()],
									};
									await rest.post(
										Routes.channelMessages(dmChannel.id).slice(1),
										{
											json: messageJson,
										},
									);
									break;
								}
								case 8: {
									await hoyolabClient.zenlessClaimDailyReward();
									const createDmChannelJson: RESTPostAPICurrentUserCreateDMChannelJSONBody =
										{
											recipient_id: hoyolabAccount.discordUserId,
										};
									const dmChannel = await rest
										.post(Routes.userChannels().slice(1), {
											json: createDmChannelJson,
										})
										.json<APIDMChannel>();
									const embed = new EmbedBuilder()
										.setTitle("Zenless Zone Zero")
										.setDescription("Daily Reward Claimed")
										.setColor(Colors.Green)
										.setFooter({
											text: "Powered by HoYoLAB",
										})
										.setTimestamp();
									const messageJson: RESTPostAPIChannelMessageJSONBody = {
										embeds: [embed.toJSON()],
									};
									await rest.post(
										Routes.channelMessages(dmChannel.id).slice(1),
										{
											json: messageJson,
										},
									);
									break;
								}
								default: {
									console.warn(
										`Unknown game: ${gameRecord.game_name} (${gameRecord.game_id})`,
									);
									break;
								}
							}
						}
					}),
				),
			);
		}
	}
};

export default {
	fetch: app.fetch,
	scheduled,
};
