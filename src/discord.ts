import { Hono } from "hono";
import ky from "ky";
import EventEmitter from "node:events";
import nacl from "tweetnacl";
import { Buffer } from "node:buffer";
import {
	InteractionType,
	type APIInteraction,
	type APIApplicationCommandInteraction,
	type APIInteractionResponseCallbackData,
	type APIPingInteraction,
	type APIMessage,
	type APIModalInteractionResponseCallbackData,
	type APIMessageComponentInteraction,
	type APIApplicationCommandAutocompleteInteraction,
	type APICommandAutocompleteInteractionResponseCallbackData,
	type APIModalSubmitInteraction,
	type APIInteractionResponse,
	type RESTPostAPIInteractionCallbackWithResponseResult,
	InteractionResponseType,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIWebhookWithTokenJSONBody,
	ApplicationCommandType,
	type APIApplicationCommandInteractionDataStringOption,
	MessageFlags,
	ButtonStyle,
} from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";
import { encryptCredentials, stringToCookies } from "../utils/hoyolab";
import {
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
} from "@discordjs/builders";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { Colors } from "../utils/discord";

export type ExtendedAPIPingInteraction = APIPingInteraction & {
	pong: (
		withResponse?: boolean,
	) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
};

export type ExtendedAPIApplicationCommandInteraction =
	APIApplicationCommandInteraction & {
		reply: (
			data: APIInteractionResponseCallbackData,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
		deferReply: (
			data?: Pick<APIInteractionResponseCallbackData, "flags">,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
		deleteReply: () => Promise<void>;
		editReply: (
			data: APIInteractionResponseCallbackData,
		) => Promise<APIMessage>;
		fetchReply: () => Promise<APIMessage>;
		followUp: (data: APIInteractionResponseCallbackData) => Promise<APIMessage>;
		showModal: (
			data: APIModalInteractionResponseCallbackData,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
	};

export type ExtendedAPIMessageComponentInteraction =
	APIMessageComponentInteraction & {
		reply: (
			data: APIInteractionResponseCallbackData,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
		deferReply: (
			data?: Pick<APIInteractionResponseCallbackData, "flags">,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
		deleteReply: () => Promise<void>;
		editReply: (
			data: APIInteractionResponseCallbackData,
		) => Promise<APIMessage>;
		fetchReply: () => Promise<APIMessage>;
		followUp: (data: APIInteractionResponseCallbackData) => Promise<APIMessage>;
		showModal: (
			data: APIModalInteractionResponseCallbackData,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
	};

export type ExtendedAPIApplicationCommandAutocompleteInteraction =
	APIApplicationCommandAutocompleteInteraction & {
		reply: (
			data: APICommandAutocompleteInteractionResponseCallbackData,
			withResponse?: boolean,
		) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
	};

export type ExtendedAPIModalSubmitInteraction = APIModalSubmitInteraction & {
	reply: (
		data: APIInteractionResponseCallbackData,
		withResponse?: boolean,
	) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
	deferReply: (
		data?: Pick<APIInteractionResponseCallbackData, "flags">,
		withResponse?: boolean,
	) => Promise<RESTPostAPIInteractionCallbackWithResponseResult | undefined>;
	deleteReply: () => Promise<void>;
	editReply: (data: APIInteractionResponseCallbackData) => Promise<APIMessage>;
	fetchReply: () => Promise<APIMessage>;
	followUp: (data: APIInteractionResponseCallbackData) => Promise<APIMessage>;
};

export type ExtendedAPIInteraction =
	| ExtendedAPIPingInteraction
	| ExtendedAPIApplicationCommandInteraction
	| ExtendedAPIMessageComponentInteraction
	| ExtendedAPIApplicationCommandAutocompleteInteraction
	| ExtendedAPIModalSubmitInteraction;

const app = new Hono<{ Bindings: CloudflareBindings }>();

interface Events {
	interaction: (
		interaction: ExtendedAPIInteraction,
		env: CloudflareBindings,
	) => Promise<unknown>;
}

class TypedEventEmitter extends EventEmitter {
	on<K extends keyof Events>(event: K, listener: Events[K]): this {
		return super.on(event, listener);
	}

	once<K extends keyof Events>(event: K, listener: Events[K]): this {
		return super.once(event, listener);
	}

	emit<K extends keyof Events>(
		event: K,
		...args: Parameters<Events[K]>
	): boolean {
		return super.emit(event, ...args);
	}

	listeners<K extends keyof Events>(event: K): Events[K][] {
		return super.listeners(event) as Events[K][];
	}
}

const eventEmitter = new TypedEventEmitter();

app.post("/interactions", async (c) => {
	const signature = c.req.header("X-Signature-Ed25519");
	const timestamp = c.req.header("X-Signature-Timestamp");
	const body = await c.req.text();

	if (!signature || !timestamp) {
		return c.body(null, 401);
	}

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + body),
		Buffer.from(signature, "hex"),
		Buffer.from(c.env.DISCORD_PUBLIC_KEY, "hex"),
	);

	if (!isVerified) {
		return c.body(null, 401);
	}

	const rest = ky.create({
		prefixUrl: "https://discord.com/api/v10",
		headers: {
			Authorization: `Bot ${c.env.DISCORD_TOKEN}`,
		},
	});

	const interaction = await c.req.json<APIInteraction>();

	switch (interaction.type) {
		case InteractionType.Ping:
			for (const promise of eventEmitter
				.listeners("interaction")
				.map((listener) =>
					listener(
						{
							...interaction,
							...interaction,
							pong: async (withResponse = false) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.Pong,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
						},
						c.env,
					),
				)) {
				c.executionCtx.waitUntil(promise);
			}
			return c.json(interaction);
		case InteractionType.ApplicationCommand:
			for (const promise of eventEmitter
				.listeners("interaction")
				.map((listener) =>
					listener(
						{
							...interaction,
							reply: async (
								data: APIInteractionResponseCallbackData,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.ChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deferReply: async (
								data?: Pick<APIInteractionResponseCallbackData, "flags">,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.DeferredChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deleteReply: async () => {
								await rest.delete(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
							},
							editReply: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
								const response = await rest.patch(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
							fetchReply: async () => {
								const response = await rest.get(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
								return await response.json<APIMessage>();
							},
							followUp: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPostAPIWebhookWithTokenJSONBody = data;
								const response = await rest.post(
									Routes.webhook(interaction.id, interaction.token).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
							showModal: async (
								data: APIModalInteractionResponseCallbackData,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.Modal,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
						},
						c.env,
					),
				)) {
				c.executionCtx.waitUntil(promise);
			}
			break;
		case InteractionType.MessageComponent:
			for (const promise of eventEmitter
				.listeners("interaction")
				.map((listener) =>
					listener(
						{
							...interaction,
							reply: async (
								data: APIInteractionResponseCallbackData,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.ChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deferReply: async (
								data?: Pick<APIInteractionResponseCallbackData, "flags">,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.DeferredChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deleteReply: async () => {
								await rest.delete(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
							},
							editReply: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
								const response = await rest.patch(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
							fetchReply: async () => {
								const response = await rest.get(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
								return await response.json<APIMessage>();
							},
							followUp: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPostAPIWebhookWithTokenJSONBody = data;
								const response = await rest.post(
									Routes.webhook(interaction.id, interaction.token).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
							showModal: async (
								data: APIModalInteractionResponseCallbackData,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.Modal,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
						},
						c.env,
					),
				)) {
				c.executionCtx.waitUntil(promise);
			}
			break;
		case InteractionType.ApplicationCommandAutocomplete:
			eventEmitter.emit(
				"interaction",
				{
					...interaction,
					reply: async (
						data: APICommandAutocompleteInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
							data: APICommandAutocompleteInteractionResponseCallbackData,
							withResponse = false,
						) => {
							const json: APIInteractionResponse = {
								type: InteractionResponseType.ApplicationCommandAutocompleteResult,
								data,
							};
							const response = await rest.post(
								Routes.interactionCallback(
									interaction.id,
									interaction.token,
								).slice(1),
								{
									searchParams: new URLSearchParams({
										with_response: withResponse.toString(),
									}),
									json,
								},
							);
							if (withResponse) {
								return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
							}
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
				},
				c.env,
			);
			break;
		case InteractionType.ModalSubmit:
			for (const promise of eventEmitter
				.listeners("interaction")
				.map((listener) =>
					listener(
						{
							...interaction,
							reply: async (
								data: APIInteractionResponseCallbackData,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.ChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deferReply: async (
								data?: Pick<APIInteractionResponseCallbackData, "flags">,
								withResponse = false,
							) => {
								const json: APIInteractionResponse = {
									type: InteractionResponseType.DeferredChannelMessageWithSource,
									data,
								};
								const response = await rest.post(
									Routes.interactionCallback(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										searchParams: new URLSearchParams({
											with_response: withResponse.toString(),
										}),
										json,
									},
								);
								if (withResponse) {
									return await response.json<RESTPostAPIInteractionCallbackWithResponseResult>();
								}
							},
							deleteReply: async () => {
								await rest.delete(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
							},
							editReply: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
								const response = await rest.patch(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
							fetchReply: async () => {
								const response = await rest.get(
									Routes.webhookMessage(
										interaction.id,
										interaction.token,
									).slice(1),
								);
								return await response.json<APIMessage>();
							},
							followUp: async (data: APIInteractionResponseCallbackData) => {
								const json: RESTPostAPIWebhookWithTokenJSONBody = data;
								const response = await rest.post(
									Routes.webhook(interaction.id, interaction.token).slice(1),
									{
										json,
									},
								);
								return await response.json<APIMessage>();
							},
						},
						c.env,
					),
				)) {
				c.executionCtx.waitUntil(promise);
			}
			break;
	}

	return c.body(null, 202);
});

eventEmitter.on("interaction", async (interaction, env) => {
	switch (interaction.type) {
		case InteractionType.Ping:
			await interaction.pong();
			break;
		case InteractionType.ApplicationCommand:
			switch (interaction.data.type) {
				case ApplicationCommandType.ChatInput:
					switch (interaction.data.name) {
						case "hoyolab_login": {
							const user = interaction.user ?? interaction.member?.user;
							if (!user) {
								const embed = new EmbedBuilder()
									.setTitle("Error")
									.setDescription("User not found")
									.setColor(Colors.Red)
									.setFooter({
										text: "Powered by HoYoLAB",
									})
									.setTimestamp();
								return await interaction.reply({
									embeds: [embed.toJSON()],
									flags: MessageFlags.Ephemeral,
								});
							}
							// reference: ./utils/register_commands.ts required
							const account = (
								interaction.data.options?.find(
									(o) => o.name === "account",
								) as APIApplicationCommandInteractionDataStringOption
							).value;
							// reference: ./utils/register_commands.ts required
							const password = (
								interaction.data.options?.find(
									(o) => o.name === "password",
								) as APIApplicationCommandInteractionDataStringOption
							).value;
							const encryptedAccount = encryptCredentials(account);
							const encryptedPassword = encryptCredentials(password);
							const hoyolabClient = ky.create({
								prefixUrl: "https://sg-public-api.hoyolab.com",
								headers: {
									"x-rpc-language": interaction.locale,
									"x-rpc-app_id": "c9oqaq3s3gu8",
									"x-rpc-client_type": "4",
									Origin: "https://account.hoyolab.com",
									Referer: "https://account.hoyolab.com/",
								},
							});
							const response = await hoyolabClient.post(
								"account/ma-passport/api/webLoginByPassword",
								{
									json: {
										account: encryptedAccount,
										password: encryptedPassword,
										token_type: 6,
									},
								},
							);
							// biome-ignore lint:ignore
							const responseJson = await response.json<any>();
							if (responseJson.retcode !== 0) {
								switch (responseJson.retcode) {
									case -3101: {
										const xRpcAigisString = response.headers.get("X-Rpc-Aigis");
										if (!xRpcAigisString) {
											const embed = new EmbedBuilder()
												.setTitle("Failure")
												.setDescription("X-Rpc-Aigis not found")
												.setColor(Colors.Red)
												.setFooter({
													text: "Powered by HoYoLAB",
												})
												.setTimestamp();
											return await interaction.reply({
												embeds: [embed.toJSON()],
												flags: MessageFlags.Ephemeral,
											});
										}
										const xRpcAigis = JSON.parse(xRpcAigisString);
										const embed = new EmbedBuilder()
											.setTitle("GeeTest")
											.setDescription("Please complete the GeeTest to continue")
											.setColor(Colors.Yellow)
											.setFooter({
												text: "Powered by HoYoLAB",
											})
											.setTimestamp();
										const row =
											new ActionRowBuilder<ButtonBuilder>().addComponents(
												new ButtonBuilder()
													.setCustomId("geetest")
													.setLabel("GeeTest")
													.setStyle(ButtonStyle.Link)
													.setURL(
														`http://localhost:8787/geetest?${new URLSearchParams(
															{
																task: "webLoginByPassword",
																...xRpcAigis,
																encryptedAccount,
																encryptedPassword,
																interactionId: interaction.id,
																interactionToken: interaction.token,
																interactionLocale: interaction.locale,
																userId: user.id,
															},
														)}`,
													),
											);
										return await interaction.reply({
											embeds: [embed.toJSON()],
											components: [row.toJSON()],
											flags: MessageFlags.Ephemeral,
										});
									}
									default: {
										const embed = new EmbedBuilder()
											.setTitle("Failure")
											.setDescription(responseJson.message)
											.addFields([
												{
													name: "retcode",
													value: responseJson.retcode.toString(),
												},
											])
											.setColor(Colors.Red)
											.setFooter({
												text: "Powered by HoYoLAB",
											})
											.setTimestamp();
										return await interaction.reply({
											embeds: [embed.toJSON()],
											flags: MessageFlags.Ephemeral,
										});
									}
								}
							}
							const cookies = stringToCookies(
								response.headers.getSetCookie().join("; "),
							);
							const ltuid_v2 = Number.parseInt(cookies.ltuid_v2);
							const ltoken_v2 = cookies.ltoken_v2;
							const adapter = new PrismaD1(env.DB);
							const prisma = new PrismaClient({ adapter });
							await prisma.discordUser.upsert({
								where: {
									id: user.id,
								},
								update: {
									hoyolabAccounts: {
										upsert: {
											where: {
												ltuid_v2_discordUserId: {
													ltuid_v2,
													discordUserId: user.id,
												},
											},
											update: {
												ltuid_v2,
												ltoken_v2,
											},
											create: {
												ltuid_v2,
												ltoken_v2,
											},
										},
									},
								},
								create: {
									id: user.id,
									hoyolabAccounts: {
										create: {
											ltuid_v2,
											ltoken_v2,
										},
									},
								},
							});
							const embed = new EmbedBuilder()
								.setTitle("Success")
								.setDescription(responseJson.message)
								.addFields([
									{
										name: "retcode",
										value: responseJson.retcode.toString(),
									},
								])
								.setColor(Colors.Green)
								.setFooter({
									text: "Powered by HoYoLAB",
								})
								.setTimestamp();
							return await interaction.reply({
								embeds: [embed.toJSON()],
								flags: MessageFlags.Ephemeral,
							});
						}
					}
			}
	}
});

export default app;
