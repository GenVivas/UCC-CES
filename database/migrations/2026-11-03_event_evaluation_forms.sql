USE ucc_ces_portal;

CREATE TABLE evaluation_forms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    title VARCHAR(190) NOT NULL,
    description TEXT NULL,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_evaluation_forms_event (event_id),
    KEY idx_evaluation_forms_status (status, is_active),
    CONSTRAINT fk_evaluation_forms_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_forms_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE evaluation_questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    form_id BIGINT UNSIGNED NOT NULL,
    question_text VARCHAR(500) NOT NULL,
    question_type ENUM('rating', 'multiple_choice', 'checkboxes', 'dropdown', 'short_answer', 'paragraph') NOT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    settings JSON NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_evaluation_questions_form_order (form_id, sort_order, id),
    CONSTRAINT fk_evaluation_questions_form FOREIGN KEY (form_id) REFERENCES evaluation_forms (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    form_id BIGINT UNSIGNED NOT NULL,
    event_id BIGINT UNSIGNED NOT NULL,
    volunteer_user_id BIGINT UNSIGNED NOT NULL,
    answers JSON NOT NULL,
    questions_snapshot JSON NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_evaluation_response_form_volunteer (form_id, volunteer_user_id),
    KEY idx_evaluation_responses_form_submitted (form_id, submitted_at),
    KEY idx_evaluation_responses_event_submitted (event_id, submitted_at),
    CONSTRAINT fk_evaluation_responses_form FOREIGN KEY (form_id) REFERENCES evaluation_forms (id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_responses_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_responses_volunteer FOREIGN KEY (volunteer_user_id) REFERENCES volunteer_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
