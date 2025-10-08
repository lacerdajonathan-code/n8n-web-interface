# 🏗️ Architecture Overview - Telegram Bot Integration

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM BOT                              │
│                      (User Interface)                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Webhook POST
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                        N8N WORKFLOW                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Webhook Trigger                                      │   │
│  │     - Receives Telegram updates                          │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │  2. Function Node: handleTelegramWebhook()              │   │
│  │     ┌────────────────────────────────────────────────┐  │   │
│  │     │  telegram-bot-workflow.js                      │  │   │
│  │     │  ┌──────────────────────────────────────────┐  │  │   │
│  │     │  │ • sanitizeText()                         │  │  │   │
│  │     │  │ • validateInput()                        │  │  │   │
│  │     │  │ • processUserState()                     │  │  │   │
│  │     │  │ • createInlineKeyboard()                 │  │  │   │
│  │     │  └──────────────────────────────────────────┘  │  │   │
│  │     └────────────────────────────────────────────────┘  │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │  3. DatabaseHelper Operations                           │   │
│  │     ┌────────────────────────────────────────────────┐  │   │
│  │     │  • executeQuery() [Prepared Statements]       │  │   │
│  │     │  • executeTransaction() [ACID]                │  │   │
│  │     │  • getDrafts() [Pagination]                   │  │   │
│  │     │  • insertDraft() [Validation]                 │  │   │
│  │     │  • updateDraft() [Sanitization]               │  │   │
│  │     │  • deleteDraft() [Transaction]                │  │   │
│  │     └────────────────────────────────────────────────┘  │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │  4. HTTP Request Node                                   │   │
│  │     - Send response to Telegram API                     │   │
│  └──────────────────┬───────────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ HTTPS POST
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    TELEGRAM API                                  │
│                 (api.telegram.org)                               │
└──────────────────────────────────────────────────────────────────┘
                     │
                     │ Response
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                   TELEGRAM USER                                  │
│              (Receives formatted message)                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL DATABASE                          │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │
│  │  user_states   │  │    drafts      │  │draft_attachments│   │
│  ├────────────────┤  ├────────────────┤  ├─────────────────┤   │
│  │ user_id PK     │  │ id PK          │  │ id PK           │   │
│  │ status         │  │ user_id FK     │  │ draft_id FK     │   │
│  │ current_draft  │  │ content        │  │ file_id         │   │
│  │ last_activity  │  │ status         │  │ file_type       │   │
│  └────────────────┘  │ created_at     │  │ created_at      │   │
│                      │ updated_at     │  └─────────────────┘   │
│                      └────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. User Sends Message
```
User → Telegram → Webhook → n8n → handleTelegramWebhook()
```

### 2. Message Processing
```
handleTelegramWebhook()
  └→ validateInput()       [Validates & sanitizes]
     └→ processUserState() [Determines action]
        └→ DatabaseHelper  [Executes queries]
           └→ Response     [Formatted message + buttons]
```

### 3. Response to User
```
Response → Telegram API → User receives message with buttons
```

## 🔐 Security Layers

```
┌────────────────────────────────────────────────────────┐
│                    Security Stack                      │
├────────────────────────────────────────────────────────┤
│ Layer 6: Error Handling & Logging                     │
│ Layer 5: Transaction Safety (ACID)                    │
│ Layer 4: Prepared Statements (SQL Injection)          │
│ Layer 3: HTML Escaping (XSS Prevention)               │
│ Layer 2: Unicode Normalization (NFC)                  │
│ Layer 1: Input Validation & Sanitization              │
└────────────────────────────────────────────────────────┘
```

## 📦 Module Structure

```
telegram-bot-workflow.js
├── Sanitization & Validation
│   ├── sanitizeText()          [19 lines]
│   └── validateInput()         [57 lines]
│
├── Database Operations
│   └── DatabaseHelper          [150+ lines]
│       ├── executeQuery()
│       ├── executeTransaction()
│       ├── insertDraft()
│       ├── updateDraft()
│       ├── deleteDraft()
│       └── getDrafts()
│
├── State Processing
│   └── processUserState()      [80 lines]
│
├── UI Components
│   ├── createInlineKeyboard()  [60 lines]
│   └── formatDraftsMessage()   [30 lines]
│
└── Webhook Handlers
    ├── handleTelegramWebhook() [40 lines]
    ├── handleTextMessage()     [50 lines]
    ├── handleCallbackQuery()   [80 lines]
    └── handleCommand()         [50 lines]
```

## 🎯 Request Flow Examples

### Example 1: Create Draft

```
1. User: "/novo"
   ↓
2. handleCommand() → Process "/novo"
   ↓
3. Update user_states: status = 'awaiting_draft'
   ↓
4. Response: "Digite o conteúdo do rascunho"
   ↓
5. User: "My draft content 🚀"
   ↓
6. validateInput() → Sanitize + Validate
   ↓
7. processUserState() → Action: 'save_draft'
   ↓
8. db.insertDraft() → Prepared statement INSERT
   ↓
9. createInlineKeyboard('confirm_cancel')
   ↓
10. Response with buttons: [✅ Confirmar] [❌ Cancelar] [✏️ Editar]
```

