USE ucc_ces_portal;

ALTER TABLE attendance
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER note,
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD CONSTRAINT chk_attendance_time_order CHECK (
        checked_out_at IS NULL OR (scanned_at IS NOT NULL AND checked_out_at >= scanned_at)
    );

CREATE TABLE attendance_scan_requests (
    scan_request_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attendance_id BIGINT UNSIGNED NOT NULL,
    action ENUM('check_in', 'check_out') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scan_request_id),
    KEY idx_attendance_scan_requests_attendance (attendance_id),
    CONSTRAINT fk_attendance_scan_requests_record FOREIGN KEY (attendance_id) REFERENCES attendance (id) ON DELETE CASCADE
) ENGINE=InnoDB;
