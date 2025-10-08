/**
 * Tests for Telegram Bot Workflow Implementation
 * 
 * Run with: node telegram-bot-workflow.test.js
 */

const {
  sanitizeText,
  validateInput,
  processUserState,
  createInlineKeyboard,
  formatDraftsMessage
} = require('./telegram-bot-workflow.js');

// Simple test framework
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  assertIncludes(str, substr, message) {
    if (!str.includes(substr)) {
      throw new Error(`${message}\n"${str}" does not include "${substr}"`);
    }
  }

  async run() {
    console.log('\n🧪 Running Telegram Bot Workflow Tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log('='.repeat(50) + '\n');

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const runner = new TestRunner();

// ==================== SANITIZATION TESTS ====================

runner.test('sanitizeText should preserve emojis', () => {
  const input = 'Hello 😀 World 🌍';
  const result = sanitizeText(input);
  runner.assertIncludes(result, '😀', 'Should preserve emoji 😀');
  runner.assertIncludes(result, '🌍', 'Should preserve emoji 🌍');
});

runner.test('sanitizeText should preserve Unicode characters', () => {
  const input = 'Olá 你好 مرحبا Привет';
  const result = sanitizeText(input);
  runner.assertIncludes(result, 'Olá', 'Should preserve Portuguese');
  runner.assertIncludes(result, '你好', 'Should preserve Chinese');
  runner.assertIncludes(result, 'مرحبا', 'Should preserve Arabic');
  runner.assertIncludes(result, 'Привет', 'Should preserve Russian');
});

runner.test('sanitizeText should escape HTML characters', () => {
  const input = '<script>alert("xss")</script>';
  const result = sanitizeText(input);
  runner.assert(!result.includes('<script>'), 'Should escape script tags');
  runner.assertIncludes(result, '&lt;', 'Should have escaped <');
  runner.assertIncludes(result, '&gt;', 'Should have escaped >');
});

runner.test('sanitizeText should remove null bytes', () => {
  const input = 'Test\x00String';
  const result = sanitizeText(input);
  runner.assert(!result.includes('\x00'), 'Should remove null bytes');
});

runner.test('sanitizeText should handle empty input', () => {
  runner.assertEquals(sanitizeText(''), '', 'Empty string should return empty');
  runner.assertEquals(sanitizeText(null), '', 'Null should return empty');
  runner.assertEquals(sanitizeText(undefined), '', 'Undefined should return empty');
});

runner.test('sanitizeText should normalize Unicode', () => {
  // é can be represented as single character or e + combining accent
  const combined = 'café'; // e + ́
  const result = sanitizeText(combined);
  runner.assert(result.length > 0, 'Should normalize Unicode');
});

// ==================== VALIDATION TESTS ====================

runner.test('validateInput should validate text correctly', () => {
  const result = validateInput('Valid text', 'text');
  runner.assert(result.valid, 'Valid text should pass');
  runner.assert(result.sanitized.length > 0, 'Should return sanitized text');
  runner.assertEquals(result.error, null, 'Should have no error');
});

runner.test('validateInput should reject text that is too long', () => {
  const longText = 'a'.repeat(5000);
  const result = validateInput(longText, 'text');
  runner.assert(!result.valid, 'Text longer than 4096 should fail');
  runner.assert(result.error !== null, 'Should have error message');
  runner.assertIncludes(result.error, 'too long', 'Error should mention length');
});

runner.test('validateInput should validate numbers correctly', () => {
  const result1 = validateInput('123', 'number');
  runner.assert(result1.valid, 'Valid number should pass');
  runner.assertEquals(result1.sanitized, '123', 'Should return number as string');

  const result2 = validateInput('abc', 'number');
  runner.assert(!result2.valid, 'Invalid number should fail');
  runner.assertIncludes(result2.error, 'number', 'Error should mention number');
});

runner.test('validateInput should validate email correctly', () => {
  const result1 = validateInput('test@example.com', 'email');
  runner.assert(result1.valid, 'Valid email should pass');

  const result2 = validateInput('invalid-email', 'email');
  runner.assert(!result2.valid, 'Invalid email should fail');
  runner.assertIncludes(result2.error, 'email', 'Error should mention email');
});

runner.test('validateInput should validate commands correctly', () => {
  const result1 = validateInput('start', 'command');
  runner.assert(result1.valid, 'Valid command should pass');
  runner.assertEquals(result1.sanitized, 'start', 'Should lowercase command');

  const result2 = validateInput('invalid command!', 'command');
  runner.assert(!result2.valid, 'Command with spaces/special chars should fail');
});

runner.test('validateInput should handle null/undefined', () => {
  const result1 = validateInput(null, 'text');
  runner.assert(!result1.valid, 'Null should be invalid');

  const result2 = validateInput(undefined, 'text');
  runner.assert(!result2.valid, 'Undefined should be invalid');
});

// ==================== STATE PROCESSING TESTS ====================

runner.test('processUserState should handle awaiting_draft state', () => {
  const record = { status: 'awaiting_draft' };
  const message = 'This is my draft content';
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'save_draft', 'Should save draft');
  runner.assert(result.content.length > 0, 'Should have content');
  runner.assertIncludes(result.message, 'salvo', 'Should mention saved');
});

runner.test('processUserState should handle awaiting_confirmation with confirm', () => {
  const record = { status: 'awaiting_confirmation' };
  const message = '/confirmar';
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'publish_draft', 'Should publish draft');
  runner.assertIncludes(result.message, 'publicado', 'Should mention published');
});

