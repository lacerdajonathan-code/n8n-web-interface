# 📱 Telegram Bot Integration - Implementação Completa

Este documento descreve a implementação completa e segura de um bot do Telegram integrado ao n8n, com todas as correções e melhorias de segurança identificadas.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Recursos Implementados](#recursos-implementados)
3. [Sanitização e Validação](#sanitização-e-validação)
4. [Segurança em Banco de Dados](#segurança-em-banco-de-dados)
5. [Paginação](#paginação)
6. [Botões Interativos](#botões-interativos)
7. [Uso no n8n](#uso-no-n8n)
8. [Esquema do Banco de Dados](#esquema-do-banco-de-dados)

## 🎯 Visão Geral

A implementação fornece um bot do Telegram completo e seguro com suporte a:

- ✅ Validação e sanitização de entrada com suporte a Unicode e emojis
- ✅ Proteção contra SQL injection usando prepared statements
- ✅ Transações para operações críticas
- ✅ Paginação eficiente para listagem de rascunhos
- ✅ Botões interativos do Telegram
- ✅ Processamento de estados com casos padrão
- ✅ Tratamento robusto de erros

## 🔐 Recursos Implementados

### 1. Sanitização e Validação de Entradas

#### Função `sanitizeText(text)`

Sanitiza texto com suporte completo a Unicode e emojis:

```javascript
const sanitizedText = sanitizeText("Hello 👋 Olá 🇧🇷");
// Remove caracteres perigosos mas preserva emojis e Unicode
```

**Características:**
- ✅ Normalização Unicode (NFC) para consistência
- ✅ Preservação de emojis e caracteres especiais
- ✅ Remoção de caracteres de controle perigosos
- ✅ Escape de caracteres HTML para prevenir XSS
- ✅ Remoção de null bytes

#### Função `validateInput(input, type)`

Valida entradas por tipo com retorno estruturado:

```javascript
const result = validateInput(userInput, 'text');
if (result.valid) {
  // Usar result.sanitized com segurança
} else {
  // Mostrar result.error ao usuário
}
```

**Tipos Suportados:**
- `text` - Texto geral (max 4096 caracteres)
- `number` - Números inteiros
- `email` - Endereços de email
- `command` - Comandos do bot

### 2. Proteção contra SQL Injection

#### Classe `DatabaseHelper`

Implementa prepared statements para todas as operações:

```javascript
const db = new DatabaseHelper(connection);

// Inserção segura
const draftId = await db.insertDraft(userId, userContent);

// Atualização segura
await db.updateDraft(draftId, newContent, 'published');

// Exclusão segura com transação
await db.deleteDraft(draftId, userId);
```

**Recursos:**
- ✅ Todos os parâmetros são automaticamente sanitizados
- ✅ Uso de placeholders (?) para prevenir injection
- ✅ Validação antes de cada operação
- ✅ Logging de erros para auditoria

### 3. Suporte a Transações

Operações críticas são envolvidas em transações:

```javascript
// Exclusão de rascunho com seus anexos em transação atômica
await db.deleteDraft(draftId, userId);
// BEGIN -> DELETE attachments -> DELETE draft -> COMMIT
// Se alguma operação falhar, tudo é revertido (ROLLBACK)
```

**Operações Transacionais:**
- Exclusão de rascunhos (com anexos relacionados)
- Publicação de múltiplos rascunhos
- Operações em lote

### 4. Paginação Eficiente

#### Função `getDrafts(userId, page, limit)`

Lista rascunhos com paginação completa:

```javascript
const result = await db.getDrafts(userId, page=1, limit=5);
// {
//   drafts: [...],
//   total: 23,
//   hasMore: true,
//   currentPage: 1,
//   totalPages: 5
// }
```

**Características:**
- ✅ Limite configurável de itens por página
- ✅ Contagem total de registros
- ✅ Indicador de mais páginas disponíveis
- ✅ Ordenação por data de criação (mais recente primeiro)

#### Formatação de Mensagem

```javascript
const message = formatDraftsMessage(draftsData);
// Retorna mensagem formatada em Markdown com:
// - Número da página atual
// - Preview dos rascunhos
// - Status de cada rascunho
// - Total de rascunhos
```

### 5. Botões Interativos do Telegram

#### Função `createInlineKeyboard(type, data)`

Cria teclados inline para diferentes contextos:

**Confirmar/Cancelar:**
```javascript
const keyboard = createInlineKeyboard('confirm_cancel');
// Botões: ✅ Confirmar | ❌ Cancelar | ✏️ Editar
```

**Lista de Rascunhos com Paginação:**
```javascript
const keyboard = createInlineKeyboard('drafts_list', {
  drafts: [...],
  currentPage: 2,
  totalPages: 5,
  hasMore: true
});
// Exibe botões para cada rascunho + navegação
```

**Ações do Rascunho:**
```javascript
const keyboard = createInlineKeyboard('draft_actions', { draftId: 123 });
// Botões: Ver | Editar | Publicar | Excluir | Voltar
```

**Confirmação de Exclusão:**
```javascript
const keyboard = createInlineKeyboard('delete_confirmation', { draftId: 123 });
// Botões: ⚠️ Sim, excluir | ❌ Não, manter
```

### 6. Processamento de Estados

#### Função `processUserState(record, message)`

Processa mensagens baseado no estado atual do usuário:

```javascript
const response = processUserState(userState, userMessage);
// Retorna objeto com action e message apropriados
```

**Estados Suportados:**
- `awaiting_draft` - Usuário criando rascunho
- `awaiting_confirmation` - Aguardando confirmação
- `editing` - Editando rascunho existente
- `idle` - Estado ocioso (processa comandos)
- **default** - Trata estados inesperados ⚠️

**Consolidação:**
- ✅ Variável `msgLower` declarada uma única vez
- ✅ Validação de entrada antes do processamento
- ✅ Caso default para estados inesperados

## 🔧 Uso no n8n

### Configuração do Workflow

#### 1. Webhook Trigger Node
```
Nome: Telegram Webhook
URL: /webhook/telegram
Método: POST
```

#### 2. Function Node - Handler Principal
```javascript
// Importar módulo
const telegram = require('./telegram-bot-workflow.js');

// Inicializar conexão com banco
const db = new telegram.DatabaseHelper($connection);

// Processar webhook
const response = await telegram.handleTelegramWebhook($json, db);

return response;
```

#### 3. HTTP Request Node - Responder ao Telegram
```
URL: https://api.telegram.org/bot{YOUR_BOT_TOKEN}/{{$json.method}}
Método: POST
Body: JSON com dados do response
```

### Exemplo de Workflow Completo

```
[Telegram Webhook] 
    ↓
[Validar Request] 
    ↓
[Function: Process Message] 
    ↓
[Switch: Action Type]
    ├─ [save_draft] → [DB: Insert] → [Send Buttons]
    ├─ [list_drafts] → [DB: Get Drafts] → [Format Message]
    ├─ [delete_draft] → [DB: Transaction Delete] → [Confirm]
    └─ [error] → [Send Error Message]
```

## 📊 Esquema do Banco de Dados

### Tabela: drafts

```sql
CREATE TABLE drafts (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

### Tabela: user_states

```sql
CREATE TABLE user_states (
  user_id BIGINT PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'idle',
  current_draft_id INT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (current_draft_id) REFERENCES drafts(id) ON DELETE SET NULL
);
```

### Tabela: draft_attachments

```sql
CREATE TABLE draft_attachments (
  id SERIAL PRIMARY KEY,
  draft_id INT NOT NULL,
  file_id VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
);
```

## 🧪 Testes

### Teste de Sanitização

```javascript
// Teste com emojis
const text1 = sanitizeText("Hello 😀 World 🌍");
console.assert(text1.includes("😀"), "Emojis devem ser preservados");

// Teste com Unicode
const text2 = sanitizeText("Olá 你好 مرحبا");
console.assert(text2.length > 0, "Unicode deve ser preservado");

// Teste com XSS
const text3 = sanitizeText("<script>alert('xss')</script>");
console.assert(!text3.includes("<script>"), "Script tags devem ser escapados");
```

### Teste de Validação

```javascript
// Validação de texto
const result1 = validateInput("Texto válido", "text");
console.assert(result1.valid === true, "Texto válido deve passar");

// Validação de número
const result2 = validateInput("123", "number");
console.assert(result2.valid === true, "Número válido deve passar");

// Texto muito longo
const result3 = validateInput("a".repeat(5000), "text");
console.assert(result3.valid === false, "Texto muito longo deve falhar");
console.assert(result3.error.includes("too long"), "Erro deve indicar tamanho");
```

### Teste de Paginação

```javascript
const db = new DatabaseHelper(connection);

// Criar 12 rascunhos de teste
for (let i = 1; i <= 12; i++) {
  await db.insertDraft(userId, `Rascunho teste ${i}`);
}

// Testar página 1
const page1 = await db.getDrafts(userId, 1, 5);
console.assert(page1.drafts.length === 5, "Primeira página deve ter 5 itens");
console.assert(page1.hasMore === true, "Deve indicar mais páginas");
console.assert(page1.totalPages === 3, "Deve ter 3 páginas no total");

// Testar página 3
const page3 = await db.getDrafts(userId, 3, 5);
console.assert(page3.drafts.length === 2, "Última página deve ter 2 itens");
console.assert(page3.hasMore === false, "Não deve ter mais páginas");
```

## 🔒 Checklist de Segurança

- ✅ **Input Validation**: Todas as entradas são validadas antes do uso
- ✅ **SQL Injection**: Uso exclusivo de prepared statements
- ✅ **XSS Prevention**: Escape de HTML em todas as saídas
- ✅ **Unicode Support**: Suporte completo a emojis e caracteres internacionais
- ✅ **Transaction Safety**: Operações críticas em transações atômicas
- ✅ **Error Handling**: Tratamento robusto de erros em todos os níveis
- ✅ **State Management**: Validação de estados com caso default
- ✅ **Rate Limiting**: (Recomendado adicionar no Telegram API)
- ✅ **Logging**: Logs de auditoria para operações sensíveis

## 📝 Exemplos de Uso

### Criar Novo Rascunho

1. Usuário envia `/novo`
2. Bot responde: "Digite o conteúdo do rascunho"
3. Usuário envia texto (com emojis 😀)
4. Bot salva com sanitização e mostra botões:
   - ✅ Confirmar
   - ❌ Cancelar
   - ✏️ Editar

### Listar Rascunhos

1. Usuário envia `/listar`
2. Bot exibe página 1 com 5 rascunhos
3. Botões de navegação: ⬅️ Anterior | 1/3 | Próximo ➡️
4. Usuário clica em um rascunho
5. Bot mostra opções: Ver | Editar | Publicar | Excluir

### Excluir Rascunho (com Transação)

1. Usuário clica "🗑️ Excluir"
2. Bot pede confirmação: "⚠️ Tem certeza?"
3. Usuário confirma
4. Bot executa transação:
   - DELETE de anexos
   - DELETE do rascunho
   - COMMIT se ambos ok, ROLLBACK se erro
5. Bot confirma: "🗑️ Rascunho excluído com sucesso!"

## 🚀 Melhorias Futuras

- [ ] Cache de rascunhos recentes (Redis)
- [ ] Suporte a mídia (fotos, vídeos)
- [ ] Agendamento de publicações
- [ ] Estatísticas de uso
- [ ] Backup automático
- [ ] Suporte multi-idioma
- [ ] Webhooks para eventos

## 📚 Referências

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [n8n Documentation](https://docs.n8n.io)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Unicode Normalization](https://unicode.org/reports/tr15/)

## 📄 Licença

MIT License - Veja LICENSE para detalhes.