### Example 2: List Drafts (Paginated)

```
1. User: "/listar"
   ↓
2. handleCommand() → Process "/listar"
   ↓
3. db.getDrafts(userId, page=1, limit=5)
   ↓
4. SQL: SELECT * FROM drafts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5 OFFSET 0
   ↓
5. Count total: SELECT COUNT(*) FROM drafts WHERE user_id = ?
   ↓
6. Calculate: hasMore, totalPages
   ↓
7. formatDraftsMessage() → Format with pagination info
   ↓
8. createInlineKeyboard('drafts_list', {drafts, currentPage, totalPages})
   ↓
9. Response with buttons: [⬅️ Anterior] [1/3] [Próximo ➡️]
```

### Example 3: Delete Draft (Transaction)

```
1. User clicks: "🗑️ Excluir"
   ↓
2. handleCallbackQuery() → Parse "delete:123"
   ↓
3. createInlineKeyboard('delete_confirmation')
   ↓
4. Response: "⚠️ Tem certeza?"
   ↓
5. User clicks: "⚠️ Sim, excluir"
   ↓
6. db.deleteDraft(123, userId)
   ↓
7. BEGIN TRANSACTION
   ├→ DELETE FROM draft_attachments WHERE draft_id = 123
   ├→ DELETE FROM drafts WHERE id = 123 AND user_id = ?
   └→ COMMIT (or ROLLBACK on error)
   ↓
8. Response: "🗑️ Rascunho excluído com sucesso!"
```

## 🧪 Testing Architecture

```
telegram-bot-workflow.test.js
├── Sanitization Tests (6)
│   ├── Emoji preservation
│   ├── Unicode support
│   ├── HTML escaping
│   ├── Null byte removal
│   ├── Empty input handling
│   └── Unicode normalization
│
├── Validation Tests (6)
│   ├── Text validation
│   ├── Length validation
│   ├── Number validation
│   ├── Email validation
│   ├── Command validation
│   └── Null/undefined handling
│
├── State Processing Tests (7)
│   ├── awaiting_draft state
│   ├── awaiting_confirmation (confirm)
│   ├── awaiting_confirmation (cancel)
│   ├── idle state
│   ├── unexpected states (default)
│   ├── invalid input
│   └── msgLower consolidation
│
├── Keyboard Tests (4)
│   ├── Confirm/Cancel buttons
│   ├── Drafts list with pagination
│   ├── Draft actions
│   └── Unknown type handling
│
├── Message Format Tests (3)
│   ├── Empty drafts
│   ├── Pagination info
│   └── Content truncation
│
└── Integration Tests (3)
    ├── Complete flow
    ├── XSS prevention
    └── SQL injection prevention
```

## 📊 Performance Considerations

### Database Optimization
```
user_states:
  - Primary Key: user_id (BIGINT)
  - Index: status, last_activity

drafts:
  - Primary Key: id (SERIAL)
  - Indexes: user_id, status, created_at, (user_id, status)
  - Foreign Key: user_id → users

draft_attachments:
  - Primary Key: id (SERIAL)
  - Index: draft_id, file_id
  - Foreign Key: draft_id → drafts (CASCADE DELETE)
```

### Query Optimization
- ✅ All queries use indexes
- ✅ LIMIT/OFFSET for pagination
- ✅ COUNT query separate from data query
- ✅ Prepared statements cached by database
- ✅ Transactions minimize lock time

## 🔄 State Machine

```
┌─────────┐
│  idle   │ ◄─────────────┐
└────┬────┘                │
     │ /novo               │
     ▼                     │
┌──────────────┐           │
│awaiting_draft│           │
└──────┬───────┘           │
       │ User sends text   │
       ▼                   │
┌──────────────────────┐   │
│awaiting_confirmation │   │
└──────┬───────────────┘   │
       │                   │
       ├─ Confirm ─────────┤
       │                   │
       ├─ Cancel ──────────┤
       │                   │
       └─ Edit ────────────┤
                           │
┌─────────┐                │
│ editing │────────────────┘
└─────────┘
```

## 📈 Scalability

### Current Implementation
- ✅ Supports multiple users concurrently
- ✅ Database connection pooling ready
- ✅ Stateless webhook handlers
- ✅ Efficient pagination

### Future Enhancements
- [ ] Redis cache for user states
- [ ] Message queue for high volume
- [ ] Read replicas for DB
- [ ] CDN for media files
- [ ] Rate limiting per user

## 🎯 Key Design Decisions

1. **Prepared Statements**: Prevent SQL injection at database level
2. **Switch Statement**: Avoid object evaluation for keyboards
3. **Consolidated msgLower**: Single declaration reduces errors
4. **Default Case**: Handle unexpected states gracefully
5. **Pagination**: Limit memory usage for large datasets
6. **Transactions**: Ensure data consistency
7. **Unicode NFC**: Consistent character representation

## 📝 Maintenance

### Regular Tasks
- Monitor error logs
- Review slow queries
- Clean old deleted drafts
- Backup database
- Update dependencies

### Monitoring Metrics
- Response time per request
- Database query performance
- Error rate
- Active users
- Draft creation rate

---

*Architecture designed for security, scalability, and maintainability.*
