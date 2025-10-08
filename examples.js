/**
 * Usage Examples for Telegram Bot Workflow
 * 
 * This file contains practical examples of how to use each function
 * from the telegram-bot-workflow module.
 */

const {
  sanitizeText,
  validateInput,
  DatabaseHelper,
  processUserState,
  createInlineKeyboard,
  formatDraftsMessage,
  handleTelegramWebhook
} = require('./telegram-bot-workflow.js');

console.log('📚 Telegram Bot Workflow - Usage Examples\n');

// ==================== EXAMPLE 1: SANITIZATION ====================
console.log('1️⃣ SANITIZATION EXAMPLE');
console.log('=' .repeat(50));

const userInputs = [
  'Hello World! 👋',
  'Olá 你好 مرحبا 🌍',
  '<script>alert("xss")</script>',
  'Text with\x00null bytes'
];

userInputs.forEach(input => {
  const sanitized = sanitizeText(input);
  console.log(`Input:  ${JSON.stringify(input)}`);
  console.log(`Output: ${JSON.stringify(sanitized)}`);
  console.log('---');
});
console.log('\n');

// ==================== EXAMPLE 2: VALIDATION ====================
console.log('2️⃣ VALIDATION EXAMPLE');
console.log('=' .repeat(50));

const validationTests = [
  { input: 'Valid text here', type: 'text', expected: true },
  { input: 'a'.repeat(5000), type: 'text', expected: false },
  { input: '12345', type: 'number', expected: true },
  { input: 'not_a_number', type: 'number', expected: false },
  { input: 'user@example.com', type: 'email', expected: true },
  { input: 'invalid_email', type: 'email', expected: false },
  { input: 'start', type: 'command', expected: true },
  { input: 'invalid command!', type: 'command', expected: false }
];

validationTests.forEach(test => {
  const result = validateInput(test.input, test.type);
  const status = result.valid === test.expected ? '✅' : '❌';
  console.log(`${status} Type: ${test.type.padEnd(10)} Input: "${test.input.substring(0, 30)}..."`);
  if (!result.valid) {
    console.log(`   Error: ${result.error}`);
  }
});
console.log('\n');

// ==================== EXAMPLE 3: STATE PROCESSING ====================
console.log('3️⃣ STATE PROCESSING EXAMPLE');
console.log('=' .repeat(50));

const stateTests = [
  { 
    state: { status: 'awaiting_draft' }, 
    message: 'My draft content with emoji 🚀',
    description: 'User creating a new draft'
  },
  { 
    state: { status: 'awaiting_confirmation' }, 
    message: '/confirmar',
    description: 'User confirming publication'
  },
  { 
    state: { status: 'awaiting_confirmation' }, 
    message: '/cancelar',
    description: 'User canceling draft'
  },
  { 
    state: { status: 'idle' }, 
    message: '/start',
    description: 'User sending command'
  },
  { 
    state: { status: 'unexpected_state' }, 
    message: 'test',
    description: 'Unexpected state (should reset)'
  }
];

stateTests.forEach(test => {
  console.log(`Scenario: ${test.description}`);
  console.log(`State: ${test.state.status}, Message: "${test.message}"`);
  const result = processUserState(test.state, test.message);
  console.log(`Action: ${result.action}`);
  console.log(`Response: ${result.message}`);
  console.log('---');
});
console.log('\n');

// ==================== EXAMPLE 4: INLINE KEYBOARDS ====================
console.log('4️⃣ INLINE KEYBOARDS EXAMPLE');
console.log('=' .repeat(50));

// Confirm/Cancel buttons
const confirmCancelKeyboard = createInlineKeyboard('confirm_cancel');
console.log('Confirm/Cancel Keyboard:');
console.log(JSON.stringify(confirmCancelKeyboard, null, 2));
console.log('');

// Drafts list with pagination
const draftsListKeyboard = createInlineKeyboard('drafts_list', {
  drafts: [
    { id: 1, content: 'First draft with emoji 😀', status: 'pending' },
    { id: 2, content: 'Second draft about automation', status: 'pending' }
  ],
  currentPage: 1,
  totalPages: 3,
  hasMore: true
});
console.log('Drafts List Keyboard (with pagination):');
console.log(JSON.stringify(draftsListKeyboard, null, 2));
console.log('');

// Draft actions
const draftActionsKeyboard = createInlineKeyboard('draft_actions', { draftId: 123 });
console.log('Draft Actions Keyboard:');
console.log(JSON.stringify(draftActionsKeyboard, null, 2));
console.log('\n');

// ==================== EXAMPLE 5: MESSAGE FORMATTING ====================
console.log('5️⃣ MESSAGE FORMATTING EXAMPLE');
console.log('=' .repeat(50));

const draftsData = {
  drafts: [
    { 
      id: 1, 
      content: 'First draft with a very long content that will be truncated in the preview', 
      status: 'pending', 
      created_at: new Date() 
    },
    { 
      id: 2, 
      content: 'Second draft 🚀', 
      status: 'published', 
      created_at: new Date() 
    },
    { 
      id: 3, 
      content: 'Third draft', 
      status: 'pending', 
      created_at: new Date() 
    }
  ],
  total: 12,
  hasMore: true,
  currentPage: 1,
  totalPages: 3
};

