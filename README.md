# 🚀 n8n Web Interface

Interface web para n8n-MCP com integração segura do Telegram Bot.

## 📋 Visão Geral

Este projeto fornece uma interface web para interagir com n8n-MCP e inclui uma implementação completa e segura de um bot do Telegram com todas as melhores práticas de segurança e usabilidade.

## ✨ Recursos

### Interface Web
- 🌐 Interface web moderna e responsiva
- 🔌 Proxy para n8n-MCP com autenticação Bearer
- 📊 Painel de status e monitoramento
- 🔍 Busca e listagem de workflows

### Integração Telegram (Novo!)
- ✅ **Sanitização de Entrada**: Suporte completo a Unicode e emojis
- 🔒 **Segurança SQL**: Prepared statements para prevenir SQL injection
- 💾 **Transações**: Operações críticas em transações atômicas
- 📄 **Paginação**: Listagem eficiente de rascunhos
- 🎯 **Botões Interativos**: Interface amigável com botões do Telegram
- 🔄 **Gerenciamento de Estados**: Processamento robusto de estados do usuário

## 📁 Estrutura do Projeto

```
n8n-web-interface/
├── server.js                          # Servidor Express com proxy MCP
├── public/
│   └── index.html                     # Interface web
├── telegram-bot-workflow.js           # Implementação do bot Telegram ⭐
├── telegram-bot-workflow.test.js      # Suite de testes (29 testes)
├── database-schema.sql                # Schema PostgreSQL completo
├── example-telegram-workflow.json     # Exemplo de workflow n8n
├── TELEGRAM_INTEGRATION.md            # Documentação detalhada
└── package.json
```

## 🚀 Início Rápido

### 1. Instalação

```bash
# Clone o repositório
git clone https://github.com/lacerdajonathan-code/n8n-web-interface.git
cd n8n-web-interface

# Instale as dependências
npm install
```

### 2. Configuração

Crie um arquivo `.env` com as seguintes variáveis:

```env
PORT=3000
N8N_MCP_URL=https://n8n-mcp-production-3cbe.up.railway.app
N8N_API_KEY=your_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 3. Executar

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

### 4. Configurar Banco de Dados

Execute o schema SQL para criar as tabelas:

```bash
psql -U username -d database -f database-schema.sql
```

## 🧪 Testes

Execute a suite de testes completa:

```bash
node telegram-bot-workflow.test.js
```

**Resultados esperados:** 29/29 testes passando ✅

Cobertura de testes:
- ✅ Sanitização de texto (Unicode, emojis, XSS)
- ✅ Validação de entrada (texto, número, email, comando)
- ✅ Processamento de estados (6 estados diferentes)
- ✅ Botões interativos (4 tipos de teclados)
- ✅ Formatação de mensagens
- ✅ Fluxos de segurança (XSS, SQL injection)

## 📖 Documentação

### Sanitização e Validação

```javascript
const { sanitizeText, validateInput } = require('./telegram-bot-workflow.js');

// Sanitizar texto preservando emojis
const safe = sanitizeText('Hello 👋 Olá 🇧🇷');

// Validar entrada
const result = validateInput(userInput, 'text');
if (result.valid) {
  // Usar result.sanitized
}
```

### Operações de Banco de Dados

```javascript
const { DatabaseHelper } = require('./telegram-bot-workflow.js');
const db = new DatabaseHelper(connection);

// Inserir rascunho (com prepared statement)
const draftId = await db.insertDraft(userId, content);

// Listar com paginação
const result = await db.getDrafts(userId, page=1, limit=5);
// { drafts: [...], total: 23, hasMore: true, currentPage: 1, totalPages: 5 }

// Excluir com transação
await db.deleteDraft(draftId, userId);
```

### Botões Interativos

```javascript
const { createInlineKeyboard } = require('./telegram-bot-workflow.js');

// Botões de confirmação
const keyboard = createInlineKeyboard('confirm_cancel');

// Lista de rascunhos com paginação
const keyboard = createInlineKeyboard('drafts_list', {
  drafts: [...],
  currentPage: 2,
  totalPages: 5,
  hasMore: true
});
```

## 🔒 Segurança

### Proteções Implementadas

1. **SQL Injection**: Uso exclusivo de prepared statements
2. **XSS Prevention**: Escape de HTML em todas as saídas
3. **Unicode Safety**: Normalização Unicode (NFC)
4. **Input Validation**: Validação de tipo e tamanho
5. **Transaction Safety**: Operações críticas em transações
6. **Error Handling**: Tratamento robusto de erros

### Checklist de Segurança

- ✅ Todas as entradas são validadas
- ✅ Prepared statements em todas as queries
- ✅ Escape de HTML
- ✅ Suporte a Unicode e emojis
- ✅ Transações para operações críticas
- ✅ Logging de auditoria

## 🎯 Casos de Uso

### Exemplo 1: Criar Rascunho

1. Usuário: `/novo`
2. Bot: "Digite o conteúdo do rascunho"
3. Usuário: "Meu texto com emoji 😀"
4. Bot salva e mostra botões: ✅ Confirmar | ❌ Cancelar | ✏️ Editar

### Exemplo 2: Listar Rascunhos com Paginação

1. Usuário: `/listar`
2. Bot mostra página 1 (5 rascunhos)
3. Botões de navegação: ⬅️ Anterior | 1/3 | Próximo ➡️
4. Usuário clica em rascunho
5. Bot mostra opções: Ver | Editar | Publicar | Excluir

### Exemplo 3: Excluir com Confirmação

1. Usuário clica "🗑️ Excluir"
2. Bot: "⚠️ Tem certeza?"
3. Usuário confirma
4. Bot executa em transação (anexos + rascunho)
5. Bot: "🗑️ Excluído com sucesso!"

## 🔧 Integração com n8n

Importe o arquivo `example-telegram-workflow.json` no n8n:

1. Abra n8n
2. Clique em "Import from File"
3. Selecione `example-telegram-workflow.json`
4. Configure as credenciais do Telegram
5. Ative o workflow

## 📚 Documentação Adicional

- [TELEGRAM_INTEGRATION.md](./TELEGRAM_INTEGRATION.md) - Documentação completa
- [database-schema.sql](./database-schema.sql) - Schema do banco de dados
- [example-telegram-workflow.json](./example-telegram-workflow.json) - Workflow exemplo

## 🛠️ Tecnologias

- **Backend**: Node.js, Express
- **Segurança**: Helmet, CORS
- **HTTP Client**: Axios
- **Database**: PostgreSQL (com suporte a prepared statements)
- **Telegram**: Bot API com inline keyboards
- **n8n**: Workflow automation

## 📊 Métricas

- **Testes**: 29 testes, 100% de sucesso
- **Funções**: 15+ funções utilitárias
- **Segurança**: 6 camadas de proteção
- **Documentação**: 11KB de docs + 7KB de schema SQL

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

MIT License - Veja LICENSE para detalhes.

## 👤 Autor

Jonathan Lacerda

## 🔗 Links Úteis

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [n8n Documentation](https://docs.n8n.io)
- [OWASP SQL Injection](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
