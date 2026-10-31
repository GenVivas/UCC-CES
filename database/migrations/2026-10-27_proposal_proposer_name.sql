USE ucc_ces_portal;

ALTER TABLE proposals
    ADD COLUMN proposer_name VARCHAR(190) NULL AFTER owner_user_id;

UPDATE proposals proposal
JOIN users proposer ON proposer.id = proposal.owner_user_id
SET proposal.proposer_name = NULLIF(
    TRIM(CONCAT(proposer.first_name, ' ', proposer.last_name)),
    ''
);

UPDATE proposals
SET proposer_name = 'UCC-CES Partner'
WHERE proposer_name IS NULL;

ALTER TABLE proposals
    MODIFY COLUMN proposer_name VARCHAR(190) NOT NULL;
