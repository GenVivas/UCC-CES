USE ucc_ces_portal;

CREATE TABLE volunteer_event_evaluations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    volunteer_user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    feedback TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_volunteer_event_evaluation (event_id, volunteer_user_id),
    KEY idx_volunteer_evaluations_user_created (volunteer_user_id, created_at),
    CONSTRAINT fk_volunteer_evaluations_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_volunteer_evaluations_user FOREIGN KEY (volunteer_user_id) REFERENCES volunteer_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE volunteer_documentations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    volunteer_user_id BIGINT UNSIGNED NOT NULL,
    documentation_type ENUM('photo', 'report', 'accomplishment', 'other') NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_volunteer_documentations_user_created (volunteer_user_id, created_at),
    CONSTRAINT fk_volunteer_documentations_user FOREIGN KEY (volunteer_user_id) REFERENCES volunteer_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
