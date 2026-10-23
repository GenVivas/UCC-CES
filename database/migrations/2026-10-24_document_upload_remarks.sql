USE ucc_ces_portal;

ALTER TABLE documents
    ADD COLUMN description VARCHAR(500) NULL AFTER file_size;
