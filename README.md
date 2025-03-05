# HoYoLAB Auto Sign Bot

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Lqm1/hoyolab-auto-sign-bot)

**Multilingual Support:** [English](README.md) | [日本語](README_JA.md)

## Overview ✨

This is a Discord auto-login bot for HoYoLAB that leverages Cloudflare Workers and Cloudflare D1.

## Key Features 🚀

- **Supported Games with Auto-Login:**
  - Genshin Impact
  - Honkai: Star Rail
  - Honkai Impact 3rd
  - Zenless Zone Zero
  - Undecided Case Files
- **Credential Management with AES-256 Encryption**
- **GeeTest Captcha Support**
- **Multi-Region Support (excluding Chinese servers)**
- **Multiple Account Support**

## Bot Installation 📥

**Note:**  
Due to HoYoLAB's restrictions, performing a large number of daily logins from a single IP may trigger GeeTest. Consequently, new installations of the bot might be halted without notice.  
If this occurs, please consider self-hosting.

[Install the bot via this link](https://discord.com/oauth2/authorize?client_id=1346129900741984307)

## Self-Hosting 🛠️

### Prerequisites

- A Cloudflare account
- A Discord application
- Node.js v22.x
- Wrangler CLI v3.0 or higher

Create your own repository from the template repository, clone it, and navigate to your working directory:

```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>
cd <YOUR_REPOSITORY_NAME>
```

### Setup Steps

1. **Install Dependencies**

   ```bash
   npm ci
   ```

2. **Create the Database**

   ```bash
   npx wrangler d1 create hoyolab-auto-sign-bot
   ```

3. **Configure wrangler.jsonc**

   ```jsonc
   {
     // ...
     "d1_databases": [
       {
         "binding": "DB",
         "database_id": "Enter the generated ID", // Replace with the actual ID
         "database_name": "hoyolab-auto-sign-bot"
       }
     ]
     // ...
   }
   ```

4. **Apply Migrations**

   - For the development environment:
     ```bash
     npx wrangler d1 migrations apply hoyolab-auto-sign-bot --local
     ```
   - For the production environment:
     ```bash
     npx wrangler d1 migrations apply hoyolab-auto-sign-bot --remote
     ```

5. **Set Environment Variables**

   - **For the development environment:**

     Create a `.dev.vars` file in the project root with the following content:

     ```ini
     DISCORD_TOKEN="bot token"
     DISCORD_CLIENT_ID="client ID"
     DISCORD_PUBLIC_KEY="public key"
     ```

   - **For the production environment:**

     In your GitHub repository, navigate to **Settings** → **Security** under the **Actions** category → **Repository secrets** and create the following secrets:

     ```ini
     CLOUDFLARE_API_TOKEN="Cloudflare API token"
     CLOUDFLARE_ACCOUNT_ID="Cloudflare account ID"
     DISCORD_TOKEN="bot token"
     DISCORD_CLIENT_ID="client ID"
     DISCORD_PUBLIC_KEY="public key"
     ```

     ![Environment Variables Setup](https://github.com/user-attachments/assets/e12b72c8-48d1-4107-b8ea-e164b8ddd8a2)

7. **Start**

   - **For the development environment:**
     ```bash
     npm run dev
     ```

   - **For the production environment:**

     When you push to the master branch, GitHub Actions will trigger an automatic deployment to Cloudflare Workers.

9. **Configure the Bot**

   Set your Cloudflare Workers URL in the **Interactions Endpoint URL** field. In the development environment, you may need to use tools like ngrok to allow external access.

   ```
   https://hoyolab-auto-sign-bot.<YOUR_DOMAIN>.workers.dev/discord/interactions
   ```

   ![Bot Configuration](https://github.com/user-attachments/assets/655ae2cb-6311-4a6b-9939-dd4f53aae011)

## Available Commands 🤖

| Command              | Description              | Parameters                                                                       |
|----------------------|--------------------------|----------------------------------------------------------------------------------|
| `/hoyolab_login`   | Link HoYoLAB account     | `account`: Username or email address<br>`password`: Password                  |

## Contributing 🤝

Contributions such as bug reports, feature suggestions, and pull requests are highly welcome. Please start by using the [Issue tracker](https://github.com/Lqm1/hoyolab-auto-sign-bot/issues).

## License 📜

This project is released under the [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0).
