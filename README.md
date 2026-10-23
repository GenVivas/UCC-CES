# UCC-CES Partnership & Project Proposal Management

A PHP 8.2 / MySQL application for the UCC Community Extension Services workflow.

## Local XAMPP setup

1. Enable Apache `mod_rewrite` and allow `.htaccess` overrides for this project.
2. Import [`database/schema.sql`](./database/schema.sql) using phpMyAdmin or the MySQL client. It creates a separate `ucc_ces_portal` database; the existing `ucc_ces` database is not used.
3. Install PHP dependencies with Composer (`composer install`). If PHP's ZIP extension is disabled, enable it for the Composer command (for XAMPP, `C:\xampp\php\php.exe -d extension=zip C:\path\to\composer.phar install`).
4. Configure database credentials in environment variables (`CES_DB_HOST`, `CES_DB_PORT`, `CES_DB_NAME`, `CES_DB_USER`, `CES_DB_PASSWORD`) or create an ignored `config/local.php`:

   ```php
   <?php
   return [
       'database' => [
           'host' => '127.0.0.1',
           'port' => '3306',
           'name' => 'ucc_ces_portal',
           'user' => 'root',
           'password' => '',
       ],
       'app_key' => 'replace-with-at-least-32-random-characters',
   ];
   ```

   Generate a key with `C:\xampp\php\php.exe -r "echo bin2hex(random_bytes(32));"`. Use a different, secret key in each deployed environment.
5. Create the first CES Admin from PowerShell:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\CES\scripts\create-admin.php
   ```

   To create the preconfigured `admin@gmail.com` / `Genises Vivas` account with a generated one-time password, run `C:\xampp\php\php.exe C:\xampp\htdocs\CES\scripts\seed-admin.php`. The temporary password is printed once and must be changed on first sign-in.

6. Open `http://localhost/CES/`. Apache must be configured to serve this project and process its rewrite rules.

Uploaded proof and proposal files are stored under `public/uploads/`; Apache access to that directory is denied and files are delivered through authenticated API routes. PHP requires PDO MySQL and Fileinfo. Set `CES_APP_KEY` to a unique random value of at least 32 characters to enable date-locked attendance QR codes. Set `CES_SMTP_HOST`, `CES_SMTP_PORT`, `CES_SMTP_USERNAME`, `CES_SMTP_PASSWORD`, `CES_SMTP_ENCRYPTION`, `CES_SMTP_FROM`, and optionally `CES_SMTP_FROM_NAME` to enable PHPMailer email delivery; in-app notifications work without SMTP. The writable upload directory is created automatically.

For an existing installation created from an earlier schema, back up the database and apply [`database/migrations/2026-10-23_registration_verification_and_event_partners.sql`](./database/migrations/2026-10-23_registration_verification_and_event_partners.sql) once before enabling the updated registration flow. It adds organization and volunteer verification metadata plus event-partner links, backfills current partner categories and existing event organizers, and preserves the existing proposal collaboration relationships.

For existing installations, also apply [`database/migrations/2026-10-23_account_rejection_reason.sql`](./database/migrations/2026-10-23_account_rejection_reason.sql) once to store the required reason when an administrator rejects an account.

For existing installations, apply [`database/migrations/2026-10-24_proposal_project_brief.sql`](./database/migrations/2026-10-24_proposal_project_brief.sql) once to add the structured Project Brief fields to proposals. New partner drafts can be completed with the four-step brief wizard and exported as a printable PDF; CES Admins can inspect the full brief from the proposal dossier.

For existing installations, apply [`database/migrations/2026-10-24_document_upload_remarks.sql`](./database/migrations/2026-10-24_document_upload_remarks.sql) once to store optional remarks alongside proposal attachments. The Proposal Register uses a modal uploader for PDF, DOCX, PNG, and JPG files up to 10 MB.

For a local PHP-only UI smoke test (without Apache), run `C:\xampp\php\php.exe -S 127.0.0.1:8027 -t C:\xampp\htdocs\CES\public C:\xampp\htdocs\CES\scripts\dev-router.php`.

## Implemented workflows

- Two-step partner/volunteer account registration with role-specific verification uploads, admin approval, password hashing, session rotation, role checks, and CSRF-protected mutations.
- Partner directory listing and CES Admin sector creation.
- Four-step Project Brief proposal drafts with co-proponents, activity components, server-calculated itemized budget totals, beneficiaries, outputs, risk/mitigation details, classifications/categories, document uploads, required-document submission checks, reviewer dossier inspection, and access-controlled printable PDF exports.
- Browser-history-aware module routes (`/proposals`, `/directory`, `/events`, `/accounts`, `/reports`, `/notifications`) that restore the selected workspace after refresh and support Back/Forward navigation while retaining session-based authorization.
- Collaborator invitations and responses, multi-partner project/event access, event scheduling, volunteer applications, date-locked QR attendance, organizer overrides, and an absence-marking CLI job.
- Partner dashboards and event calendars scoped to owned or linked proposals/events, public active UCC-CES calendar context, linked-event attendee and participant summaries, and partner-authorized attendance CSV exports. Event dates, attendance, applications, certificates, and event-related reports are checked against event partnerships; administrator event views remain global.
- Scoped, date-required non-financial project reports with CSV/PDF exports, in-app notifications, and configurable SMTP email delivery.

Run `C:\xampp\php\php.exe scripts\mark-absences.php` daily (after midnight Manila time) to record absences for approved volunteers on past event dates. Review production Apache, database backup, mail delivery, and QR rendering configuration before deployment.
