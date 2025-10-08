/**
 * Telegram Bot Workflow for n8n Integration
 * 
 * This module implements a secure and user-friendly Telegram bot workflow
 * with the following improvements:
 * 
 * 1. Sanitization and Input Validation
 * 2. SQL Injection Protection with Prepared Statements
 * 3. Transaction Support for Critical Operations
 * 4. Pagination for Listing Drafts
 * 5. Interactive Telegram Buttons
 */

// ==================== 1. SANITIZATION AND VALIDATION ====================

/**
 * Sanitizes text input to support Unicode, emojis, and prevent XSS attacks
 * @param {string} text - The text to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 4096 for Telegram)
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes that could cause issues
  text = text.replace(/\0/g, '');

  // Trim whitespace
  text = text.trim();

  // Preserve Unicode characters and emojis by using proper encoding
  // Unicode normalization to handle different representations
  text = text.normalize('NFC');

  // Remove potential XSS patterns while preserving legitimate Unicode
  // Remove any control characters except newlines and tabs
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML special characters to prevent injection
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return text;
}

/**
 * Validates and sanitizes user input before database operations
 * @param {string} input - User input to validate
 * @param {string} type - Type of validation ('text', 'number', 'email', 'command')
 * @returns {Object} - {valid: boolean, sanitized: string, error?: string}
 */
