USE ucc_ces_portal;

ALTER TABLE proposals
    ADD COLUMN proponents JSON NULL AFTER summary,
    ADD COLUMN activity_components JSON NULL AFTER proponents,
    ADD COLUMN estimated_cost_items JSON NULL AFTER activity_components,
    ADD COLUMN total_estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER estimated_cost_items,
    ADD COLUMN justification TEXT NULL AFTER total_estimated_cost,
    ADD COLUMN target_beneficiaries TEXT NULL AFTER justification,
    ADD COLUMN target_outputs TEXT NULL AFTER target_beneficiaries,
    ADD COLUMN possible_risks TEXT NULL AFTER target_outputs,
    ADD COLUMN expected_private_partnerships TEXT NULL AFTER possible_risks;
