-- User invite + activation fields
-- Compatible with MySQL 8+


ALTER TABLE [user] ADD status VARCHAR(32) NOT NULL DEFAULT 'INVITED';
ALTER TABLE [user] ALTER COLUMN password VARCHAR(120) NULL;
ALTER TABLE [user] ADD full_name VARCHAR(160);
ALTER TABLE [user] ADD city VARCHAR(120);
ALTER TABLE [user] ADD company VARCHAR(120);
ALTER TABLE [user] ADD phone VARCHAR(40);
ALTER TABLE [user] ADD fleet_size INT;
ALTER TABLE [user] ADD vehicle VARCHAR(120);
ALTER TABLE [user] ADD reset_token_hash VARCHAR(160);
ALTER TABLE [user] ADD reset_token_signature VARCHAR(128);
ALTER TABLE [user] ADD reset_token_expiry DATETIME2(6);
ALTER TABLE [user] ADD reset_token_used BIT DEFAULT 0;
ALTER TABLE [user] ADD reset_token_used_at DATETIME2(6);
CREATE UNIQUE INDEX uq_user_email ON [user] (email);

-- Normalize existing rows
UPDATE [user] SET status = 'INVITED' WHERE status IS NULL;
UPDATE [user] SET enabled = 0, status = 'DISABLED' WHERE status = 'DISABLED' AND enabled = 1;
