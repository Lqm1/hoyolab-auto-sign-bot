import { Hono } from "hono";
import discord from "./discord";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

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

export default {
	fetch: app.fetch,
};
