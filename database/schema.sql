CREATE DATABASE IF NOT EXISTS ucc_ces_portal
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE ucc_ces_portal;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_change_required TINYINT(1) NOT NULL DEFAULT 0,
    role ENUM('admin', 'partner', 'volunteer') NOT NULL,
    account_status ENUM('pending', 'approved', 'rejected', 'disabled') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(40) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role_status (role, account_status)
) ENGINE=InnoDB;

CREATE TABLE partners (
    user_id BIGINT UNSIGNED NOT NULL,
    organization_name VARCHAR(190) NOT NULL,
    organization_type ENUM('NGA', 'LGU', 'NGO', 'Private Sector', 'BPO', 'Church', 'UCC Department', 'College', 'Barangay', 'Other') NOT NULL,
    organization_category VARCHAR(120) NOT NULL DEFAULT 'Other',
    official_designation VARCHAR(190) NULL,
    verification_path VARCHAR(500) NULL,
    address VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_partners_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE volunteer_profiles (
    user_id BIGINT UNSIGNED NOT NULL,
    volunteer_type ENUM('student', 'professor', 'tanod', 'civilian', 'other') NOT NULL,
    student_number VARCHAR(20) NULL,
    faculty_id VARCHAR(80) NULL,
    tanod_id VARCHAR(80) NULL,
    affiliation_name VARCHAR(190) NULL,
    campus VARCHAR(190) NULL,
    course_program VARCHAR(190) NULL,
    year_section VARCHAR(100) NULL,
    barangay VARCHAR(190) NULL,
    affiliation_proof_path VARCHAR(500) NULL,
    registration_classification VARCHAR(100) NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_volunteer_student_number (student_number),
    CONSTRAINT fk_volunteer_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sectors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sectors_name (name)
) ENGINE=InnoDB;

CREATE TABLE subcategories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sector_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subcategory_sector_name (sector_id, name),
    CONSTRAINT fk_subcategory_sector FOREIGN KEY (sector_id) REFERENCES sectors (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE partner_subcategories (
    partner_user_id BIGINT UNSIGNED NOT NULL,
    subcategory_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (partner_user_id, subcategory_id),
    CONSTRAINT fk_partner_subcategories_partner FOREIGN KEY (partner_user_id) REFERENCES partners (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_partner_subcategories_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (name) VALUES
    ('Environment'),
    ('Disaster Preparedness'),
    ('Entrepreneurship'),
    ('Values Formation'),
    ('Health and Sanitation'),
    ('Education'),
    ('Recreation'),
    ('Gender and Development');

CREATE TABLE proposals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(190) NOT NULL,
    summary TEXT NOT NULL,
    proponents JSON NOT NULL,
    activity_components JSON NOT NULL,
    estimated_cost_items JSON NOT NULL,
    total_estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    justification TEXT NOT NULL,
    target_beneficiaries TEXT NOT NULL,
    target_outputs TEXT NOT NULL,
    possible_risks TEXT NOT NULL,
    expected_private_partnerships TEXT NULL,
    status ENUM('draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected') NOT NULL DEFAULT 'draft',
    period_start DATE NULL,
    period_end DATE NULL,
    stated_duration VARCHAR(100) NULL,
    review_notes TEXT NULL,
    submitted_at DATETIME NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_proposals_status_submitted (status, submitted_at),
    KEY idx_proposals_owner_status (owner_user_id, status),
    CONSTRAINT fk_proposals_owner FOREIGN KEY (owner_user_id) REFERENCES users (id),
    CONSTRAINT fk_proposals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE proposal_classifications (
    proposal_id BIGINT UNSIGNED NOT NULL,
    classification ENUM('CES', 'Student Development') NOT NULL,
    PRIMARY KEY (proposal_id, classification),
    CONSTRAINT fk_proposal_classification_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE proposal_categories (
    proposal_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (proposal_id, category_id),
    CONSTRAINT fk_proposal_categories_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_proposal_categories_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;

CREATE TABLE proposal_partners (
    proposal_id BIGINT UNSIGNED NOT NULL,
    partner_user_id BIGINT UNSIGNED NOT NULL,
    relationship ENUM('primary', 'collaborator') NOT NULL,
    invitation_status ENUM('accepted', 'pending', 'declined') NOT NULL DEFAULT 'accepted',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (proposal_id, partner_user_id),
    KEY idx_proposal_partners_user (partner_user_id, invitation_status),
    CONSTRAINT fk_proposal_partners_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_proposal_partners_user FOREIGN KEY (partner_user_id) REFERENCES partners (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    document_type ENUM('signed_proposal_letter', 'project_brief', 'moa', 'mou', 'narrative_report', 'other') NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    description VARCHAR(500) NULL,
    is_signed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_documents_proposal_type (proposal_id, document_type, is_signed),
    CONSTRAINT fk_documents_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_user FOREIGN KEY (uploaded_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT UNSIGNED NOT NULL,
    organizer_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(190) NOT NULL,
    description TEXT NULL,
    capacity INT UNSIGNED NOT NULL,
    applications_open_at DATETIME NULL,
    applications_close_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_events_proposal (proposal_id),
    CONSTRAINT fk_events_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE event_partners (
    event_id BIGINT UNSIGNED NOT NULL,
    partner_user_id BIGINT UNSIGNED NOT NULL,
    relationship ENUM('organizer', 'collaborator') NOT NULL DEFAULT 'collaborator',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, partner_user_id),
    KEY idx_event_partners_user (partner_user_id, event_id),
    CONSTRAINT fk_event_partners_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_partners_partner FOREIGN KEY (partner_user_id) REFERENCES partners (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE event_dates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    event_date DATE NOT NULL,
    qr_token_hash CHAR(64) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_date (event_id, event_date),
    UNIQUE KEY uq_event_date_qr_hash (qr_token_hash),
    CONSTRAINT fk_event_dates_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_date_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(190) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    target_participants INT UNSIGNED NULL,
    activity_lead VARCHAR(190) NULL,
    PRIMARY KEY (id),
    KEY idx_activities_event_date (event_date_id),
    CONSTRAINT fk_activities_event_date FOREIGN KEY (event_date_id) REFERENCES event_dates (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE event_applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    volunteer_user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_application_volunteer (event_id, volunteer_user_id),
    KEY idx_event_applications_status (event_id, status),
    CONSTRAINT fk_event_applications_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_applications_volunteer FOREIGN KEY (volunteer_user_id) REFERENCES volunteer_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE attendance (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id BIGINT UNSIGNED NOT NULL,
    event_date_id BIGINT UNSIGNED NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL,
    scanned_at DATETIME NULL,
    marked_by BIGINT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_application_date (application_id, event_date_id),
    KEY idx_attendance_event_date_status (event_date_id, status),
    CONSTRAINT fk_attendance_application FOREIGN KEY (application_id) REFERENCES event_applications (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_event_date FOREIGN KEY (event_date_id) REFERENCES event_dates (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_marker FOREIGN KEY (marked_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE budget_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_budget_items_proposal (proposal_id),
    CONSTRAINT fk_budget_items_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_budget_items_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE evaluations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT UNSIGNED NOT NULL,
    submitted_by BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    feedback TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_evaluations_proposal (proposal_id, created_at),
    CONSTRAINT fk_evaluations_proposal FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_user FOREIGN KEY (submitted_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE participant_counts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_date_id BIGINT UNSIGNED NOT NULL,
    participant_group VARCHAR(120) NOT NULL,
    participant_count INT UNSIGNED NOT NULL,
    recorded_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_participant_counts_date (event_date_id),
    CONSTRAINT fk_participant_counts_date FOREIGN KEY (event_date_id) REFERENCES event_dates (id) ON DELETE CASCADE,
    CONSTRAINT fk_participant_counts_user FOREIGN KEY (recorded_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE certificates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    volunteer_user_id BIGINT UNSIGNED NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_certificate_event_volunteer (event_id, volunteer_user_id),
    CONSTRAINT fk_certificates_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_certificates_volunteer FOREIGN KEY (volunteer_user_id) REFERENCES volunteer_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    subject VARCHAR(190) NOT NULL,
    message TEXT NOT NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_created (user_id, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
