-- User invite + activation fields
-- Compatible with MySQL 8+
ALTER TABLE `user`
    ADD COLUMN IF NOT EXISTS `status` VARCHAR(32) NOT NULL DEFAULT 'INVITED',
    MODIFY `password` VARCHAR(120) NULL,
    ADD COLUMN IF NOT EXISTS `full_name` VARCHAR(160),
    ADD COLUMN IF NOT EXISTS `city` VARCHAR(120),
    ADD COLUMN IF NOT EXISTS `company` VARCHAR(120),
    ADD COLUMN IF NOT EXISTS `phone` VARCHAR(40),
    ADD COLUMN IF NOT EXISTS `fleet_size` INT,
    ADD COLUMN IF NOT EXISTS `vehicle` VARCHAR(120),
    ADD COLUMN IF NOT EXISTS `reset_token_hash` VARCHAR(160),
    ADD COLUMN IF NOT EXISTS `reset_token_signature` VARCHAR(128),
    ADD COLUMN IF NOT EXISTS `reset_token_expiry` DATETIME(6),
    ADD COLUMN IF NOT EXISTS `reset_token_used` TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `reset_token_used_at` DATETIME(6),
    ADD UNIQUE INDEX IF NOT EXISTS `uq_user_email` (`email`);

-- Normalize existing rows
UPDATE `user` SET `status` = 'INVITED' WHERE `status` IS NULL;
UPDATE `user` SET `enabled` = 0, `status` = 'DISABLED' WHERE `status` = 'DISABLED' AND `enabled` = 1;
