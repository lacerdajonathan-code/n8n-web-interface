# 🚀 Quick Start Guide - Telegram Bot Integration

## 📋 5-Minute Setup

### 1. Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Telegram Bot Token ([Get one from @BotFather](https://t.me/botfather))
- n8n instance running

### 2. Install & Configure

```bash
# Clone and install
git clone https://github.com/lacerdajonathan-code/n8n-web-interface.git
cd n8n-web-interface
npm install

# Create .env file
cat > .env << EOF
PORT=3000
N8N_API_KEY=your_n8n_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
DATABASE_URL=postgresql://user:pass@host:5432/db
EOF
```

### 3. Setup Database

```bash
psql $DATABASE_URL -f database-schema.sql
```

### 4. Start Server

```bash
npm start
```

Visit: http://localhost:3000

## 🧪 Verify Installation

Run tests:
```bash
node telegram-bot-workflow.test.js
```

Expected: ✅ 29/29 tests passing

## 📱 Configure Telegram Webhook

Set your bot webhook to point to your n8n workflow:

```bash
curl -X POST "https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-n8n-instance.com/webhook/telegram-webhook"}'
```

## 🎯 Test Your Bot

1. Open Telegram
2. Search for your bot
3. Send `/start`
4. Try creating a draft: `/novo`
5. List your drafts: `/listar`

## 📚 Key Features

### Sanitization
```javascript
const { sanitizeText } = require('./telegram-bot-workflow.js');
const safe = sanitizeText('User input with 😀 emojis');
```

### Database Operations
```javascript
const { DatabaseHelper } = require('./telegram-bot-workflow.js');
const db = new DatabaseHelper(connection);

// Safe insert with prepared statement
const id = await db.insertDraft(userId, content);

// Paginated list
const result = await db.getDrafts(userId, 1, 5);
```

### Interactive Buttons
```javascript
const { createInlineKeyboard } = require('./telegram-bot-workflow.js');
const keyboard = createInlineKeyboard('confirm_cancel');
```

## 🔒 Security Checklist

- ✅ All inputs validated with `validateInput()`
- ✅ SQL queries use prepared statements
- ✅ HTML escaped in outputs
- ✅ Unicode normalized
- ✅ Critical operations in transactions
- ✅ Error handling on all async operations

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :3000

# Check environment variables
cat .env
```

### Database connection fails
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check schema
psql $DATABASE_URL -c "\dt"
```

### Tests fail
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run tests with verbose output
node telegram-bot-workflow.test.js 2>&1 | tee test.log
```

## 📖 Documentation

- Full docs: [TELEGRAM_INTEGRATION.md](./TELEGRAM_INTEGRATION.md)
- Main README: [README.md](./README.md)
- Database schema: [database-schema.sql](./database-schema.sql)

## 🆘 Need Help?

1. Check the [full documentation](./TELEGRAM_INTEGRATION.md)
2. Review the [test suite](./telegram-bot-workflow.test.js)
3. Open an issue on GitHub
4. Review example workflow: [example-telegram-workflow.json](./example-telegram-workflow.json)

## ✅ Verification Steps

After setup, verify:

1. ✅ Server responds: `curl http://localhost:3000/health`
2. ✅ Tests pass: `node telegram-bot-workflow.test.js`
3. ✅ Database has tables: `psql $DATABASE_URL -c "\dt"`
4. ✅ Bot responds in Telegram: Send `/start`

## 🎉 You're Ready!

Your secure Telegram bot is now running with:
- SQL injection protection
- XSS prevention
- Unicode/emoji support
- Interactive buttons
- Pagination
- Transaction safety

Happy coding! 🚀
