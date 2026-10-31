# UCC-CES Partnership & Project Proposal Management

A PHP 8.2 / MySQL application for the UCC Community Extension Services workflow.

## Local XAMPP setup

1. Enable Apache `mod_rewrite` and allow `.htaccess` overrides for this project.
2. Import [`database/schema.sql`](./database/schema.sql) using phpMyAdmin or the MySQL client. It creates a separate `ucc_ces_portal` database; the existing `ucc_ces` database is not used.
3. Install PHP dependencies with Composer (`composer install`). If PHP's ZIP extension is disabled, enable it for the Composer command (for XAMPP, `C:\xampp\php\php.exe -d extension=zip C:\path\to\composer.phar install` from `C:\xampp\htdocs\UCC-CES`).
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

   Generate a key with `C:\xampp\php\php.exe -r "echo bin2hex(random_bytes(32));"`. Use a different, secret key in each deployed environment. For XAMPP, `config/local.php` is the reliable way to provide the key to Apache when environment variables are not configured for the Apache process; this file is ignored by Git.
5. Create the first CES Admin from PowerShell:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\UCC-CES\scripts\create-admin.php
   ```

   To create the preconfigured `admin@gmail.com` / `Genises Vivas` account with a generated one-time password, run `C:\xampp\php\php.exe C:\xampp\htdocs\UCC-CES\scripts\seed-admin.php`. The temporary password is printed once and must be changed on first sign-in.

6. Open `http://localhost/UCC-CES/` for the CES landing page. Use **Sign In** or **Open Portal** to enter the application; the direct portal route is `http://localhost/UCC-CES/portal` and sign-in is also available at `/login`. Existing app routes such as `/events` and `/proposals` remain available. Apache must be configured to serve this project and process its rewrite rules.

To repopulate a local development database with a large fictional dataset, run `C:\xampp\php\php.exe C:\xampp\htdocs\UCC-CES\scripts\seed-sample-data.php --apply`. This replaces project, event, and other transactional data while preserving existing accounts and their linked profiles. It creates three inert status-only sample accounts using reserved `example.invalid` addresses and cryptographically random, undisclosed passwords. The seed covers every account, proposal, event-application, collaborator-invitation, attendance, verification, proposal-document, notification-read, and attendance-scan-action state, plus past/current/future event schedules, reports, documentation, and activity logs. All attached PDFs are generic local demonstration files labeled as fictional. The seeder requires at least one approved admin, one approved partner, two approved volunteers with profiles, the attendance migration on existing installations, and the local demonstration PDFs under `public/uploads/sample-seed/`. Do not run it against a production database.

Uploaded proof and proposal files are stored under `public/uploads/`; Apache access to that directory is denied and files are delivered through authenticated API routes. PHP requires PDO MySQL and Fileinfo. Set `CES_APP_KEY` to a unique random value of at least 32 characters to enable date-locked attendance QR codes; event detail navigation and schedule creation do not depend on this key, and existing date tokens are initialized when an authorized organizer first requests that day's QR after the key is configured. Set `CES_APP_URL` to the public application URL when generated Evaluation QR codes must be scanned from other devices; otherwise, the QR URL is derived from the current request host. Set `CES_SMTP_HOST`, `CES_SMTP_PORT`, `CES_SMTP_USERNAME`, `CES_SMTP_PASSWORD`, `CES_SMTP_ENCRYPTION`, `CES_SMTP_FROM`, and optionally `CES_SMTP_FROM_NAME` to enable PHPMailer email delivery; in-app notifications work without SMTP. Set `CES_CONTACT_EMAIL` to change the contact-form recipient (defaults to `ces@ucc.edu.ph`). The contact form reports delivery failures instead of claiming a message was sent when SMTP is unavailable. For Gmail OTP recovery, use `smtp.gmail.com`, port `587`, encryption `tls`, the full Gmail address as both username and sender, and a Google App Password as `CES_SMTP_PASSWORD` (not the normal Gmail password). Password recovery returns an explicit configuration/delivery error if SMTP is unavailable. The writable upload directory is created automatically.

