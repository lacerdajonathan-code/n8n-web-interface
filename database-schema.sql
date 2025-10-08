-- ========================================
-- Telegram Bot Database Schema
-- ========================================
-- This schema supports the secure Telegram bot workflow
-- with prepared statements and transaction support

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS draft_attachments CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS user_states CASCADE;

-- ========================================
-- User States Table
-- ========================================
-- Tracks the current state of each user in the bot conversation
CREATE TABLE user_states (
  user_id BIGINT PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'idle' NOT NULL,
  current_draft_id INT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('idle', 'awaiting_draft', 'awaiting_confirmation', 'editing', 'listing'))
);

-- Indexes for user_states
CREATE INDEX idx_user_states_status ON user_states(status);
CREATE INDEX idx_user_states_activity ON user_states(last_activity);

-- ========================================
-- Drafts Table
-- ========================================
-- Stores user draft messages
CREATE TABLE drafts (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Constraints
  CONSTRAINT check_draft_status CHECK (status IN ('pending', 'published', 'deleted', 'archived')),
  CONSTRAINT check_content_length CHECK (length(content) <= 4096)
);

-- Indexes for drafts
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);
CREATE INDEX idx_drafts_user_status ON drafts(user_id, status);

-- ========================================
-- Draft Attachments Table
-- ========================================
-- Stores media attachments associated with drafts
CREATE TABLE draft_attachments (
  id SERIAL PRIMARY KEY,
  draft_id INT NOT NULL,
  file_id VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Foreign key with CASCADE delete
  CONSTRAINT fk_attachment_draft 
    FOREIGN KEY (draft_id) 
    REFERENCES drafts(id) 
    ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT check_file_type CHECK (file_type IN ('photo', 'video', 'document', 'audio', 'voice'))
);

-- Indexes for draft_attachments
CREATE INDEX idx_attachments_draft_id ON draft_attachments(draft_id);
CREATE INDEX idx_attachments_file_id ON draft_attachments(file_id);

-- ========================================
-- Foreign Key for user_states
-- ========================================
-- Link user states to their current draft
ALTER TABLE user_states 
ADD CONSTRAINT fk_user_states_draft 
FOREIGN KEY (current_draft_id) 
REFERENCES drafts(id) 
ON DELETE SET NULL;

-- ========================================
-- Functions and Triggers
-- ========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for drafts table
CREATE TRIGGER update_drafts_updated_at
BEFORE UPDATE ON drafts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to update user's last activity
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_states 
  SET last_activity = CURRENT_TIMESTAMP 
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user activity when draft is created/updated
CREATE TRIGGER update_activity_on_draft
AFTER INSERT OR UPDATE ON drafts
FOR EACH ROW
EXECUTE FUNCTION update_user_activity();

-- ========================================
-- Sample Data (Optional - for testing)
-- ========================================

-- Insert sample user state
INSERT INTO user_states (user_id, status) 
VALUES (123456789, 'idle')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample drafts
INSERT INTO drafts (user_id, content, status) VALUES
  (123456789, 'Este é um rascunho de teste 📝', 'pending'),
  (123456789, 'Outro rascunho com emojis 🚀🌟', 'pending'),
  (123456789, 'Rascunho já publicado', 'published')
ON CONFLICT DO NOTHING;

-- ========================================
-- Useful Queries for Administration
-- ========================================

-- Count drafts by status
-- SELECT status, COUNT(*) as count FROM drafts GROUP BY status;

-- Find inactive users (no activity in 30 days)
-- SELECT user_id, last_activity 
-- FROM user_states 
-- WHERE last_activity < NOW() - INTERVAL '30 days';

-- Get user's draft statistics
-- SELECT 
--   user_id,
--   COUNT(*) as total_drafts,
--   COUNT(*) FILTER (WHERE status = 'pending') as pending_drafts,
--   COUNT(*) FILTER (WHERE status = 'published') as published_drafts
-- FROM drafts
-- GROUP BY user_id;

-- ========================================
-- Security and Maintenance
-- ========================================

-- Grant appropriate permissions (adjust for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON drafts TO telegram_bot_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_states TO telegram_bot_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON draft_attachments TO telegram_bot_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO telegram_bot_user;

-- ========================================
-- Cleanup Old Data (Run periodically)
-- ========================================

-- Function to cleanup old deleted drafts
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete drafts marked as deleted older than 90 days
  DELETE FROM drafts 
  WHERE status = 'deleted' 
  AND updated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT cleanup_old_drafts();

-- ========================================
-- Performance Monitoring Views
-- ========================================

-- View for draft statistics
CREATE OR REPLACE VIEW draft_statistics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_created,
  COUNT(*) FILTER (WHERE status = 'published') as published,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(DISTINCT user_id) as unique_users
FROM drafts
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for active users
CREATE OR REPLACE VIEW active_users AS
SELECT 
  user_id,
  status,
  last_activity,
  (SELECT COUNT(*) FROM drafts d WHERE d.user_id = us.user_id) as total_drafts
FROM user_states us
WHERE last_activity > NOW() - INTERVAL '7 days'
ORDER BY last_activity DESC;

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE user_states IS 'Tracks conversation state for each Telegram user';
COMMENT ON TABLE drafts IS 'Stores draft messages with content limited to 4096 characters';
COMMENT ON TABLE draft_attachments IS 'Stores media attachments linked to drafts via foreign key';

COMMENT ON COLUMN drafts.content IS 'Draft content, sanitized to prevent XSS and SQL injection';
COMMENT ON COLUMN user_states.status IS 'Current conversation state: idle, awaiting_draft, awaiting_confirmation, editing';
COMMENT ON COLUMN drafts.status IS 'Draft lifecycle status: pending, published, deleted, archived';

-- ========================================
-- End of Schema
-- ========================================