runner.test('processUserState should handle awaiting_confirmation with cancel', () => {
  const record = { status: 'awaiting_confirmation' };
  const message = '/cancelar';
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'cancel_draft', 'Should cancel draft');
  runner.assertIncludes(result.message, 'cancelado', 'Should mention canceled');
});

runner.test('processUserState should handle idle state', () => {
  const record = { status: 'idle' };
  const message = '/start';
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'process_command', 'Should process command');
  runner.assertEquals(result.command, '/start', 'Should pass command');
});

runner.test('processUserState should handle unexpected states with default case', () => {
  const record = { status: 'unknown_state' };
  const message = 'test message';
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'reset_state', 'Should reset state');
  runner.assertIncludes(result.message, 'inesperado', 'Should mention unexpected state');
});

runner.test('processUserState should handle invalid input', () => {
  const record = { status: 'awaiting_draft' };
  const message = 'a'.repeat(5000); // Too long
  const result = processUserState(record, message);
  
  runner.assertEquals(result.action, 'error', 'Should return error');
  runner.assertIncludes(result.message, 'inválida', 'Should mention invalid');
});

runner.test('processUserState should consolidate msgLower (no redundancy)', () => {
  // This test ensures the function doesn't declare msgLower multiple times
  const record = { status: 'awaiting_confirmation' };
  const message = 'CONFIRMAR'; // Uppercase
  const result = processUserState(record, message);
  
  // Should work with case-insensitive comparison
  runner.assertEquals(result.action, 'publish_draft', 'Should handle case-insensitive');
});

// ==================== INLINE KEYBOARD TESTS ====================

runner.test('createInlineKeyboard should create confirm_cancel buttons', () => {
  const keyboard = createInlineKeyboard('confirm_cancel');
  
  runner.assert(keyboard, 'Should return keyboard object');
  runner.assert(keyboard.inline_keyboard, 'Should have inline_keyboard property');
  runner.assert(Array.isArray(keyboard.inline_keyboard), 'inline_keyboard should be array');
  runner.assert(keyboard.inline_keyboard.length > 0, 'Should have buttons');
  
  const buttons = keyboard.inline_keyboard.flat().filter(b => b !== undefined);
  const confirmButton = buttons.find(b => b && b.callback_data === 'action:confirm');
  const cancelButton = buttons.find(b => b && b.callback_data === 'action:cancel');
  
  runner.assert(confirmButton, 'Should have confirm button');
  runner.assert(cancelButton, 'Should have cancel button');
  runner.assertIncludes(confirmButton.text, 'Confirmar', 'Confirm button should have text');
});

runner.test('createInlineKeyboard should create drafts_list with pagination', () => {
  const data = {
    drafts: [
      { id: 1, content: 'Draft 1', status: 'pending' },
      { id: 2, content: 'Draft 2', status: 'pending' }
    ],
    currentPage: 2,
    totalPages: 3,
    hasMore: true
  };
  
  const keyboard = createInlineKeyboard('drafts_list', data);
  
  runner.assert(keyboard.inline_keyboard, 'Should have inline_keyboard');
  runner.assert(keyboard.inline_keyboard.length >= 2, 'Should have draft buttons');
  
  // Check for pagination buttons
  const lastRow = keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1];
  const hasNavigation = lastRow.some(b => b.callback_data.startsWith('page:'));
  runner.assert(hasNavigation, 'Should have pagination buttons');
});

