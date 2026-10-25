USE ucc_ces_portal;

ALTER TABLE proposals
    ADD COLUMN venue VARCHAR(255) NULL AFTER summary;

ALTER TABLE events
    ADD COLUMN venue VARCHAR(255) NULL AFTER description;