For local XAMPP configuration, the application reads environment variables supplied to PHP/Apache and then applies the ignored `config/local.php` override. If Apache does not inherit `CES_APP_KEY`, generate a random key once (for example, `bin2hex(random_bytes(32))` from the PHP CLI) and store that generated value as the `app_key` string in `config/local.php`; do not generate it while loading the config because the file is evaluated on every request. Restart Apache and verify the Events & Attendance page can generate QR codes. Keep this file private and out of source control; changing the key invalidates previously generated QR tokens until they are regenerated by an authorized organizer.

Proposal full details contain the project brief, proposed partner organizations, classifications, categories, and estimated budget. Attendance, event schedules, volunteer/participant activity, event documentation, and evaluations are managed from Events & Attendance and the event-history modules.

For an existing installation created from an earlier schema, back up the database and apply [`database/migrations/2026-10-23_registration_verification_and_event_partners.sql`](./database/migrations/2026-10-23_registration_verification_and_event_partners.sql) once before enabling the updated registration flow. It adds organization and volunteer verification metadata plus event-partner links, backfills current partner categories and existing event organizers, and preserves the existing proposal collaboration relationships.

For existing installations, also apply [`database/migrations/2026-10-23_account_rejection_reason.sql`](./database/migrations/2026-10-23_account_rejection_reason.sql) once to store the required reason when an administrator rejects an account.

For existing installations, apply [`database/migrations/2026-10-24_proposal_project_brief.sql`](./database/migrations/2026-10-24_proposal_project_brief.sql) once to add the structured Project Brief fields to proposals. New partner drafts can be completed with the four-step brief wizard and exported as a printable PDF; CES Admins can inspect the full brief from the proposal dossier.

For existing installations, apply [`database/migrations/2026-10-24_proposal_activation.sql`](./database/migrations/2026-10-24_proposal_activation.sql) once to add proposal and event venue fields. Admin activation now requires an explicit permanent-action confirmation, creates the linked event and scheduled dates transactionally, copies accepted partner entities, and notifies Admin accounts. A signed MOA / MOU is optional; proposal submission still requires a signed proposal letter and project brief.

For existing installations, apply [`database/migrations/2026-10-24_attendance_check_out_verification.sql`](./database/migrations/2026-10-24_attendance_check_out_verification.sql) once to add attendance check-out timestamps and verification states.

For existing installations, apply [`database/migrations/2026-10-24_document_upload_remarks.sql`](./database/migrations/2026-10-24_document_upload_remarks.sql) once to store optional remarks alongside proposal attachments. The Proposal Register uses a modal uploader for PDF, DOCX, PNG, and JPG files up to 10 MB.

For existing installations, apply [`database/migrations/2026-10-24_activity_logs.sql`](./database/migrations/2026-10-24_activity_logs.sql) once before deploying the updated API. Authentication and account, proposal, volunteer, and attendance workflows now write to the audit log.

For existing installations, apply [`database/migrations/2026-10-24_password_recovery_and_partner_event_documentations.sql`](./database/migrations/2026-10-24_password_recovery_and_partner_event_documentations.sql) once. It adds rate-limited password-reset OTP storage and partner event-documentation storage.

For existing installations, apply [`database/migrations/2026-10-26_attendance_scan_integrity.sql`](./database/migrations/2026-10-26_attendance_scan_integrity.sql) once. It adds attendance record timestamps, enforces that Time Out cannot precede Time In, and records successful scan request IDs to reject replays. The attendance table's existing unique key, combined with unique volunteer/event applications and unique event dates, enforces one attendance record per volunteer, event, and event date.

For existing installations, apply [`database/migrations/2026-10-26_password_reset_session_revocation.sql`](./database/migrations/2026-10-26_password_reset_session_revocation.sql) once. Password resets and authenticated password changes increment a per-user session version so previously authenticated sessions are rejected on their next API request.

