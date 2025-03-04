import { Hono } from "hono";
import nacl from "tweetnacl";
import { Buffer } from "node:buffer";
import type { APIInteraction } from "discord-api-types/v10";

const app = new Hono<{ Bindings: CloudflareBindings }>();

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

	const interaction: APIInteraction = await c.req.json();

	return c.json(interaction);
});

export default app;
