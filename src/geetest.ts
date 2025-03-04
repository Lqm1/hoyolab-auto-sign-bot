import { EmbedBuilder } from "@discordjs/builders";
import { Hono } from "hono";
import ky from "ky";
import { Colors } from "../utils/discord";
import {
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { stringToCookies } from "../utils/hoyolab";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("", (c) => {
	const task = c.req.query("task");
	const session_id = c.req.query("session_id");
	const data = c.req.query("data");
	const encryptedAccount = c.req.query("encryptedAccount");
	const encryptedPassword = c.req.query("encryptedPassword");
	const interactionId = c.req.query("interactionId");
	const interactionToken = c.req.query("interactionToken");
	const interactionLocale = c.req.query("interactionLocale");
	const userId = c.req.query("userId");

	if (
		!task ||
		!session_id ||
		!data ||
		!encryptedAccount ||
		!encryptedPassword ||
		!interactionId ||
		!interactionToken ||
		!interactionLocale ||
		!userId
	) {
		return c.html("<html><body>Bad Request</body></html>");
	}

	const xRpcAigisData = JSON.parse(data);

	return c.html(`<html lang='ja'>
      <script src='https://static.geetest.com/static/js/gt.0.4.9.js' />
      <body>
        <div id='captcha' />
      </body>
        <script>
          initGeetest({
            gt: '${xRpcAigisData.gt}',
            challenge: '${xRpcAigisData.challenge}',
            new_captcha: ${xRpcAigisData.new_captcha},
            lang: 'ja',
            api_server_v3: ['api-na.geetest.com']
          }, function (captchaObj) {
            captchaObj.appendTo('#captcha');
            captchaObj.onSuccess(async function () {
              const response = await fetch('/geetest/success?${new URLSearchParams({ task, session_id, encryptedAccount, encryptedPassword, interactionId, interactionToken, interactionLocale, userId })}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(captchaObj.getValidate())
              });
              if (!response.ok) {
                console.error(await response.text());
              }
            });
            captchaObj.onError(function () {
              console.error('captcha error');
            });
          });
        </script>
    </html>`);
});

app.post("/success", async (c) => {
	const task = c.req.query("task");
	const session_id = c.req.query("session_id");
	const encryptedAccount = c.req.query("encryptedAccount");
	const encryptedPassword = c.req.query("encryptedPassword");
	const interactionId = c.req.query("interactionId");
	const interactionToken = c.req.query("interactionToken");
	const interactionLocale = c.req.query("interactionLocale");
	const userId = c.req.query("userId");
	if (
		!task ||
		!session_id ||
		!encryptedAccount ||
		!encryptedPassword ||
		!interactionId ||
		!interactionToken ||
		!interactionLocale ||
		!userId
	) {
		return c.body(null, 400);
	}
	const json = await c.req.json();
	const rest = ky.create({
		prefixUrl: "https://discord.com/api/v10",
		headers: {
			Authorization: `Bot ${c.env.DISCORD_TOKEN}`,
		},
	});
	const xRpcAigisString = `${session_id};${btoa(JSON.stringify(json))}`;
	switch (task) {
		case "webLoginByPassword": {
			const hoyolabClient = ky.create({
				prefixUrl: "https://sg-public-api.hoyolab.com",
				headers: {
					"x-rpc-aigis": xRpcAigisString,
					"x-rpc-language": interactionLocale,
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
				const webhookWithTokenMessageJson: RESTPatchAPIWebhookWithTokenMessageJSONBody =
					{
						embeds: [embed.toJSON()],
					};
				return await rest.patch(
					Routes.webhookMessage(c.env.DISCORD_CLIENT_ID, interactionToken),
					{
						json: webhookWithTokenMessageJson,
					},
				);
			}
			const cookies = stringToCookies(
				response.headers.getSetCookie().join("; "),
			);
			const ltuid_v2 = Number.parseInt(cookies.ltuid_v2);
			const ltoken_v2 = cookies.ltoken_v2;
			const adapter = new PrismaD1(c.env.DB);
			const prisma = new PrismaClient({ adapter });
			await prisma.discordUser.upsert({
				where: {
					id: userId,
				},
				update: {
					hoyolabAccounts: {
						upsert: {
							where: {
								ltuid_v2_discordUserId: {
									ltuid_v2,
									discordUserId: userId,
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
					id: userId,
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
			const webhookWithTokenMessageJson: RESTPatchAPIWebhookWithTokenMessageJSONBody =
				{
					embeds: [embed.toJSON()],
				};
			return await rest.patch(
				Routes.webhookMessage(c.env.DISCORD_CLIENT_ID, interactionToken),
				{
					json: webhookWithTokenMessageJson,
				},
			);
		}
	}
});

export default app;
