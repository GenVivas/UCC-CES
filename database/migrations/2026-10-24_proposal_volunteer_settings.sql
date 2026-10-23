USE ucc_ces_portal;

ALTER TABLE proposals
    ADD COLUMN accepts_volunteers TINYINT(1) NOT NULL DEFAULT 1 AFTER expected_private_partnerships,
    ADD COLUMN volunteer_approval_mode ENUM('auto', 'manual') NOT NULL DEFAULT 'manual' AFTER accepts_volunteers;