function validateInput(input, type = 'text') {
  const result = {
    valid: false,
    sanitized: '',
    error: null
  };

  if (input === null || input === undefined) {
    result.error = 'Input cannot be null or undefined';
    return result;
  }

  const inputStr = String(input);

  switch (type) {
    case 'text':
      result.sanitized = sanitizeText(inputStr);
      result.valid = result.sanitized.length > 0 && result.sanitized.length <= 4096;
      if (!result.valid && result.sanitized.length > 4096) {
        result.error = 'Text is too long (max 4096 characters)';
      }
      break;

    case 'number':
      const num = parseInt(inputStr, 10);
      result.valid = !isNaN(num) && isFinite(num);
      result.sanitized = result.valid ? num.toString() : '';
      if (!result.valid) {
        result.error = 'Invalid number format';
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      result.sanitized = sanitizeText(inputStr);
      result.valid = emailRegex.test(result.sanitized);
      if (!result.valid) {
        result.error = 'Invalid email format';
      }
      break;

    case 'command':
      // Commands should only contain alphanumeric and underscores
      const commandRegex = /^[a-zA-Z0-9_]+$/;
      result.sanitized = inputStr.trim().toLowerCase();
      result.valid = commandRegex.test(result.sanitized);
      if (!result.valid) {
        result.error = 'Invalid command format';
      }
      break;

    default:
      result.error = 'Unknown validation type';
  }

  return result;
}

// ==================== 2. DATABASE OPERATIONS WITH PREPARED STATEMENTS ====================

/**
 * Database helper class with prepared statement support
 * Note: This is a template. Actual implementation depends on your database (PostgreSQL, MySQL, etc.)
 */
class DatabaseHelper {
  constructor(connection) {
    this.connection = connection;
  }

  /**
   * Executes a query with prepared statements to prevent SQL injection
   * @param {string} query - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind to the query
   * @returns {Promise<Array>} - Query results
   */
  async executeQuery(query, params = []) {
    try {
      // Validate that all parameters are sanitized
      const sanitizedParams = params.map(param => {
        if (typeof param === 'string') {
          return sanitizeText(param);
        }
        return param;
      });

      // Example for PostgreSQL with node-postgres
      // const result = await this.connection.query(query, sanitizedParams);
      // return result.rows;

      // Example for MySQL with mysql2
      // const [rows] = await this.connection.execute(query, sanitizedParams);
      // return rows;

      // Placeholder implementation
      console.log('Executing query with prepared statement:', query, sanitizedParams);
      return [];
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('Database operation failed');
    }
  }

  /**
   * Executes multiple queries within a transaction
   * @param {Array<{query: string, params: Array}>} operations - Array of operations
   * @returns {Promise<boolean>} - Success status
   */
  async executeTransaction(operations) {
    try {
      // Start transaction
      await this.connection.query('BEGIN');

      for (const op of operations) {
        await this.executeQuery(op.query, op.params);
      }

      // Commit transaction
      await this.connection.query('COMMIT');
      return true;
    } catch (error) {
      // Rollback on error
      await this.connection.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Safely inserts a draft with prepared statement
   * @param {number} userId - User ID
   * @param {string} content - Draft content
   * @returns {Promise<number>} - Draft ID
   */
  async insertDraft(userId, content) {
    const validation = validateInput(content, 'text');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const query = 'INSERT INTO drafts (user_id, content, created_at, status) VALUES (?, ?, NOW(), ?)';
    const params = [userId, validation.sanitized, 'pending'];
    
    const result = await this.executeQuery(query, params);
    return result.insertId || result[0]?.id;
  }

  /**
   * Safely updates a draft with prepared statement
   * @param {number} draftId - Draft ID
   * @param {string} content - Updated content
   * @param {string} status - Draft status
   * @returns {Promise<boolean>} - Success status
   */
  async updateDraft(draftId, content, status) {
    const validation = validateInput(content, 'text');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const query = 'UPDATE drafts SET content = ?, status = ?, updated_at = NOW() WHERE id = ?';
    const params = [validation.sanitized, status, draftId];
    
    await this.executeQuery(query, params);
    return true;
  }

  /**
   * Safely deletes a draft within a transaction
   * @param {number} draftId - Draft ID
   * @param {number} userId - User ID for verification
   * @returns {Promise<boolean>} - Success status
   */
  async deleteDraft(draftId, userId) {
    const operations = [
      {
        query: 'DELETE FROM draft_attachments WHERE draft_id = ?',
        params: [draftId]
      },
      {
        query: 'DELETE FROM drafts WHERE id = ? AND user_id = ?',
        params: [draftId, userId]
      }
    ];

    await this.executeTransaction(operations);
    return true;
  }

  /**
   * Fetches drafts with pagination
   * @param {number} userId - User ID
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<{drafts: Array, total: number, hasMore: boolean}>}
   */
  async getDrafts(userId, page = 1, limit = 5) {
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM drafts WHERE user_id = ?';
    const countResult = await this.executeQuery(countQuery, [userId]);
    const total = countResult[0]?.total || 0;

    // Get paginated drafts
    const query = `
      SELECT id, content, status, created_at, updated_at 
      FROM drafts 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const drafts = await this.executeQuery(query, [userId, limit, offset]);

    return {
      drafts,
      total,
      hasMore: (page * limit) < total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

// ==================== 3. STATE PROCESSING ====================

/**
 * Processes user messages based on their current state
 * @param {Object} record - User state record from database
 * @param {string} message - User message
 * @returns {Object} - Response object with action and data
 */
function processUserState(record, message) {
  // Consolidate message processing - avoid redundant declarations
  const msgLower = message.toLowerCase().trim();
  
  // Validate input first
  const validation = validateInput(message, 'text');
  if (!validation.valid) {
    return {
      action: 'error',
      message: `❌ Entrada inválida: ${validation.error}`
    };
  }

  const sanitizedMessage = validation.sanitized;

  // Process based on current status with default case
  switch (record.status) {
    case 'awaiting_draft':
      return {
        action: 'save_draft',
        content: sanitizedMessage,
        message: '✅ Rascunho salvo! Use /confirmar para publicar ou /cancelar para descartar.'
      };

    case 'awaiting_confirmation':
      if (msgLower === '/confirmar' || msgLower === 'confirmar') {
        return {
          action: 'publish_draft',
          message: '✅ Rascunho publicado com sucesso!'
        };
      } else if (msgLower === '/cancelar' || msgLower === 'cancelar') {
        return {
          action: 'cancel_draft',
          message: '❌ Rascunho cancelado.'
        };
      } else {
        return {
          action: 'show_confirmation_buttons',
          message: 'Por favor, use os botões abaixo para confirmar ou cancelar.'
        };
      }

    case 'editing':
      return {
        action: 'update_draft',
        content: sanitizedMessage,
        message: '✅ Rascunho atualizado! Use /confirmar para publicar.'
      };

    case 'idle':
      return {
        action: 'process_command',
        command: msgLower,
        message: 'Comando recebido'
      };

    default:
      // Default case for unexpected states
      console.warn(`Unexpected state: ${record.status}`);
      return {
        action: 'reset_state',
        message: '⚠️ Estado inesperado detectado. Reiniciando...\nUse /start para começar.'
      };
  }
}

// ==================== 4. TELEGRAM INTERACTIVE BUTTONS ====================

/**
 * Creates inline keyboard markup for Telegram buttons
 * @param {string} type - Button type ('confirm_cancel', 'drafts_list', 'pagination')
 * @param {Object} data - Additional data for button generation
 * @returns {Object} - Telegram inline keyboard markup
 */
function createInlineKeyboard(type, data = {}) {
  // Use a switch statement to avoid evaluating all keyboard types
  switch (type) {
    case 'confirm_cancel':
      return {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: 'action:confirm' },
            { text: '❌ Cancelar', callback_data: 'action:cancel' }
          ],
          [
            { text: '✏️ Editar', callback_data: 'action:edit' }
          ]
        ]
      };

    case 'drafts_list':
      return {
        inline_keyboard: (data.drafts || []).map(draft => [
          {
            text: `📝 ${draft.content.substring(0, 30)}... (${draft.status})`,
            callback_data: `draft:${draft.id}`
          }
        ]).concat(data.hasMore ? [
          [
            { text: '⬅️ Anterior', callback_data: `page:${data.currentPage - 1}` },
            { text: `${data.currentPage}/${data.totalPages}`, callback_data: 'page:current' },
            { text: 'Próximo ➡️', callback_data: `page:${data.currentPage + 1}` }
          ]
        ] : [])
      };

    case 'draft_actions':
      return {
        inline_keyboard: [
          [
            { text: '👁️ Ver Completo', callback_data: `view:${data.draftId}` },
            { text: '✏️ Editar', callback_data: `edit:${data.draftId}` }
          ],
          [
            { text: '🚀 Publicar', callback_data: `publish:${data.draftId}` },
            { text: '🗑️ Excluir', callback_data: `delete:${data.draftId}` }
          ],
          [
            { text: '⬅️ Voltar', callback_data: 'back:list' }
          ]
        ]
      };

    case 'delete_confirmation':
      return {
        inline_keyboard: [
          [
            { text: '⚠️ Sim, excluir', callback_data: `confirm_delete:${data.draftId}` },
            { text: '❌ Não, manter', callback_data: `cancel_delete:${data.draftId}` }
          ]
        ]
      };

    default:
      return { inline_keyboard: [] };
  }
}

/**
 * Formats drafts list message with pagination
 * @param {Object} draftsData - Data from getDrafts function
 * @returns {string} - Formatted message
 */
function formatDraftsMessage(draftsData) {
  if (draftsData.drafts.length === 0) {
    return '📭 Você não tem rascunhos salvos.';
  }

  let message = `📝 *Seus Rascunhos* (Página ${draftsData.currentPage}/${draftsData.totalPages})\n\n`;
  
  draftsData.drafts.forEach((draft, index) => {
    const number = (draftsData.currentPage - 1) * 5 + index + 1;
    const preview = draft.content.substring(0, 50);
    const status = draft.status === 'pending' ? '⏳' : '✅';
    
    message += `${number}. ${status} ${preview}${draft.content.length > 50 ? '...' : ''}\n`;
    message += `   _ID: ${draft.id} | ${new Date(draft.created_at).toLocaleDateString()}_\n\n`;
  });

  if (draftsData.hasMore) {
    message += `\n_Mostrando ${draftsData.drafts.length} de ${draftsData.total} rascunhos_`;
  }

  return message;
}

// ==================== 5. TELEGRAM WEBHOOK HANDLER ====================

/**
 * Main handler for Telegram webhook
 * This would be called from n8n webhook node
 */
async function handleTelegramWebhook(webhookData, db) {
  try {
    const message = webhookData.message;
    const callbackQuery = webhookData.callback_query;
    
    // Handle callback queries (button presses)
    if (callbackQuery) {
      return await handleCallbackQuery(callbackQuery, db);
    }

    // Handle text messages
    if (message?.text) {
      return await handleTextMessage(message, db);
    }

    return {
      success: false,
      error: 'Unsupported message type'
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handles text messages
 */
async function handleTextMessage(message, db) {
  const userId = message.from.id;
  const text = message.text;
  const chatId = message.chat.id;

  // Get user state
  const userStateQuery = 'SELECT * FROM user_states WHERE user_id = ?';
  const stateResult = await db.executeQuery(userStateQuery, [userId]);
  const userState = stateResult[0] || { status: 'idle' };

  // Process based on state
  const response = processUserState(userState, text);

  // Execute action
  switch (response.action) {
    case 'save_draft':
      const draftId = await db.insertDraft(userId, response.content);
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: response.message,
        reply_markup: createInlineKeyboard('confirm_cancel'),
        parse_mode: 'Markdown'
      };

    case 'show_confirmation_buttons':
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: response.message,
        reply_markup: createInlineKeyboard('confirm_cancel')
      };

    case 'process_command':
      return await handleCommand(response.command, userId, chatId, db);

    case 'error':
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: response.message
      };

    default:
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: response.message
      };
  }
}

/**
 * Handles callback queries (button presses)
 */
async function handleCallbackQuery(query, db) {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const callbackData = query.data;

  const [action, value] = callbackData.split(':');

  switch (action) {
    case 'action':
      if (value === 'confirm') {
        // Publish draft
        return {
          method: 'editMessageText',
          chat_id: chatId,
          message_id: messageId,
          text: '✅ Rascunho publicado com sucesso!'
        };
      } else if (value === 'cancel') {
        // Cancel draft - Note: You need to track current draft ID in user state
        // For this example, we'll just send confirmation message
        return {
          method: 'editMessageText',
          chat_id: chatId,
          message_id: messageId,
          text: '❌ Rascunho cancelado.'
        };
      }
      break;

    case 'page':
      const page = parseInt(value, 10);
      const drafts = await db.getDrafts(userId, page);
      return {
        method: 'editMessageText',
        chat_id: chatId,
        message_id: messageId,
        text: formatDraftsMessage(drafts),
        reply_markup: createInlineKeyboard('drafts_list', drafts),
        parse_mode: 'Markdown'
      };

    case 'draft':
      const draftId = parseInt(value, 10);
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: '📝 Opções do Rascunho:',
        reply_markup: createInlineKeyboard('draft_actions', { draftId })
      };

    case 'delete':
      const deleteId = parseInt(value, 10);
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: '⚠️ Tem certeza que deseja excluir este rascunho?',
        reply_markup: createInlineKeyboard('delete_confirmation', { draftId: deleteId })
      };

    case 'confirm_delete':
      const confirmDeleteId = parseInt(value, 10);
      await db.deleteDraft(confirmDeleteId, userId);
      return {
        method: 'editMessageText',
        chat_id: chatId,
        message_id: messageId,
        text: '🗑️ Rascunho excluído com sucesso!'
      };
  }

  return {
    method: 'answerCallbackQuery',
    callback_query_id: query.id,
    text: 'Ação processada'
  };
}

/**
 * Handles bot commands
 */
async function handleCommand(command, userId, chatId, db) {
  switch (command) {
    case '/start':
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: '👋 Bem-vindo! Use /ajuda para ver os comandos disponíveis.',
        reply_markup: {
          keyboard: [
            [{ text: '📝 Novo Rascunho' }, { text: '📋 Meus Rascunhos' }],
            [{ text: '❓ Ajuda' }]
          ],
          resize_keyboard: true
        }
      };

    case '/listar':
    case '📋 meus rascunhos':
      const drafts = await db.getDrafts(userId, 1, 5);
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: formatDraftsMessage(drafts),
        reply_markup: createInlineKeyboard('drafts_list', drafts),
        parse_mode: 'Markdown'
      };

    case '/ajuda':
    case '❓ ajuda':
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `
📚 *Comandos Disponíveis:*

/start - Iniciar o bot
/novo - Criar novo rascunho
/listar - Ver seus rascunhos
/ajuda - Mostrar esta mensagem

*Como usar:*
1. Use /novo ou clique em "📝 Novo Rascunho"
2. Digite o conteúdo do seu rascunho
3. Use os botões para confirmar, editar ou cancelar
        `,
        parse_mode: 'Markdown'
      };

    default:
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: '❓ Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.'
      };
  }
}

// ==================== EXPORTS ====================

module.exports = {
  sanitizeText,
  validateInput,
  DatabaseHelper,
  processUserState,
  createInlineKeyboard,
  formatDraftsMessage,
  handleTelegramWebhook,
  handleTextMessage,
  handleCallbackQuery,
  handleCommand
};
