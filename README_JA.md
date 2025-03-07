# HoYoLAB Auto Sign Bot

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Lqm1/hoyolab-auto-sign-bot)

**多言語サポート:** [English](README.md) | [日本語](README_JA.md)

## 概要 ✨

Cloudflare Workers と Cloudflare D1 を活用した、Discord 用 HoYoLAB 自動ログインボットです。

![Image](https://github.com/user-attachments/assets/6de80b1b-6c3a-4b84-beab-9a0783704192)

## 主な特徴 🚀

- **自動ログイン対応ゲーム：**
  - 原神
  - 崩壊：スターレイル
  - 崩壊3rd
  - ゼンレスゾーンゼロ
  - 未定事件簿
- **Discord経由でHoYoLABにログイン**
- **AES-256 暗号化による認証情報管理**
- **GeeTest キャプチャ対応**
- **マルチリージョン対応（中国サーバー以外）**
- **複数アカウント対応**

## ボットの導入 📥

**注意:**  
HoYoLABの制限により、単一IPからデイリーログインを大量に行うとGeeTestが表示される恐れがあります。そのため、ボットの新規導入を予告なしに停止する可能性があります。  
その場合は、セルフホストをご検討ください。

[こちらのリンクからボットを導入](https://discord.com/oauth2/authorize?client_id=1346129900741984307)

## セルフホスト 🛠️

### 前提条件

- Cloudflare アカウント
- Discord アプリケーション
- Node.js v22.x
- Wrangler CLI v3.0 以上

テンプレートリポジトリから自身のリポジトリを作成し、クローン後に作業ディレクトリへ移動してください。

```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>
cd <YOUR_REPOSITORY_NAME>
```

### セットアップ手順

1. **依存関係のインストール**

   ```bash
   npm ci
   ```

2. **データベースの作成**

   ```bash
   npx wrangler d1 create hoyolab-auto-sign-bot
   ```

3. **wrangler.jsonc の設定**

   ```jsonc
   {
     // ...
     "d1_databases": [
       {
         "binding": "DB",
         "database_id": "生成されたIDを入力", // 実際のIDに置換してください
         "database_name": "hoyolab-auto-sign-bot"
       }
     ]
     // ...
   }
   ```

4. **マイグレーションの適用**

   - 開発環境の場合:
     ```bash
     npx wrangler d1 migrations apply hoyolab-auto-sign-bot --local
     ```
   - 本番環境の場合:
     ```bash
     npx wrangler d1 migrations apply hoyolab-auto-sign-bot --remote
     ```

5. **環境変数の設定**

   - 開発環境の場合:

     プロジェクトルートに `.dev.vars` ファイルを作成し、以下の内容を記述してください:

     ```ini
     DISCORD_TOKEN="ボットトークン"
     DISCORD_CLIENT_ID="クライアントID"
     DISCORD_PUBLIC_KEY="公開鍵"
     ```

   - 本番環境の場合:

     GitHub リポジトリの「Settings」→「Security」カテゴリ内の「Actions」→  「Repository secrets」で、以下のシークレットを作成してください:

     ```ini
     CLOUDFLARE_API_TOKEN="クラウドフレアAPIトークン"
     CLOUDFLARE_ACCOUNT_ID="クラウドフレアアカウントID"
     DISCORD_TOKEN="ボットトークン"
     DISCORD_CLIENT_ID="クライアントID"
     DISCORD_PUBLIC_KEY="公開鍵"
     ```

     ![環境変数設定画像](https://github.com/user-attachments/assets/e12b72c8-48d1-4107-b8ea-e164b8ddd8a2)

7. **起動**

   - 開発環境の場合:
     ```bash
     npm run dev
     ```

   - 本番環境の場合:

     master ブランチに push すると、GitHub Actions が動作し、Cloudflare Workers へ自動デプロイされます。

9. **ボットの設定**

   「Interactions Endpoint URL」に、あなたの Cloudflare Workers の URL を設定してください。開発環境では、ngrok などを利用して外部からのアクセスを許可する必要があります。

   ```
   https://hoyolab-auto-sign-bot.<YOUR_DOMAIN>.workers.dev/discord/interactions
   ```

   ![ボット設定画像](https://github.com/user-attachments/assets/655ae2cb-6311-4a6b-9939-dd4f53aae011)

## 使用可能コマンド 🤖

| コマンド             | 説明                   | パラメータ                                                    |
|----------------------|------------------------|---------------------------------------------------------------|
| `/hoyolabログイン`   | HoYoLABアカウント連携  | `アカウント`: ユーザー名またはメールアドレス<br>`パスワード`: パスワード     |

## 貢献 🤝

バグ報告、機能追加の提案、プルリクエストなど、どなたからの貢献も大歓迎です。まずは [Issue](https://github.com/Lqm1/hoyolab-auto-sign-bot/issues) をご利用ください。

## ライセンス 📜

このプロジェクトは [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0) のもとで公開されています。
