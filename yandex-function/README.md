# Consultation delivery

The public form calls Yandex Cloud Functions. Validated contact data is sent over HTTPS to the protected Cloudflare Pages route `/api/telegram`, which sends the notification to Telegram. Success is returned only after Telegram confirms delivery.

Yandex environment: ALLOWED_ORIGINS, TELEGRAM_RELAY_URL, TELEGRAM_RELAY_KEY.
Cloudflare production secrets: TELEGRAM_RELAY_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

Keep all secret values outside this repository. Deploy the Yandex ZIP containing index.js and transport.js with entry point index.handler, Node.js 22, 128 MB, 15 seconds. Changes under functions/ deploy through the existing Cloudflare Pages Git integration.
