USE ucc_ces_portal;

ALTER TABLE users
    ADD COLUMN rejection_reason TEXT NULL AFTER account_status;