For existing installations, apply [`database/migrations/2026-10-27_proposal_proposer_name.sql`](./database/migrations/2026-10-27_proposal_proposer_name.sql) once. It adds and backfills the proposal's proposer full name. The `proposals.status` enum already exists in the current schema and does not need a duplicate migration.

For a local PHP-only UI smoke test (without Apache), run `C:\xampp\php\php.exe -S 127.0.0.1:8027 -t C:\xampp\htdocs\UCC-CES\public C:\xampp\htdocs\UCC-CES\scripts\dev-router.php`.

## Implemented workflows

- Two-step partner/volunteer account registration with role-specific verification uploads, admin approval, password hashing, session rotation, role checks, and CSRF-protected mutations.
- Gmail SMTP password recovery with expiring six-digit OTPs, attempt and request throttles, a one-time reset token, and refreshed CSRF tokens after logout.
- Four-step Project Brief proposal drafts with a named proposer and a unified organization selector for co-proponents/external partners, venue/location, activity components, server-calculated itemized budget totals, beneficiaries, outputs, risk/mitigation details, classifications/categories, document uploads, required proposal-letter/project-brief submission checks, reviewer dossier inspection, and access-controlled printable PDF exports.
- CES Admins can create Project Brief drafts for approved partners from the Proposals register, attach required documents, and submit them through the standard review workflow. Proposal rows open a dedicated, full-page details view with role-appropriate proposal actions.
- Browser-history-aware module routes (`/proposals`, `/events`, `/accounts`, `/reports`, `/evaluations`, `/event-history`, `/activity-logs`, `/profile`) that restore the selected workspace after refresh and support Back/Forward navigation while retaining session-based authorization.
- Ten-record pagination with total counts and Previous, Next, and page-number controls across the proposal, event, account, volunteer, notification, report, history, and audit-log lists.
- Event detail attendance-log actions that open the selected event's date-by-date volunteer attendance records.
- Proposal collaborator invitations and responses, including integrated partner-account creation: CES Admin-created accounts are immediately approved and invited, while partner-created accounts remain pending until CES Admin approval. Pending accounts are excluded from collaborator choices.
- Co-proponent and external partner organization selection from UCC campuses and approved/pending partner entities, with modal creation for new partner accounts that remain pending Admin approval.
- Partner event documentation for linked completed events, with server-enforced uploads only after three full days have elapsed; completed events are archived under Event History & Documentations rather than active Events & Attendance.
- Multi-partner project/event access, event scheduling, volunteer applications, date-locked QR check-in/check-out, attendance verification, organizer overrides, and an absence-marking CLI job.
- Partner dashboards and event calendars scoped to owned or linked proposals/events, public active UCC-CES calendar context, linked-event attendee and participant summaries, and partner-authorized attendance CSV exports. Event dates, attendance, applications, certificates, and event-related reports are checked against event partnerships; administrator event views remain global.
- The administrator Events & Attendance calendar and management table include activated proposals missing a linked event as a recovery path; normal activation creates that event and its schedule atomically. Event details include scoped roster and attendance management, event metadata editing, attendance QR codes available on each scheduled date, and an evaluation QR code available only on the final scheduled date.
- Scoped, date-required system reports for proposals and budgets, partner involvement, events, volunteer applications and attendance, rendered volunteer hours/classifications, participant counts, evaluation ratings, certificates, and documentation, with CSV/PDF exports.
- Reports refresh automatically as filters change, default to the current month-to-date, and group detailed filters and export actions in a compact responsive toolbar.
- Role-scoped evaluation analytics, completed event/documentation archives, administrative activity logs with actor and IP information, and a self-service profile/security page.
- In-app notifications and configurable SMTP email delivery.
- Proposal activation confirmation with a complete project summary, irreversible-action acknowledgement, linked Events & Attendance scheduling, accepted partner migration, and Admin notifications.

Run `C:\xampp\php\php.exe scripts\mark-absences.php` daily (after midnight Manila time) to record absences for approved volunteers on past event dates. Review production Apache, database backup, mail delivery, and QR rendering configuration before deployment.
