USE ucc_ces_portal;

UPDATE proposals
SET proponents = COALESCE(proponents, JSON_ARRAY()),
    activity_components = COALESCE(activity_components, JSON_ARRAY()),
    estimated_cost_items = COALESCE(estimated_cost_items, JSON_ARRAY()),
    justification = COALESCE(justification, ''),
    target_beneficiaries = COALESCE(target_beneficiaries, ''),
    target_outputs = COALESCE(target_outputs, ''),
    possible_risks = COALESCE(possible_risks, '');

ALTER TABLE proposals
    MODIFY proponents JSON NOT NULL,
    MODIFY activity_components JSON NOT NULL,
    MODIFY estimated_cost_items JSON NOT NULL,
    MODIFY justification TEXT NOT NULL,
    MODIFY target_beneficiaries TEXT NOT NULL,
    MODIFY target_outputs TEXT NOT NULL,
    MODIFY possible_risks TEXT NOT NULL;
