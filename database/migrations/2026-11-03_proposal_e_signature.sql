USE ucc_ces_portal;

ALTER TABLE proposals
    ADD COLUMN e_signature_path VARCHAR(500) NULL AFTER proposer_name;