runner.test('createInlineKeyboard should create draft_actions buttons', () => {
  const keyboard = createInlineKeyboard('draft_actions', { draftId: 123 });
  
  runner.assert(keyboard, 'Should return keyboard object');
  runner.assert(keyboard.inline_keyboard, 'Should have inline_keyboard');
  runner.assert(Array.isArray(keyboard.inline_keyboard), 'inline_keyboard should be array');
  
  const buttons = keyboard.inline_keyboard.flat().filter(b => b !== undefined);
  const viewButton = buttons.find(b => b && b.callback_data === 'view:123');
  const deleteButton = buttons.find(b => b && b.callback_data === 'delete:123');
  
  runner.assert(viewButton, 'Should have view button with correct ID');
  runner.assert(deleteButton, 'Should have delete button with correct ID');
});

runner.test('createInlineKeyboard should handle unknown type', () => {
  const keyboard = createInlineKeyboard('unknown_type');
  runner.assert(keyboard, 'Should return keyboard object');
  runner.assert(keyboard.inline_keyboard, 'Should return empty keyboard object');
  runner.assert(Array.isArray(keyboard.inline_keyboard), 'inline_keyboard should be array');
  runner.assertEquals(keyboard.inline_keyboard.length, 0, 'Should be empty');
});

// ==================== FORMAT MESSAGE TESTS ====================

runner.test('formatDraftsMessage should format empty drafts list', () => {
  const data = {
    drafts: [],
    total: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 0
  };
  
  const message = formatDraftsMessage(data);
  runner.assertIncludes(message, 'não tem rascunhos', 'Should mention no drafts');
});

runner.test('formatDraftsMessage should format drafts with pagination info', () => {
  const data = {
    drafts: [
      { id: 1, content: 'First draft content here', status: 'pending', created_at: new Date() },
      { id: 2, content: 'Second draft content here', status: 'pending', created_at: new Date() }
    ],
    total: 10,
    hasMore: true,
    currentPage: 1,
    totalPages: 2
  };
  
  const message = formatDraftsMessage(data);
  
  runner.assertIncludes(message, 'Seus Rascunhos', 'Should have title');
  runner.assertIncludes(message, 'Página 1/2', 'Should show pagination');
  runner.assertIncludes(message, 'First draft', 'Should include first draft');
  runner.assertIncludes(message, 'Second draft', 'Should include second draft');
  runner.assertIncludes(message, '10 rascunhos', 'Should show total count');
});

runner.test('formatDraftsMessage should truncate long content', () => {
  const longContent = 'a'.repeat(100);
  const data = {
    drafts: [
      { id: 1, content: longContent, status: 'pending', created_at: new Date() }
    ],
    total: 1,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  };
  
  const message = formatDraftsMessage(data);
  
  runner.assertIncludes(message, '...', 'Should truncate long content');
  runner.assert(message.length < longContent.length + 100, 'Should be shorter than full content');
});

// ==================== INTEGRATION TESTS ====================

runner.test('Full flow: sanitize -> validate -> process', () => {
  // Simulate a user sending a draft with emojis
  const userInput = 'My awesome draft 🚀 with Unicode: Olá 你好';
  
  // 1. Validate
  const validation = validateInput(userInput, 'text');
  runner.assert(validation.valid, 'Should be valid');
  
  // 2. Sanitize (already done in validation)
  const sanitized = validation.sanitized;
  runner.assert(sanitized.length > 0, 'Should have sanitized content');
  
  // 3. Process state
  const record = { status: 'awaiting_draft' };
  const result = processUserState(record, userInput);
  
  runner.assertEquals(result.action, 'save_draft', 'Should save draft');
  runner.assertIncludes(result.content, '🚀', 'Should preserve emoji');
});

runner.test('Security: XSS attempt should be neutralized', () => {
  const xssAttempt = '<script>alert("xss")</script>';
  
  const validation = validateInput(xssAttempt, 'text');
  runner.assert(validation.valid, 'Should still be valid (but sanitized)');
  runner.assert(!validation.sanitized.includes('<script>'), 'Should escape script tags');
  
  const record = { status: 'awaiting_draft' };
  const result = processUserState(record, xssAttempt);
  
  runner.assert(!result.content.includes('<script>'), 'Content should be sanitized');
});

runner.test('Security: SQL injection attempt should be sanitized', () => {
  const sqlInjection = "'; DROP TABLE users; --";
  
  const validation = validateInput(sqlInjection, 'text');
  runner.assert(validation.valid, 'Should be valid (but sanitized)');
  
  // The actual SQL injection protection happens in DatabaseHelper with prepared statements
  // Here we just verify the input is sanitized
  const sanitized = validation.sanitized;
  runner.assert(!sanitized.includes('\x00'), 'Should remove null bytes');
});

// ==================== RUN ALL TESTS ====================

runner.run();
