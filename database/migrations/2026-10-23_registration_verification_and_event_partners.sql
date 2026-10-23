USE ucc_ces_portal;

ALTER TABLE partners
    ADD COLUMN organization_category VARCHAR(120) NOT NULL DEFAULT 'Other' AFTER organization_type,
    ADD COLUMN official_designation VARCHAR(190) NULL AFTER organization_category,
    ADD COLUMN verification_path VARCHAR(500) NULL AFTER official_designation;

UPDATE partners
SET organization_category = CASE organization_type
    WHEN 'UCC Department' THEN 'UCC Department / Academic Unit'
    WHEN 'College' THEN 'UCC Department / Academic Unit'
    WHEN 'LGU' THEN 'Local Government Unit (LGU / Barangay)'
    WHEN 'Barangay' THEN 'Local Government Unit (LGU / Barangay)'
    WHEN 'NGA' THEN 'Government Agency (e.g., MMDA, DSWD)'
    WHEN 'NGO' THEN 'NGO / Non-Profit Organization'
    WHEN 'Private Sector' THEN 'Private Sector / Corporate Partner'
    WHEN 'BPO' THEN 'Private Sector / Corporate Partner'
    ELSE 'Other'
END;

ALTER TABLE volunteer_profiles
    ADD COLUMN registration_classification VARCHAR(100) NULL AFTER affiliation_proof_path;

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

INSERT INTO event_partners (event_id, partner_user_id, relationship)
SELECT id, organizer_user_id, 'organizer'
FROM events;

INSERT IGNORE INTO event_partners (event_id, partner_user_id, relationship)
SELECT e.id, pp.partner_user_id, 'collaborator'
FROM events e
JOIN proposal_partners pp ON pp.proposal_id = e.proposal_id
WHERE pp.invitation_status = 'accepted'
  AND pp.partner_user_id <> e.organizer_user_id;
