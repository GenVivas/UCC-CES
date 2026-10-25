USE ucc_ces_portal;

CREATE TABLE event_documentations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    documentation_type ENUM('photo', 'report', 'accomplishment', 'other') NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_event_documentations_event_created (event_id, created_at),
    KEY idx_event_documentations_uploader_created (uploaded_by, created_at),
    CONSTRAINT fk_event_documentations_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_documentations_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_reset_otps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(190) NOT NULL,
    request_ip_hash CHAR(64) NOT NULL,
    code_hash VARCHAR(255) NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    verified_at DATETIME NULL,
    reset_token_hash CHAR(64) NULL,
    reset_expires_at DATETIME NULL,
    consumed_at DATETIME NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_password_reset_email_requested (email, requested_at),
    KEY idx_password_reset_ip_requested (request_ip_hash, requested_at)
) ENGINE=InnoDB;
