USE ucc_ces_portal;

ALTER TABLE attendance
    ADD COLUMN checked_out_at DATETIME NULL AFTER scanned_at,
    ADD COLUMN verification_status ENUM('pending', 'verified') NOT NULL DEFAULT 'pending' AFTER checked_out_at;

UPDATE attendance
SET verification_status = IF(scanned_at IS NOT NULL OR marked_by IS NOT NULL, 'verified', 'pending');