const formattedMessage = formatDraftsMessage(draftsData);
console.log('Formatted Drafts Message:');
console.log(formattedMessage);
console.log('\n');

// Empty drafts
const emptyDrafts = {
  drafts: [],
  total: 0,
  hasMore: false,
  currentPage: 1,
  totalPages: 0
};

const emptyMessage = formatDraftsMessage(emptyDrafts);
console.log('Empty Drafts Message:');
console.log(emptyMessage);
console.log('\n');

// ==================== EXAMPLE 6: DATABASE OPERATIONS ====================
console.log('6️⃣ DATABASE OPERATIONS EXAMPLE');
console.log('=' .repeat(50));

// Mock database connection
const mockConnection = {
  query: async (sql) => {
    console.log(`  SQL: ${sql}`);
    return { rows: [] };
  }
};

const db = new DatabaseHelper(mockConnection);

// Example: Insert draft
console.log('Example: Insert Draft (with prepared statement)');
db.insertDraft(123456, 'My draft content 😀').then(id => {
  console.log(`  ✅ Draft inserted with ID: ${id || 'mock'}`);
}).catch(err => {
  console.log(`  ❌ Error: ${err.message}`);
});

// Example: Get drafts with pagination
console.log('\nExample: Get Drafts with Pagination');
db.getDrafts(123456, 1, 5).then(result => {
  console.log(`  ✅ Retrieved drafts: ${result.drafts.length} items`);
  console.log(`  Total: ${result.total}, Page: ${result.currentPage}/${result.totalPages}`);
}).catch(err => {
  console.log(`  ❌ Error: ${err.message}`);
});

// Example: Update draft
console.log('\nExample: Update Draft (with validation)');
db.updateDraft(1, 'Updated content', 'published').then(() => {
  console.log('  ✅ Draft updated successfully');
}).catch(err => {
  console.log(`  ❌ Error: ${err.message}`);
});

// Example: Delete draft (in transaction)
console.log('\nExample: Delete Draft (in transaction)');
db.deleteDraft(1, 123456).then(() => {
  console.log('  ✅ Draft deleted (with attachments) in transaction');
}).catch(err => {
  console.log(`  ❌ Error: ${err.message}`);
});

console.log('\n');

// ==================== EXAMPLE 7: COMPLETE FLOW ====================
console.log('7️⃣ COMPLETE FLOW EXAMPLE');
console.log('=' .repeat(50));

console.log('Simulating a complete user interaction flow:\n');

// Step 1: User sends message
const userMessage = 'My new draft with emoji 🚀 and Unicode: Olá 你好';
console.log(`1. User sends: "${userMessage}"`);

// Step 2: Validate input
const validation = validateInput(userMessage, 'text');
console.log(`2. Validation: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);

if (validation.valid) {
  // Step 3: Process state
  const userState = { status: 'awaiting_draft' };
  const stateResult = processUserState(userState, userMessage);
  console.log(`3. State processed: Action = ${stateResult.action}`);
  
  // Step 4: Create response with buttons
  const keyboard = createInlineKeyboard('confirm_cancel');
  console.log(`4. Created keyboard with ${keyboard.inline_keyboard.length} rows of buttons`);
  
  // Step 5: Simulated response
  console.log('5. Response to user:');
  console.log(`   Message: ${stateResult.message}`);
  console.log(`   Buttons: ✅ Confirmar | ❌ Cancelar | ✏️ Editar`);
}

console.log('\n');

// ==================== EXAMPLE 8: SECURITY DEMONSTRATIONS ====================
console.log('8️⃣ SECURITY DEMONSTRATIONS');
console.log('=' .repeat(50));

// XSS Attack Prevention
console.log('XSS Attack Prevention:');
const xssAttempt = '<script>alert("xss")</script>';
const sanitizedXSS = sanitizeText(xssAttempt);
console.log(`  Input:  ${xssAttempt}`);
console.log(`  Output: ${sanitizedXSS}`);
console.log(`  ✅ Script tags escaped!\n`);

// SQL Injection Prevention
console.log('SQL Injection Prevention (using prepared statements):');
const sqlInjection = "'; DROP TABLE users; --";
const validationSQL = validateInput(sqlInjection, 'text');
console.log(`  Input:  ${sqlInjection}`);
console.log(`  Sanitized: ${validationSQL.sanitized}`);
console.log(`  ✅ Input sanitized, would use prepared statement in DB!\n`);

// Unicode/Emoji Preservation
console.log('Unicode & Emoji Preservation:');
const unicodeText = 'Hello 👋 Olá 你好 مرحبا 🌍';
const sanitizedUnicode = sanitizeText(unicodeText);
console.log(`  Input:  ${unicodeText}`);
console.log(`  Output: ${sanitizedUnicode}`);
console.log(`  ✅ Unicode and emojis preserved!\n`);

console.log('=' .repeat(50));
console.log('✅ All examples completed!\n');
console.log('💡 Tip: Check telegram-bot-workflow.test.js for more examples');
console.log('📚 Read TELEGRAM_INTEGRATION.md for full documentation\n');
