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
} from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

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
	) => void;
}

class TypedEventEmitter extends EventEmitter {
	on<K extends keyof Events>(event: K, listener: Events[K]): this {
		return super.on(event, listener);
	}

	emit<K extends keyof Events>(
		event: K,
		...args: Parameters<Events[K]>
	): boolean {
		return super.emit(event, ...args);
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
		throwHttpErrors: false,
	});

	const interaction = await c.req.json<APIInteraction>();

	switch (interaction.type) {
		case InteractionType.Ping:
			eventEmitter.emit(
				"interaction",
				{
					...interaction,
					pong: (withResponse = false) => {
						const promise = (async (withResponse = false) => {
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
						})(withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
				},
				c.env,
			);
			break;
		case InteractionType.ApplicationCommand:
			eventEmitter.emit(
				"interaction",
				{
					...interaction,
					reply: (
						data: APIInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deferReply: (
						data?: Pick<APIInteractionResponseCallbackData, "flags">,
						withResponse = false,
					) => {
						const promise = (async (
							data:
								| Pick<APIInteractionResponseCallbackData, "flags">
								| undefined,
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deleteReply: () => {
						const promise = (async () => {
							await rest.delete(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					editReply: (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
							const response = await rest.patch(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					fetchReply: () => {
						const promise = (async () => {
							const response = await rest.get(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
							return await response.json<APIMessage>();
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					followUp: async (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPostAPIWebhookWithTokenJSONBody = data;
							const response = await rest.post(
								Routes.webhook(interaction.id, interaction.token).slice(1),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					showModal: async (
						data: APIModalInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
				},
				c.env,
			);
			break;
		case InteractionType.MessageComponent:
			eventEmitter.emit(
				"interaction",
				{
					...interaction,
					reply: (
						data: APIInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deferReply: (
						data?: Pick<APIInteractionResponseCallbackData, "flags">,
						withResponse = false,
					) => {
						const promise = (async (
							data:
								| Pick<APIInteractionResponseCallbackData, "flags">
								| undefined,
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deleteReply: () => {
						const promise = (async () => {
							await rest.delete(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					editReply: (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
							const response = await rest.patch(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					fetchReply: () => {
						const promise = (async () => {
							const response = await rest.get(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
							return await response.json<APIMessage>();
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					followUp: async (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPostAPIWebhookWithTokenJSONBody = data;
							const response = await rest.post(
								Routes.webhook(interaction.id, interaction.token).slice(1),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					showModal: async (
						data: APIModalInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
				},
				c.env,
			);
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
			eventEmitter.emit(
				"interaction",
				{
					...interaction,
					reply: (
						data: APIInteractionResponseCallbackData,
						withResponse = false,
					) => {
						const promise = (async (
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deferReply: (
						data?: Pick<APIInteractionResponseCallbackData, "flags">,
						withResponse = false,
					) => {
						const promise = (async (
							data:
								| Pick<APIInteractionResponseCallbackData, "flags">
								| undefined,
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
						})(data, withResponse);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					deleteReply: () => {
						const promise = (async () => {
							await rest.delete(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					editReply: (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPatchAPIWebhookWithTokenMessageJSONBody = data;
							const response = await rest.patch(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					fetchReply: () => {
						const promise = (async () => {
							const response = await rest.get(
								Routes.webhookMessage(interaction.id, interaction.token).slice(
									1,
								),
							);
							return await response.json<APIMessage>();
						})();
						c.executionCtx.waitUntil(promise);
						return promise;
					},
					followUp: async (data: APIInteractionResponseCallbackData) => {
						const promise = (async (
							data: APIInteractionResponseCallbackData,
						) => {
							const json: RESTPostAPIWebhookWithTokenJSONBody = data;
							const response = await rest.post(
								Routes.webhook(interaction.id, interaction.token).slice(1),
								{
									json,
								},
							);
							return await response.json<APIMessage>();
						})(data);
						c.executionCtx.waitUntil(promise);
						return promise;
					},
				},
				c.env,
			);
			break;
	}

	return c.body(null, 202);
});

eventEmitter.on("interaction", async (interaction, env) => {
	switch (interaction.type) {
		case InteractionType.Ping:
			await interaction.pong();
			break;
	}
});

export default app;
