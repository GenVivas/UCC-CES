<?php
declare(strict_types=1);

namespace Ces\Controllers;

use Ces\Database;
use Ces\Http;
use PDO;
use RuntimeException;
use Throwable;

final class ApiController
{
    private PDO $db;
    private array $config;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->config = require dirname(__DIR__, 2) . '/config/app.php';
    }

    public function dispatch(): never
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = preg_replace('#^.*?/api(?:\.php)?#', '', $path) ?: '/';
        $path = '/' . trim($path, '/');

        try {
            $this->validateSession();
            if ($method !== 'GET') {
                Http::requireCsrf();
            }
            if (!empty($_SESSION['user']['mustChangePassword']) &&
                !in_array($path, ['/session', '/password/change', '/logout'], true)) {
                throw new RuntimeException('Change your temporary password before continuing.', 403);
            }
            $this->route($method, $path);
            Http::json(['error' => 'Not found.'], 404);
        } catch (RuntimeException $exception) {
            $status = $exception->getCode();
            $status = $status >= 400 && $status <= 599 ? $status : 400;
            Http::json(['error' => $exception->getMessage()], $status);
        } catch (Throwable $exception) {
            error_log(sprintf('Unhandled API error: %s in %s:%d', $exception->getMessage(), $exception->getFile(), $exception->getLine()));
            Http::json(['error' => 'The request could not be completed. Please try again later.'], 500);
        }
    }

    private function route(string $method, string $path): void
    {
        if ($path === '/session' && $method === 'GET') {
            Http::json(['user' => $_SESSION['user'] ?? null, 'csrfToken' => $_SESSION['csrf_token']]);
        }
        if ($path === '/register' && $method === 'POST') {
            $this->register();
        }
        if ($path === '/login' && $method === 'POST') {
            $this->login();
        }
        if ($path === '/password/change' && $method === 'POST') {
            $this->changePassword();
        }
        if ($path === '/logout' && $method === 'POST') {
            session_destroy();
            Http::json(['message' => 'You have been signed out.']);
        }
        if ($path === '/overview' && $method === 'GET') {
            $this->overview();
        }
        if ($path === '/directory' && $method === 'GET') {
            $this->directory();
        }
        if ($path === '/directory' && $method === 'POST') {
            $this->createDirectoryEntry();
        }
        if (preg_match('#^/directory/([0-9]+)$#', $path, $matches) && $method === 'PUT') {
            $this->updatePartnerDirectory(Http::positiveId($matches[1]));
        }
        if ($path === '/categories' && $method === 'GET') {
            Http::user();
            Http::json(['categories' => $this->db->query('SELECT id, name FROM categories ORDER BY name')->fetchAll()]);
        }
        if ($path === '/accounts' && $method === 'GET') {
            $this->listAccounts();
        }

        if (preg_match('#^/accounts/([0-9]+)/review$#', $path, $matches) && $method === 'POST') {
            $this->reviewAccount(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/accounts/([0-9]+)/proof$#', $path, $matches) && $method === 'GET') {
            $this->downloadVolunteerProof(Http::positiveId($matches[1]));
        }
        if ($path === '/proposals' && $method === 'GET') {
            $this->listProposals();
        }
        if ($path === '/proposals' && $method === 'POST') {
            $this->createProposal();
        }
        if (preg_match('#^/proposals/([0-9]+)/edit-data$#', $path, $matches) && $method === 'GET') {
            $this->proposalEditData(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)$#', $path, $matches) && $method === 'PUT') {
            $this->updateProposal(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/documents$#', $path, $matches) && $method === 'POST') {
            $this->uploadProposalDocument(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/documents/([0-9]+)$#', $path, $matches) && $method === 'GET') {
            $this->downloadDocument(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/submit$#', $path, $matches) && $method === 'POST') {
            $this->submitProposal(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/review$#', $path, $matches) && $method === 'POST') {
            $this->reviewProposal(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/budget-items$#', $path, $matches) && $method === 'GET') {
            $this->listBudgetItems(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/budget-items$#', $path, $matches) && $method === 'POST') {
            $this->createBudgetItem(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/evaluations$#', $path, $matches) && $method === 'GET') {
            $this->listEvaluations(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/evaluations$#', $path, $matches) && $method === 'POST') {
            $this->createEvaluation(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/proposals/([0-9]+)/collaborators$#', $path, $matches) && $method === 'POST') {
            $this->inviteCollaborator(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/collaborations/([0-9]+)/respond$#', $path, $matches) && $method === 'POST') {
            $this->respondToCollaboration(Http::positiveId($matches[1]));
        }
        if ($path === '/events' && $method === 'POST') {
            $this->createEvent();
        }
        if ($path === '/events' && $method === 'GET') {
            $this->listEvents();
        }
        if (preg_match('#^/event-dates/([0-9]+)/attendance$#', $path, $matches) && $method === 'GET') {
            $this->listDateAttendance(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/events/([0-9]+)/apply$#', $path, $matches) && $method === 'POST') {
            $this->applyToEvent(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/events/([0-9]+)/dates$#', $path, $matches) && $method === 'GET') {
            $this->eventDates(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/events/([0-9]+)/applications$#', $path, $matches) && $method === 'GET') {
            $this->listApplications(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/events/([0-9]+)/certificates$#', $path, $matches) && $method === 'GET') {
            $this->listCertificates(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/events/([0-9]+)/certificates$#', $path, $matches) && $method === 'POST') {
            $this->issueCertificate(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/certificates/([0-9]+)$#', $path, $matches) && $method === 'GET') {
            $this->downloadCertificate(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/applications/([0-9]+)/review$#', $path, $matches) && $method === 'POST') {
            $this->reviewApplication(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/event-dates/([0-9]+)/qr$#', $path, $matches) && $method === 'GET') {
            $this->showEventQr(Http::positiveId($matches[1]));
        }
        if ($path === '/attendance/scan' && $method === 'POST') {
            $this->scanAttendance();
        }
        if ($path === '/attendance/override' && $method === 'POST') {
            $this->overrideAttendance();
        }
        if (preg_match('#^/event-dates/([0-9]+)/participants$#', $path, $matches) && $method === 'GET') {
            $this->listParticipantCounts(Http::positiveId($matches[1]));
        }
        if (preg_match('#^/event-dates/([0-9]+)/participants$#', $path, $matches) && $method === 'POST') {
            $this->createParticipantCount(Http::positiveId($matches[1]));
        }
        if ($path === '/reports' && $method === 'GET') {
            $this->report();
        }
        if (preg_match('#^/reports/projects/([0-9]+)$#', $path, $matches) && $method === 'GET') {
            $this->projectDossier(Http::positiveId($matches[1]));
        }
        if ($path === '/notifications' && $method === 'GET') {
            $this->notifications();
        }
        if (preg_match('#^/notifications/([0-9]+)/read$#', $path, $matches) && $method === 'PUT') {
            $this->markNotificationRead(Http::positiveId($matches[1]));
        }
        if ($path === '/notifications/read-all' && $method === 'PUT') {
            $this->markAllNotificationsRead();
        }
    }

    private function register(): never
    {
        $data = $this->requestData();
        $role = $data['role'] ?? '';
        if (!in_array($role, ['partner', 'volunteer'], true)) {
            throw new RuntimeException('Choose a partner or volunteer account type.');
        }
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $firstName = trim((string) ($data['firstName'] ?? ''));
        $lastName = trim((string) ($data['lastName'] ?? ''));
        $contact = trim((string) ($data['contactNumber'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            throw new RuntimeException('Enter a valid email address.');
        }
        if (strlen($password) < 12 || strlen($password) > 200) {
            throw new RuntimeException('Password must be at least 12 characters long.');
        }
        if ($firstName === '' || $lastName === '' || $contact === '') {
            throw new RuntimeException('First name, last name, and contact number are required.');
        }
        if ($this->findUserByEmail($email)) {
            throw new RuntimeException('An account with this email already exists.');
        }

        $this->db->beginTransaction();
        try {
            $insert = $this->db->prepare(
                'INSERT INTO users (email, password_hash, role, first_name, last_name, contact_number) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $insert->execute([$email, password_hash($password, PASSWORD_DEFAULT), $role, $firstName, $lastName, $contact]);
            $userId = (int) $this->db->lastInsertId();

            if ($role === 'partner') {
                $organization = trim((string) ($data['organizationName'] ?? ''));
                $organizationType = (string) ($data['organizationType'] ?? '');
                $allowedTypes = ['NGA', 'LGU', 'NGO', 'Private Sector', 'BPO', 'Church', 'UCC Department', 'College', 'Barangay', 'Other'];
                if ($organization === '' || !in_array($organizationType, $allowedTypes, true)) {
                    throw new RuntimeException('Organization name and a valid organization type are required.');
                }
                $partner = $this->db->prepare('INSERT INTO partners (user_id, organization_name, organization_type, address) VALUES (?, ?, ?, ?)');
                $partner->execute([$userId, $organization, $organizationType, trim((string) ($data['address'] ?? '')) ?: null]);
            } else {
                $this->insertVolunteerProfile($userId, $data);
            }
            $this->db->commit();
        } catch (Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($exception instanceof \PDOException && $exception->getCode() === '23000') {
                throw new RuntimeException('Email or profile identifier is already registered.', 409, $exception);
            }
            throw $exception;
        }
        $this->notifyAdmins('New account registration', sprintf('%s %s registered as a %s and is awaiting approval.', $firstName, $lastName, $role));

        Http::json(['message' => 'Registration received. An administrator must approve your account before sign-in.'], 201);
    }

    private function insertVolunteerProfile(int $userId, array $data): void
    {
        $type = (string) ($data['volunteerType'] ?? '');
        if (!in_array($type, ['student', 'professor', 'tanod', 'civilian', 'other'], true)) {
            throw new RuntimeException('Choose a valid volunteer type.');
        }
        $studentNumber = strtoupper(trim((string) ($data['studentNumber'] ?? '')));
        $facultyId = trim((string) ($data['facultyId'] ?? ''));
        $tanodId = trim((string) ($data['tanodId'] ?? ''));
        $affiliation = trim((string) ($data['affiliationName'] ?? ''));
        $campus = trim((string) ($data['campus'] ?? ''));
        $course = trim((string) ($data['courseProgram'] ?? ''));
        $barangay = trim((string) ($data['barangay'] ?? ''));

        if ($type === 'student' && !preg_match('/^\d{8}-[NS]$/', $studentNumber)) {
            throw new RuntimeException('Student number must be 8 digits followed by -N or -S.');
        }
        if ($type === 'professor' && $facultyId === '') {
            throw new RuntimeException('Faculty ID is required.');
        }
        if ($type === 'tanod' && ($tanodId === '' || $barangay === '')) {
            throw new RuntimeException('Tanod ID and assigned barangay are required.');
        }
        if (in_array($type, ['civilian', 'other'], true) && $affiliation === '') {
            throw new RuntimeException('Affiliation details are required.');
        }
        if ($type === 'student' && ($campus === '' || $course === '')) {
            throw new RuntimeException('Campus and course/program are required.');
        }

        $proofPath = $this->storeUpload('proof', 'ids', true);
        $statement = $this->db->prepare(
            'INSERT INTO volunteer_profiles (user_id, volunteer_type, student_number, faculty_id, tanod_id, affiliation_name, campus, course_program, year_section, barangay, affiliation_proof_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $userId,
            $type,
            $studentNumber ?: null,
            $facultyId ?: null,
            $tanodId ?: null,
            $affiliation ?: null,
            $campus ?: null,
            $course ?: null,
            trim((string) ($data['yearSection'] ?? '')) ?: null,
            $barangay ?: null,
            $proofPath,
        ]);
    }

    private function login(): never
    {
        $data = Http::body();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $user = $this->findUserByEmail($email);
        if (!$user || !password_verify((string) ($data['password'] ?? ''), $user['password_hash'])) {
            throw new RuntimeException('Email or password is incorrect.', 401);
        }
        if ($user['account_status'] !== 'approved') {
            throw new RuntimeException('Your account is not approved for sign-in.', 403);
        }

        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['user'] = $this->publicUser($user);
        Http::json(['user' => $_SESSION['user'], 'csrfToken' => $_SESSION['csrf_token']]);
    }

    private function changePassword(): never
    {
        $sessionUser = Http::user();
        $data = Http::body();
        $currentPassword = (string) ($data['currentPassword'] ?? '');
        $newPassword = (string) ($data['newPassword'] ?? '');
        $confirmation = (string) ($data['confirmation'] ?? '');

        if (strlen($newPassword) < 12 || strlen($newPassword) > 200) {
            throw new RuntimeException('New password must be between 12 and 200 characters.');
        }
        if (!hash_equals($newPassword, $confirmation)) {
            throw new RuntimeException('New password and confirmation do not match.');
        }

        $statement = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $statement->execute([(int) $sessionUser['id']]);
        $passwordHash = $statement->fetchColumn();
        if (!is_string($passwordHash) || !password_verify($currentPassword, $passwordHash)) {
            throw new RuntimeException('Temporary password is incorrect.', 401);
        }
        if (password_verify($newPassword, $passwordHash)) {
            throw new RuntimeException('Choose a different password from the temporary password.');
        }

        $update = $this->db->prepare('UPDATE users SET password_hash = ?, password_change_required = 0 WHERE id = ?');
        $update->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int) $sessionUser['id']]);
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['user']['mustChangePassword'] = false;
        Http::json(['message' => 'Password changed successfully.', 'user' => $_SESSION['user'], 'csrfToken' => $_SESSION['csrf_token']]);
    }

    private function overview(): never
    {
        $user = Http::user();
        if ($user['role'] === 'admin') {
            $counts = $this->db->query(
                "SELECT
                    (SELECT COUNT(*) FROM proposals) AS proposals,
                    (SELECT COUNT(*) FROM users WHERE account_status = 'pending') AS pending_accounts,
                    (SELECT COUNT(*) FROM events) AS events,
                    (SELECT COUNT(*) FROM event_applications WHERE status = 'pending') AS pending_applications,
                    (SELECT COUNT(*) FROM proposals WHERE status = 'active') AS active_projects,
                    (SELECT COUNT(*) FROM proposals WHERE status IN ('submitted', 'under_review')) AS pending_proposals,
                    (SELECT COUNT(DISTINCT e.id) FROM events e
                     JOIN proposals p ON p.id = e.proposal_id
                     JOIN event_dates ed ON ed.event_id = e.id
                     WHERE p.status = 'active' AND ed.event_date >= CURRENT_DATE) AS upcoming_events,
                    (SELECT COUNT(*) FROM users WHERE role = 'volunteer' AND account_status = 'approved') AS active_volunteers,
                    (SELECT COUNT(*) FROM users WHERE role = 'partner' AND account_status = 'approved') AS community_partners"
            )->fetch();
            foreach ($counts as $key => $value) {
                if (is_numeric($value)) {
                    $counts[$key] = (int) $value;
                }
            }

            $proposalStatus = array_fill_keys(
                ['draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected'],
                0
            );
            $statusRows = $this->db->query('SELECT status, COUNT(*) AS total FROM proposals GROUP BY status')->fetchAll();
            foreach ($statusRows as $row) {
                $proposalStatus[$row['status']] = (int) $row['total'];
            }

            $today = new \DateTimeImmutable('today');
            $monthStart = $today->modify('first day of this month')->modify('-5 months');
            $nextMonth = $today->modify('first day of next month');
            $monthlyStatement = $this->db->prepare(
                "SELECT DATE_FORMAT(event_date, '%Y-%m') AS month, COUNT(*) AS total
                 FROM event_dates
                 WHERE event_date >= ? AND event_date < ?
                 GROUP BY month ORDER BY month"
            );
            $monthlyStatement->execute([$monthStart->format('Y-m-d'), $nextMonth->format('Y-m-d')]);
            $monthlyCounts = [];
            foreach ($monthlyStatement->fetchAll() as $row) {
                $monthlyCounts[$row['month']] = (int) $row['total'];
            }
            $monthlyActivities = [];
            for ($month = $monthStart; $month < $nextMonth; $month = $month->modify('+1 month')) {
                $key = $month->format('Y-m');
                $monthlyActivities[] = ['month' => $key, 'total' => $monthlyCounts[$key] ?? 0];
            }

            $reviewQueue = $this->db->query(
                "SELECT p.id, p.title, p.status, p.updated_at, u.first_name, u.last_name
                 FROM proposals p
                 JOIN users u ON u.id = p.owner_user_id
                 WHERE p.status IN ('submitted', 'under_review')
                 ORDER BY COALESCE(p.submitted_at, p.updated_at) DESC
                 LIMIT 5"
            )->fetchAll();
            $upcomingEvents = $this->db->query(
                "SELECT e.id, e.title, p.title AS project_title, MIN(ed.event_date) AS event_date
                 FROM events e
                 JOIN proposals p ON p.id = e.proposal_id
                 JOIN event_dates ed ON ed.event_id = e.id
                 WHERE p.status = 'active' AND ed.event_date >= CURRENT_DATE
                 GROUP BY e.id, e.title, p.title
                 ORDER BY event_date, e.title
                 LIMIT 5"
            )->fetchAll();
            $periodStart = $today->modify('first day of this month');
            $previousPeriodStart = $periodStart->modify('-1 month');
            $nextPeriodStart = $periodStart->modify('+1 month');
            $periodBounds = [
                $previousPeriodStart->format('Y-m-d H:i:s'),
                $periodStart->format('Y-m-d H:i:s'),
                $nextPeriodStart->format('Y-m-d H:i:s'),
            ];
            $proposalTrend = $this->db->prepare(
                'SELECT
                    SUM(submitted_at >= ? AND submitted_at < ?) AS previous_period,
                    SUM(submitted_at >= ? AND submitted_at < ?) AS current_period
                 FROM proposals WHERE submitted_at IS NOT NULL'
            );
            $proposalTrend->execute([
                $periodBounds[0], $periodBounds[1], $periodBounds[1], $periodBounds[2],
            ]);
            $accountTrend = $this->db->prepare(
                "SELECT
                    SUM(created_at >= ? AND created_at < ?) AS previous_period,
                    SUM(created_at >= ? AND created_at < ?) AS current_period
                 FROM users WHERE role IN ('partner', 'volunteer')"
            );
            $accountTrend->execute([
                $periodBounds[0], $periodBounds[1], $periodBounds[1], $periodBounds[2],
            ]);
            $applicationTrend = $this->db->prepare(
                'SELECT
                    SUM(applied_at >= ? AND applied_at < ?) AS previous_period,
                    SUM(applied_at >= ? AND applied_at < ?) AS current_period
                 FROM event_applications'
            );
            $applicationTrend->execute([
                $periodBounds[0], $periodBounds[1], $periodBounds[1], $periodBounds[2],
            ]);
            $eventTrend = $this->db->prepare(
                'SELECT
                    SUM(created_at >= ? AND created_at < ?) AS previous_period,
                    SUM(created_at >= ? AND created_at < ?) AS current_period
                 FROM events'
            );
            $eventTrend->execute([
                $periodBounds[0], $periodBounds[1], $periodBounds[1], $periodBounds[2],
            ]);
            $toTrend = static function (array|false $row): array {
                return [
                    'previous' => (int) ($row['previous_period'] ?? 0),
                    'current' => (int) ($row['current_period'] ?? 0),
                ];
            };
            Http::json([
                'counts' => $counts,
                'proposalStatus' => $proposalStatus,
                'monthlyActivities' => $monthlyActivities,
                'reviewQueue' => $reviewQueue,
                'upcomingEvents' => $upcomingEvents,
                'monthOverMonth' => [
                    'proposal_submissions' => $toTrend($proposalTrend->fetch()),
                    'account_registrations' => $toTrend($accountTrend->fetch()),
                    'volunteer_applications' => $toTrend($applicationTrend->fetch()),
                    'scheduled_events' => $toTrend($eventTrend->fetch()),
                    'previousMonth' => $previousPeriodStart->format('M'),
                ],
                'recentActions' => $this->recentAdminActions((int) $user['id']),
            ]);
        } elseif ($user['role'] === 'partner') {
            $counts = $this->ownedProposalCounts((int) $user['id']);
        } else {
            $statement = $this->db->prepare(
                "SELECT
                    (SELECT COUNT(*) FROM event_applications WHERE volunteer_user_id = ? AND status = 'approved') AS approved_applications,
                    (SELECT COUNT(*) FROM attendance a JOIN event_applications ea ON ea.id = a.application_id WHERE ea.volunteer_user_id = ? AND a.status = 'present') AS attendance"
            );
            $statement->execute([(int) $user['id'], (int) $user['id']]);
            $counts = $statement->fetch();
        }
        Http::json(['counts' => $counts]);
    }

    private function recentAdminActions(int $adminId): array
    {
        $statement = $this->db->prepare(
            'SELECT subject, message, created_at, read_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT 8'
        );
        $statement->execute([$adminId]);
        return $statement->fetchAll();
    }

    private function directory(): never
    {
        Http::user();
        $statement = $this->db->query(
            "SELECT p.user_id AS id, p.organization_name, p.organization_type, p.address, u.account_status, u.email,
                    GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS sectors,
                    GROUP_CONCAT(DISTINCT CONCAT(s.name, ' / ', sc.name) ORDER BY s.name, sc.name SEPARATOR ', ') AS subcategories,
                    GROUP_CONCAT(DISTINCT sc.id ORDER BY sc.id SEPARATOR ',') AS subcategory_ids
             FROM partners p
             JOIN users u ON u.id = p.user_id
             LEFT JOIN partner_subcategories ps ON ps.partner_user_id = p.user_id
             LEFT JOIN subcategories sc ON sc.id = ps.subcategory_id
             LEFT JOIN sectors s ON s.id = sc.sector_id
             WHERE u.account_status = 'approved'
             GROUP BY p.user_id, p.organization_name, p.organization_type, p.address, u.account_status, u.email
             ORDER BY p.organization_name"
        );
        $sectors = $this->db->query(
            'SELECT s.id AS sector_id, s.name AS sector_name, sc.id AS subcategory_id, sc.name AS subcategory_name
             FROM sectors s LEFT JOIN subcategories sc ON sc.sector_id = s.id ORDER BY s.name, sc.name'
        )->fetchAll();
        Http::json(['partners' => $statement->fetchAll(), 'sectors' => $sectors]);
    }

    private function createDirectoryEntry(): never
    {
        Http::requireRole('admin');
        $data = Http::body();
        $type = (string) ($data['type'] ?? '');
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new RuntimeException('A name is required.');
        }
        if ($type === 'sector') {
            $exists = $this->db->prepare('SELECT 1 FROM sectors WHERE name = ?');
            $exists->execute([$name]);
            if ($exists->fetchColumn()) {
                throw new RuntimeException('That sector already exists.', 409);
            }
            $statement = $this->db->prepare('INSERT INTO sectors (name) VALUES (?)');
            $statement->execute([$name]);
        } elseif ($type === 'subcategory') {
            $sectorId = Http::positiveId((string) ($data['sectorId'] ?? ''));
            $exists = $this->db->prepare('SELECT 1 FROM subcategories WHERE sector_id = ? AND name = ?');
            $exists->execute([$sectorId, $name]);
            if ($exists->fetchColumn()) {
                throw new RuntimeException('That subcategory already exists for this sector.', 409);
            }
            $statement = $this->db->prepare('INSERT INTO subcategories (sector_id, name) VALUES (?, ?)');
            $statement->execute([$sectorId, $name]);
        } else {
            throw new RuntimeException('Directory type must be sector or subcategory.');
        }
        Http::json(['id' => (int) $this->db->lastInsertId()], 201);
    }

    private function updatePartnerDirectory(int $partnerId): never
    {
        Http::requireRole('admin');
        $data = Http::body();
        $name = trim((string) ($data['organizationName'] ?? ''));
        $type = (string) ($data['organizationType'] ?? '');
        $address = trim((string) ($data['address'] ?? ''));
        $allowedTypes = ['NGA', 'LGU', 'NGO', 'Private Sector', 'BPO', 'Church', 'UCC Department', 'College', 'Barangay', 'Other'];
        if ($name === '' || strlen($name) > 190 || !in_array($type, $allowedTypes, true) || strlen($address) > 500) {
            throw new RuntimeException('Enter a valid organization name, type, and address.');
        }
        $subcategoryIds = $data['subcategoryIds'] ?? null;
        if (!is_array($subcategoryIds)) {
            throw new RuntimeException('Choose a valid subcategory list.');
        }
        $partner = $this->db->prepare('SELECT user_id FROM partners WHERE user_id = ?');
        $partner->execute([$partnerId]);
        if (!$partner->fetchColumn()) {
            throw new RuntimeException('Partner organization was not found.', 404);
        }
        $ids = [];
        foreach (array_unique($subcategoryIds) as $subcategoryId) {
            $id = Http::positiveId((string) $subcategoryId);
            $exists = $this->db->prepare('SELECT 1 FROM subcategories WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) {
                throw new RuntimeException('A selected partner subcategory was not found.');
            }
            $ids[] = $id;
        }
        $this->db->beginTransaction();
        try {
            $update = $this->db->prepare('UPDATE partners SET organization_name = ?, organization_type = ?, address = ? WHERE user_id = ?');
            $update->execute([$name, $type, $address ?: null, $partnerId]);
            $delete = $this->db->prepare('DELETE FROM partner_subcategories WHERE partner_user_id = ?');
            $delete->execute([$partnerId]);
            $insert = $this->db->prepare('INSERT INTO partner_subcategories (partner_user_id, subcategory_id) VALUES (?, ?)');
            foreach ($ids as $subcategoryId) {
                $insert->execute([$partnerId, $subcategoryId]);
            }
            $this->db->commit();
        } catch (Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $exception;
        }
        Http::json(['message' => 'Partner organization profile and classifications updated.']);
    }

    private function listAccounts(): never
    {
        Http::requireRole('admin');
        $status = $_GET['status'] ?? '';
        $params = [];
        $where = '';
        if (in_array($status, ['pending', 'approved', 'rejected', 'disabled'], true)) {
            $where = 'WHERE account_status = ?';
            $params[] = $status;
        }
        $statement = $this->db->prepare(
            'SELECT u.id, u.email, u.role, u.account_status, u.first_name, u.last_name, u.contact_number, u.created_at,
                    p.organization_name, p.organization_type, vp.volunteer_type, vp.student_number, vp.campus
             FROM users u
             LEFT JOIN partners p ON p.user_id = u.id
             LEFT JOIN volunteer_profiles vp ON vp.user_id = u.id ' .
            ($where ? str_replace('account_status', 'u.account_status', $where) : '') .
            ' ORDER BY u.created_at DESC LIMIT 250'
        );
        $statement->execute($params);
        Http::json(['accounts' => $statement->fetchAll()]);
    }

    private function reviewAccount(int $id): never
    {
        Http::requireRole('admin');
        $data = Http::body();
        $status = $data['status'] ?? '';
        $current = $this->db->prepare('SELECT account_status FROM users WHERE id = ? AND role <> ?');
        $current->execute([$id, 'admin']);
        $previousStatus = $current->fetchColumn();
        if ($previousStatus === false) {
            throw new RuntimeException('Account was not found or cannot be reviewed.', 404);
        }
        $transitions = [
            'pending' => ['approved', 'rejected'],
            'approved' => ['disabled'],
            'disabled' => ['approved'],
            'rejected' => [],
        ];
        if (!in_array($status, $transitions[$previousStatus] ?? [], true)) {
            throw new RuntimeException('That account status change is not allowed.');
        }
        $statement = $this->db->prepare('UPDATE users SET account_status = ? WHERE id = ? AND role <> ? AND account_status = ?');
        $statement->execute([$status, $id, 'admin', $previousStatus]);
        if ($statement->rowCount() !== 1) {
            throw new RuntimeException('Account was not found or cannot be reviewed.', 404);
        }
        if ($status !== 'disabled') {
            $this->notifyUser($id, 'Account ' . $status, 'Your UCC-CES account has been ' . $status . '.');
        }
        Http::json(['message' => 'Account ' . $status . '.']);
    }

    private function downloadVolunteerProof(int $userId): never
    {
        Http::requireRole('admin');
        $statement = $this->db->prepare('SELECT affiliation_proof_path FROM volunteer_profiles WHERE user_id = ?');
        $statement->execute([$userId]);
        $relativePath = $statement->fetchColumn();
        if (!$relativePath) {
            throw new RuntimeException('Volunteer proof was not found.', 404);
        }
        $root = realpath($this->config['uploads_path']);
        $relativePath = preg_replace('#^uploads/#', '', $relativePath);
        $file = $root === false ? false : realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
        if ($root === false || $file === false || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)) {
            throw new RuntimeException('Stored proof could not be found.', 404);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file);
        if (!in_array($mime, $this->config['allowed_upload_mimes'], true)) {
            throw new RuntimeException('Stored proof has an unsupported file type.', 415);
        }
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($file));
        header('Content-Disposition: inline; filename="volunteer-proof-' . $userId . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($file);
        exit;
    }

    private function listProposals(): never
    {
        $user = Http::user();
        if ($user['role'] === 'admin') {
            $statement = $this->db->query(
                'SELECT p.*, u.first_name, u.last_name, NULL AS user_relationship, NULL AS user_invitation_status
                 FROM proposals p JOIN users u ON u.id = p.owner_user_id ORDER BY p.updated_at DESC LIMIT 250'
            );
        } else {
            $statement = $this->db->prepare(
                'SELECT DISTINCT p.*, u.first_name, u.last_name,
                        (SELECT pp.relationship FROM proposal_partners pp WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? LIMIT 1) AS user_relationship,
                        (SELECT pp.invitation_status FROM proposal_partners pp WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? LIMIT 1) AS user_invitation_status
                 FROM proposals p
                 JOIN users u ON u.id = p.owner_user_id
                 LEFT JOIN proposal_partners pp ON pp.proposal_id = p.id
                 WHERE p.owner_user_id = ? OR pp.partner_user_id = ? ORDER BY p.updated_at DESC LIMIT 250'
            );
            $statement->execute([(int) $user['id'], (int) $user['id'], (int) $user['id'], (int) $user['id']]);
        }
        Http::json(['proposals' => $statement->fetchAll()]);
    }

    private function createProposal(): never
    {
        $user = Http::requireRole('partner');
        $data = Http::body();
        $title = trim((string) ($data['title'] ?? ''));
        $summary = trim((string) ($data['summary'] ?? ''));
        if ($title === '' || $summary === '') {
            throw new RuntimeException('Proposal title and summary are required.');
        }
        $start = $this->optionalDate($data['periodStart'] ?? null);
        $end = $this->optionalDate($data['periodEnd'] ?? null);
        if ($start !== null && $end !== null && $end < $start) {
            throw new RuntimeException('Project end date cannot precede its start date.');
        }
        $this->db->beginTransaction();
        try {
            $statement = $this->db->prepare(
                'INSERT INTO proposals (owner_user_id, title, summary, period_start, period_end, stated_duration) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([$user['id'], $title, $summary, $start, $end, trim((string) ($data['duration'] ?? '')) ?: null]);
            $proposalId = (int) $this->db->lastInsertId();
            $partner = $this->db->prepare("INSERT INTO proposal_partners (proposal_id, partner_user_id, relationship, invitation_status) VALUES (?, ?, 'primary', 'accepted')");
            $partner->execute([$proposalId, $user['id']]);
            $this->syncProposalClassifications($proposalId, $data['classifications'] ?? []);
            $this->syncProposalCategories($proposalId, $data['categoryIds'] ?? []);
            $this->db->commit();
        } catch (Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }
        Http::json(['id' => $proposalId, 'status' => 'draft'], 201);
    }

    private function proposalEditData(int $proposalId): never
    {
        $user = Http::requireRole('partner');
        $this->assertProposalAccess($proposalId, $user, true);
        $proposal = $this->proposal($proposalId);
        if ($proposal['status'] !== 'draft') {
            throw new RuntimeException('Only draft proposals can be edited.', 409);
        }
        Http::json([
            'proposal' => [
                'id' => (int) $proposal['id'],
                'title' => $proposal['title'],
                'summary' => $proposal['summary'],
                'periodStart' => $proposal['period_start'],
                'periodEnd' => $proposal['period_end'],
                'duration' => $proposal['stated_duration'],
            ],
        ]);
    }

    private function updateProposal(int $proposalId): never
    {
        $user = Http::requireRole('partner');
        $this->assertProposalAccess($proposalId, $user, true);
        $proposal = $this->proposal($proposalId);
        if ($proposal['status'] !== 'draft') {
            throw new RuntimeException('Only draft proposals can be edited.', 409);
        }

        $data = Http::body();
        $title = trim((string) ($data['title'] ?? ''));
        $summary = trim((string) ($data['summary'] ?? ''));
        if ($title === '' || $summary === '') {
            throw new RuntimeException('Proposal title and summary are required.');
        }
        $start = $this->optionalDate($data['periodStart'] ?? null);
        $end = $this->optionalDate($data['periodEnd'] ?? null);
        if ($start !== null && $end !== null && $end < $start) {
            throw new RuntimeException('Project end date cannot precede its start date.');
        }

        $statement = $this->db->prepare(
            'UPDATE proposals
             SET title = ?, summary = ?, period_start = ?, period_end = ?, stated_duration = ?
             WHERE id = ? AND owner_user_id = ? AND status = ?'
        );
        $statement->execute([
            $title,
            $summary,
            $start,
            $end,
            trim((string) ($data['duration'] ?? '')) ?: null,
            $proposalId,
            (int) $user['id'],
            'draft',
        ]);
        if ($statement->rowCount() === 0) {
            $current = $this->proposal($proposalId);
            if ($current['status'] !== 'draft' || (int) $current['owner_user_id'] !== (int) $user['id']) {
                throw new RuntimeException('Only your draft proposals can be edited.', 409);
            }
        }
        Http::json(['id' => $proposalId, 'status' => 'draft', 'message' => 'Draft proposal updated.']);
    }

    private function uploadProposalDocument(int $proposalId): never
    {
        $user = Http::user();
        $this->assertProposalAccess($proposalId, $user, true);
        $data = $this->requestData();
        $type = (string) ($data['documentType'] ?? '');
        $allowed = ['signed_proposal_letter', 'project_brief', 'moa', 'mou', 'narrative_report', 'other'];
        if (!in_array($type, $allowed, true)) {
            throw new RuntimeException('Choose a valid document type.');
        }
        $path = $this->storeUpload('file', 'documents', true);
        $file = $_FILES['file'];
        $mimeByExtension = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'png' => 'image/png'];
        $mime = $mimeByExtension[strtolower(pathinfo($path, PATHINFO_EXTENSION))] ?? '';
        if ($mime === '') {
            throw new RuntimeException('Uploaded file type could not be determined.', 500);
        }
        $signed = filter_var($data['isSigned'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $originalName = preg_replace('/[\x00-\x1F\x7F]/', '_', basename((string) $file['name']));
        $originalName = mb_substr($originalName ?? 'document', 0, 255, 'UTF-8');
        $statement = $this->db->prepare(
            'INSERT INTO documents (proposal_id, uploaded_by, document_type, relative_path, original_name, mime_type, file_size, is_signed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $proposalId, $user['id'], $type, $path,
            $originalName, $mime, (int) $file['size'], $signed ? 1 : 0,
        ]);
        Http::json(['id' => (int) $this->db->lastInsertId(), 'message' => 'Document uploaded.'], 201);
    }

    private function downloadDocument(int $documentId): never
    {
        $user = Http::user();
        $statement = $this->db->prepare(
            'SELECT d.proposal_id, d.relative_path, d.original_name, d.mime_type
             FROM documents d JOIN proposals p ON p.id = d.proposal_id WHERE d.id = ?'
        );
        $statement->execute([$documentId]);
        $document = $statement->fetch();
        if (!$document) {
            throw new RuntimeException('Document was not found.', 404);
        }
        if ($user['role'] !== 'admin') {
            $this->assertProposalAccess((int) $document['proposal_id'], $user, false);
        }
        $root = realpath($this->config['uploads_path']);
        $relativePath = preg_replace('#^uploads/#', '', $document['relative_path']);
        $file = $root === false ? false : realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
        if ($root === false || $file === false || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)) {
            throw new RuntimeException('Stored document could not be found.', 404);
        }
        header('Content-Type: ' . $document['mime_type']);
        header('Content-Length: ' . (string) filesize($file));
        $downloadName = preg_replace('/[\x00-\x1F\x7F"\\\\]/', '_', basename($document['original_name']));
        header('Content-Disposition: attachment; filename="' . ($downloadName ?: 'document') . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($file);
        exit;
    }

    private function submitProposal(int $proposalId): never
    {
        $user = Http::user();
        $this->assertProposalAccess($proposalId, $user, true);
        $statement = $this->db->prepare(
            "SELECT
                SUM(document_type = 'signed_proposal_letter' AND is_signed = 1) AS has_letter,
                SUM(document_type = 'project_brief') AS has_brief,
                SUM(document_type IN ('moa', 'mou') AND is_signed = 1) AS has_agreement
             FROM documents WHERE proposal_id = ?"
        );
        $statement->execute([$proposalId]);
        $documents = $statement->fetch();
        if ((int) $documents['has_letter'] < 1 || (int) $documents['has_brief'] < 1 || (int) $documents['has_agreement'] < 1) {
            throw new RuntimeException('Submission requires a signed proposal letter, project brief, and at least one signed MOA or MOU.');
        }
        $update = $this->db->prepare("UPDATE proposals SET status = 'submitted', submitted_at = NOW() WHERE id = ? AND status IN ('draft', 'revision')");
        $update->execute([$proposalId]);
        if ($update->rowCount() !== 1) {
            throw new RuntimeException('Only draft or revision proposals can be submitted.');
        }
        $this->notifyAdmins('Proposal submitted', 'A proposal is ready for CES Admin review.');
        Http::json(['status' => 'submitted']);
    }

    private function reviewProposal(int $proposalId): never
    {
        $admin = Http::requireRole('admin');
        $data = Http::body();
        $status = $data['status'] ?? '';
        $allowed = ['under_review', 'revision', 'approved', 'rejected', 'active'];
        if (!in_array($status, $allowed, true)) {
            throw new RuntimeException('Choose a valid proposal review status.');
        }
        $current = $this->proposal($proposalId);
        $transitions = [
            'submitted' => ['under_review', 'revision', 'rejected'],
            'under_review' => ['revision', 'approved', 'rejected'],
            'revision' => [],
            'approved' => ['active'],
            'active' => [],
            'rejected' => [],
            'draft' => [],
        ];
        if (!in_array($status, $transitions[$current['status']] ?? [], true)) {
            throw new RuntimeException('That proposal status transition is not allowed.');
        }
        if ($status === 'active') {
            $signedAgreement = $this->db->prepare("SELECT COUNT(*) FROM documents WHERE proposal_id = ? AND document_type IN ('moa', 'mou') AND is_signed = 1");
            $signedAgreement->execute([$proposalId]);
            if ((int) $signedAgreement->fetchColumn() < 1) {
                throw new RuntimeException('An approved proposal needs an attached signed MOA or MOU before activation.');
            }
        }
        $notes = trim((string) ($data['notes'] ?? ''));
        $update = $this->db->prepare('UPDATE proposals SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?');
        $update->execute([$status, $notes ?: null, $admin['id'], $proposalId]);
        $this->notifyUser((int) $current['owner_user_id'], 'Proposal ' . str_replace('_', ' ', $status), $notes ?: 'Your proposal status is now ' . str_replace('_', ' ', $status) . '.');
        Http::json(['status' => $status]);
    }

    private function listBudgetItems(int $proposalId): never
    {
        $user = Http::user();
        $this->assertProposalAccess($proposalId, $user, false);
        $statement = $this->db->prepare(
            'SELECT bi.id, bi.activity_id, bi.description, bi.quantity, bi.unit_cost,
                    (bi.quantity * bi.unit_cost) AS line_total
             FROM budget_items bi WHERE bi.proposal_id = ? ORDER BY bi.id'
        );
        $statement->execute([$proposalId]);
        $items = $statement->fetchAll();
        $total = array_reduce($items, static fn (float $sum, array $item): float => $sum + (float) $item['line_total'], 0.0);
        Http::json(['items' => $items, 'total' => $total]);
    }

    private function createBudgetItem(int $proposalId): never
    {
        $user = Http::user();
        $this->assertProposalAccess($proposalId, $user, true);
        $proposal = $this->proposal($proposalId);
        if (!in_array($proposal['status'], ['draft', 'revision'], true)) {
            throw new RuntimeException('Budget items can only be changed while a proposal is a draft or in revision.');
        }
        $data = Http::body();
        $description = trim((string) ($data['description'] ?? ''));
        $quantity = filter_var($data['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
        $unitCost = filter_var($data['unitCost'] ?? null, FILTER_VALIDATE_FLOAT);
        $maximumAmount = 9999999999.99;
        if ($description === '' || strlen($description) > 255 ||
            $quantity === false || $quantity <= 0 || $quantity > $maximumAmount ||
            $unitCost === false || $unitCost < 0 || $unitCost > $maximumAmount) {
            throw new RuntimeException('Budget line needs a description, positive quantity, and non-negative unit cost.');
        }
        $activityId = null;
        if (isset($data['activityId']) && $data['activityId'] !== '') {
            $activityId = Http::positiveId((string) $data['activityId']);
            $activity = $this->db->prepare(
                'SELECT a.id FROM activities a JOIN event_dates ed ON ed.id = a.event_date_id
                 JOIN events e ON e.id = ed.event_id WHERE a.id = ? AND e.proposal_id = ?'
            );
            $activity->execute([$activityId, $proposalId]);
            if (!$activity->fetchColumn()) {
                throw new RuntimeException('Activity must belong to this proposal.');
            }
        }
        $insert = $this->db->prepare('INSERT INTO budget_items (proposal_id, activity_id, description, quantity, unit_cost) VALUES (?, ?, ?, ?, ?)');
        $insert->execute([$proposalId, $activityId, $description, $quantity, $unitCost]);
        Http::json(['id' => (int) $this->db->lastInsertId()], 201);
    }

    private function listEvaluations(int $proposalId): never
    {
        $user = Http::user();
        $this->assertCanEvaluate($proposalId, $user);
        $statement = $this->db->prepare(
            'SELECT e.id, e.rating, e.feedback, e.created_at, u.first_name, u.last_name
             FROM evaluations e JOIN users u ON u.id = e.submitted_by
             WHERE e.proposal_id = ? ORDER BY e.created_at DESC'
        );
        $statement->execute([$proposalId]);
        Http::json(['evaluations' => $statement->fetchAll()]);
    }

    private function createEvaluation(int $proposalId): never
    {
        $user = Http::user();
        $this->assertCanEvaluate($proposalId, $user);
        $data = Http::body();
        $rating = filter_var($data['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
        $feedback = trim((string) ($data['feedback'] ?? ''));
        if ($rating === false || strlen($feedback) > 5000) {
            throw new RuntimeException('Evaluation needs a rating from 1 to 5 and feedback no longer than 5,000 characters.');
        }
        $statement = $this->db->prepare('INSERT INTO evaluations (proposal_id, submitted_by, rating, feedback) VALUES (?, ?, ?, ?)');
        $statement->execute([$proposalId, $user['id'], $rating, $feedback ?: null]);
        Http::json(['id' => (int) $this->db->lastInsertId()], 201);
    }

    private function assertCanEvaluate(int $proposalId, array $user): void
    {
        if ($user['role'] === 'admin' || $user['role'] === 'partner') {
            $this->assertProposalAccess($proposalId, $user, false);
            return;
        }
        if ($user['role'] !== 'volunteer') {
            throw new RuntimeException('You are not allowed to access this evaluation.', 403);
        }
        $this->requireApprovedVolunteer((int) $user['id']);
        $statement = $this->db->prepare(
            "SELECT COUNT(*) FROM event_applications ea JOIN events e ON e.id = ea.event_id
             WHERE e.proposal_id = ? AND ea.volunteer_user_id = ? AND ea.status = 'approved'"
        );
        $statement->execute([$proposalId, $user['id']]);
        if ((int) $statement->fetchColumn() < 1) {
            throw new RuntimeException('An approved event application is required to evaluate this project.', 403);
        }
    }

    private function inviteCollaborator(int $proposalId): never
    {
        Http::requireRole('admin');
        $data = Http::body();
        $partnerId = Http::positiveId((string) ($data['partnerId'] ?? ''));
        $proposal = $this->proposal($proposalId);
        if ((int) $proposal['owner_user_id'] === $partnerId) {
            throw new RuntimeException('The primary proposing organization is already part of this project.');
        }
        $check = $this->db->prepare("SELECT id FROM users WHERE id = ? AND role = 'partner' AND account_status = 'approved'");
        $check->execute([$partnerId]);
        if (!$check->fetchColumn()) {
            throw new RuntimeException('An approved partner account is required.');
        }
        $existing = $this->db->prepare('SELECT relationship, invitation_status FROM proposal_partners WHERE proposal_id = ? AND partner_user_id = ?');
        $existing->execute([$proposalId, $partnerId]);
        $relationship = $existing->fetch();
        if ($relationship && $relationship['invitation_status'] !== 'declined') {
            throw new RuntimeException('This organization already has an active or pending project invitation.', 409);
        }
        $statement = $this->db->prepare(
            "INSERT INTO proposal_partners (proposal_id, partner_user_id, relationship, invitation_status) VALUES (?, ?, 'collaborator', 'pending')
             ON DUPLICATE KEY UPDATE relationship = 'collaborator', invitation_status = 'pending'"
        );
        $statement->execute([$proposalId, $partnerId]);
        $this->notifyUser($partnerId, 'Project collaboration invitation', 'You have been invited to collaborate on ' . $proposal['title'] . '.');
        Http::json(['message' => 'Invitation sent.'], 201);
    }

    private function respondToCollaboration(int $proposalId): never
    {
        $user = Http::requireRole('partner');
        $data = Http::body();
        $response = $data['response'] ?? '';
        if (!in_array($response, ['accepted', 'declined'], true)) {
            throw new RuntimeException('Response must be accepted or declined.');
        }
        $statement = $this->db->prepare(
            'UPDATE proposal_partners SET invitation_status = ? WHERE proposal_id = ? AND partner_user_id = ? AND relationship = ? AND invitation_status = ?'
        );
        $statement->execute([$response, $proposalId, $user['id'], 'collaborator', 'pending']);
        if ($statement->rowCount() !== 1) {
            throw new RuntimeException('A pending invitation was not found.', 404);
        }
        $proposal = $this->proposal($proposalId);
        $this->notifyUser((int) $proposal['owner_user_id'], 'Collaboration ' . $response, 'A partner has ' . $response . ' the invitation for ' . $proposal['title'] . '.');
        $this->notifyAdmins('Collaboration ' . $response, 'A partner has ' . $response . ' a collaboration invitation.');
        Http::json(['message' => 'Invitation ' . $response . '.']);
    }

    private function createEvent(): never
    {
        $user = Http::requireRole('partner');
        $data = Http::body();
        $proposalId = Http::positiveId((string) ($data['proposalId'] ?? ''));
        $proposal = $this->proposal($proposalId);
        if (!in_array($proposal['status'], ['approved', 'active'], true)) {
            throw new RuntimeException('Events can only be configured for approved or active proposals.');
        }
        $this->assertProposalAccess($proposalId, $user, false);
        $title = trim((string) ($data['title'] ?? ''));
        $capacity = filter_var($data['capacity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100000]]);
        $dates = $data['dates'] ?? [];
        if ($title === '' || $capacity === false || !is_array($dates) || count($dates) < 1) {
            throw new RuntimeException('Event title, positive capacity, and at least one event date are required.');
        }
        $openAt = $this->optionalDateTime($data['applicationsOpenAt'] ?? null);
        $closeAt = $this->optionalDateTime($data['applicationsCloseAt'] ?? null);
        if ($openAt !== null && $closeAt !== null && $closeAt < $openAt) {
            throw new RuntimeException('The application closing time cannot precede its opening time.');
        }
        $eventDateValues = [];
        foreach ($dates as $dateData) {
            if (!is_array($dateData)) {
                throw new RuntimeException('Each event date must contain a date and activity list.');
            }
            $eventDateValues[] = $this->requiredDate($dateData['date'] ?? null);
        }
        if (count(array_unique($eventDateValues)) !== count($eventDateValues)) {
            throw new RuntimeException('Each event date can only be added once.');
        }
        $secret = (string) ($this->config['app_key'] ?? '');
        if (strlen($secret) < 32) {
            throw new RuntimeException('Set CES_APP_KEY to at least 32 characters before creating events.', 503);
        }
        $this->db->beginTransaction();
        try {
            $event = $this->db->prepare('INSERT INTO events (proposal_id, organizer_user_id, title, description, capacity, applications_open_at, applications_close_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $event->execute([
                $proposalId, $user['id'], $title, trim((string) ($data['description'] ?? '')) ?: null,
                $capacity, $openAt, $closeAt,
            ]);
            $eventId = (int) $this->db->lastInsertId();
            $dateInsert = $this->db->prepare('INSERT INTO event_dates (event_id, event_date, qr_token_hash) VALUES (?, ?, ?)');
            $activityInsert = $this->db->prepare('INSERT INTO activities (event_date_id, title, start_time, end_time, venue, target_participants, activity_lead) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($dates as $dateData) {
                if (!is_array($dateData)) {
                    throw new RuntimeException('Each event date must contain a date and activity list.');
                }
                $date = $this->requiredDate($dateData['date'] ?? null);
                $dateInsert->execute([$eventId, $date, bin2hex(random_bytes(32))]);
                $eventDateId = (int) $this->db->lastInsertId();
                $token = hash_hmac('sha256', $eventId . ':' . $eventDateId . ':' . $date, $secret);
                $tokenUpdate = $this->db->prepare('UPDATE event_dates SET qr_token_hash = ? WHERE id = ?');
                $tokenUpdate->execute([hash('sha256', $token), $eventDateId]);
                $activities = $dateData['activities'] ?? [];
                if (!is_array($activities) || count($activities) < 1) {
                    throw new RuntimeException('Each event date needs at least one activity.');
                }
                foreach ($activities as $activity) {
                    $this->insertActivity($activityInsert, $eventDateId, $activity);
                }
            }
            $this->db->commit();
        } catch (Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }
        Http::json(['id' => $eventId, 'message' => 'Event created. QR credentials can be viewed by the organizer.'], 201);
    }

    private function listEvents(): never
    {
        $user = Http::user();
        $sql =
            "SELECT e.id, e.proposal_id, e.organizer_user_id, e.title, e.description, e.capacity,
                    e.applications_open_at, e.applications_close_at, p.status AS proposal_status, p.title AS project_title,
                    (SELECT MIN(ed.event_date) FROM event_dates ed WHERE ed.event_id = e.id) AS next_event_date,
                    (SELECT COUNT(*) FROM event_applications ea WHERE ea.event_id = e.id AND ea.status = 'approved') AS approved_applications";
        $params = [];
        if ($user['role'] === 'volunteer') {
            $sql .= ",
                    (SELECT ea.status FROM event_applications ea WHERE ea.event_id = e.id AND ea.volunteer_user_id = ? LIMIT 1) AS application_status,
                    (SELECT COUNT(*) FROM event_applications ea JOIN attendance a ON a.application_id = ea.id
                     WHERE ea.event_id = e.id AND ea.volunteer_user_id = ? AND a.status = 'present') AS attendance_count";
            $params[] = (int) $user['id'];
            $params[] = (int) $user['id'];
        }
        $sql .= ' FROM events e JOIN proposals p ON p.id = e.proposal_id';
        if ($user['role'] === 'volunteer') {
            $sql .= " WHERE p.status = 'active'";
        } elseif ($user['role'] === 'partner') {
            $sql .= ' WHERE e.organizer_user_id = ?';
            $params[] = (int) $user['id'];
        }
        $sql .= ' ORDER BY next_event_date, e.created_at DESC LIMIT 250';
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        Http::json(['events' => $statement->fetchAll()]);
    }

    private function eventDates(int $eventId): never
    {
        $user = Http::user();
        $statement = $this->db->prepare(
            'SELECT e.organizer_user_id, ed.id, ed.event_date
             FROM events e JOIN event_dates ed ON ed.event_id = e.id WHERE e.id = ? ORDER BY ed.event_date'
        );
        $statement->execute([$eventId]);
        $dates = $statement->fetchAll();
        if (!$dates) {
            throw new RuntimeException('Event dates were not found.', 404);
        }
        if ($user['role'] !== 'admin' && $user['role'] !== 'volunteer' && (int) $dates[0]['organizer_user_id'] !== (int) $user['id']) {
            throw new RuntimeException('Only the event organizer or CES Admin can view these dates.', 403);
        }
        foreach ($dates as &$date) {
            $date['id'] = (int) $date['id'];
            unset($date['organizer_user_id']);
        }
        Http::json(['dates' => $dates]);
    }

    private function applyToEvent(int $eventId): never
    {
        $user = Http::requireRole('volunteer');
        $this->requireApprovedVolunteer((int) $user['id']);
        $eventStatement = $this->db->prepare(
            "SELECT e.id, e.capacity, e.applications_open_at, e.applications_close_at
             FROM events e JOIN proposals p ON p.id = e.proposal_id
             WHERE e.id = ? AND p.status = 'active'"
        );
        $eventStatement->execute([$eventId]);
        $event = $eventStatement->fetch();
        if (!$event) {
            throw new RuntimeException('Active event was not found.', 404);
        }
        $now = date('Y-m-d H:i:s');
        if (($event['applications_open_at'] && $now < $event['applications_open_at']) ||
            ($event['applications_close_at'] && $now > $event['applications_close_at'])) {
            throw new RuntimeException('Applications are not currently open for this event.');
        }
        $count = $this->db->prepare("SELECT COUNT(*) FROM event_applications WHERE event_id = ? AND status = 'approved'");
        $count->execute([$eventId]);
        if ((int) $count->fetchColumn() >= (int) $event['capacity']) {
            throw new RuntimeException('This event has reached its approved volunteer capacity.');
        }
        $insert = $this->db->prepare('INSERT INTO event_applications (event_id, volunteer_user_id) VALUES (?, ?)');
        try {
            $insert->execute([$eventId, $user['id']]);
        } catch (\PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new RuntimeException('You have already applied to this event.', 409, $exception);
            }
            throw $exception;
        }
        $applicationId = (int) $this->db->lastInsertId();
        $this->notifyEventOrganizers($eventId, 'New volunteer application', 'A volunteer has applied to your event.');
        Http::json(['id' => $applicationId, 'status' => 'pending'], 201);
    }

    private function listApplications(int $eventId): never
    {
        $user = Http::user();
        $this->assertEventOrganizer($eventId, $user);
        $statement = $this->db->prepare(
            "SELECT ea.id, ea.volunteer_user_id, ea.status, ea.applied_at, u.first_name, u.last_name, u.email,
                    (SELECT COUNT(*) FROM attendance a WHERE a.application_id = ea.id AND a.status = 'present') AS attendance_count
             FROM event_applications ea JOIN users u ON u.id = ea.volunteer_user_id
             WHERE ea.event_id = ? ORDER BY ea.applied_at DESC"
        );
        $statement->execute([$eventId]);
        Http::json(['applications' => $statement->fetchAll()]);
    }

    private function listDateAttendance(int $eventDateId): never
    {
        $user = Http::user();
        $eventId = $this->eventIdForDate($eventDateId);
        $this->assertEventOrganizer($eventId, $user);
        $statement = $this->db->prepare(
            "SELECT ea.id AS application_id, u.first_name, u.last_name, u.email,
                    a.status AS attendance_status, a.note AS attendance_note, a.scanned_at
             FROM event_applications ea
             JOIN users u ON u.id = ea.volunteer_user_id
             LEFT JOIN attendance a ON a.application_id = ea.id AND a.event_date_id = ?
             WHERE ea.event_id = ? AND ea.status = 'approved'
             ORDER BY u.last_name, u.first_name"
        );
        $statement->execute([$eventDateId, $eventId]);
        Http::json(['attendance' => $statement->fetchAll()]);
    }

    private function reviewApplication(int $applicationId): never
    {
        $user = Http::user();
        $data = Http::body();
        $status = $data['status'] ?? '';
        if (!in_array($status, ['approved', 'rejected'], true)) {
            throw new RuntimeException('Application decision must be approved or rejected.');
        }
        $statement = $this->db->prepare(
            'SELECT ea.*, e.capacity, e.organizer_user_id FROM event_applications ea JOIN events e ON e.id = ea.event_id WHERE ea.id = ?'
        );
        $statement->execute([$applicationId]);
        $application = $statement->fetch();
        if (!$application) {
            throw new RuntimeException('Application was not found.', 404);
        }
        $this->assertEventOrganizer((int) $application['event_id'], $user);
        $this->db->beginTransaction();
        try {
            $lock = $this->db->prepare('SELECT capacity FROM events WHERE id = ? FOR UPDATE');
            $lock->execute([(int) $application['event_id']]);
            $capacity = $lock->fetchColumn();
            if ($capacity === false) {
                throw new RuntimeException('Event was not found.', 404);
            }
            if ($status === 'approved') {
                $count = $this->db->prepare("SELECT COUNT(*) FROM event_applications WHERE event_id = ? AND status = 'approved'");
                $count->execute([(int) $application['event_id']]);
                if ((int) $count->fetchColumn() >= (int) $capacity) {
                    throw new RuntimeException('The event has reached its approved volunteer capacity.');
                }
            }
            $update = $this->db->prepare('UPDATE event_applications SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = ?');
            $update->execute([$status, $user['id'], $applicationId, 'pending']);
            if ($update->rowCount() !== 1) {
                throw new RuntimeException('Only pending applications can be reviewed.');
            }
            $this->db->commit();
        } catch (Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $exception;
        }
        $this->notifyUser((int) $application['volunteer_user_id'], 'Event application ' . $status, 'Your volunteer application was ' . $status . '.');
        Http::json(['status' => $status]);
    }

    private function listCertificates(int $eventId): never
    {
        $user = Http::user();
        if ($user['role'] === 'volunteer') {
            $statement = $this->db->prepare(
                'SELECT c.id, c.issued_at, u.first_name, u.last_name
                 FROM certificates c JOIN users u ON u.id = c.volunteer_user_id
                 WHERE c.event_id = ? AND c.volunteer_user_id = ? ORDER BY c.issued_at DESC'
            );
            $statement->execute([$eventId, $user['id']]);
        } else {
            $this->assertEventOrganizer($eventId, $user);
            $statement = $this->db->prepare(
                'SELECT c.id, c.issued_at, u.first_name, u.last_name
                 FROM certificates c JOIN users u ON u.id = c.volunteer_user_id
                 WHERE c.event_id = ? ORDER BY u.last_name, u.first_name'
            );
            $statement->execute([$eventId]);
        }
        Http::json(['certificates' => $statement->fetchAll()]);
    }

    private function issueCertificate(int $eventId): never
    {
        $user = Http::user();
        $this->assertEventOrganizer($eventId, $user);
        $data = $this->requestData();
        $volunteerId = Http::positiveId((string) ($data['volunteerId'] ?? ''));
        $eligible = $this->db->prepare(
            "SELECT COUNT(*) FROM event_applications ea
             JOIN attendance a ON a.application_id = ea.id AND a.status = 'present'
             WHERE ea.event_id = ? AND ea.volunteer_user_id = ? AND ea.status = 'approved'"
        );
        $eligible->execute([$eventId, $volunteerId]);
        if ((int) $eligible->fetchColumn() < 1) {
            throw new RuntimeException('Certificates may only be issued to approved volunteers with recorded attendance.');
        }
        $existing = $this->db->prepare('SELECT id FROM certificates WHERE event_id = ? AND volunteer_user_id = ?');
        $existing->execute([$eventId, $volunteerId]);
        if ($existing->fetchColumn()) {
            throw new RuntimeException('A certificate has already been issued for this event and volunteer.', 409);
        }
        $path = $this->storeUpload('file', 'certificates', true);
        $insert = $this->db->prepare('INSERT INTO certificates (event_id, volunteer_user_id, relative_path) VALUES (?, ?, ?)');
        try {
            $insert->execute([$eventId, $volunteerId, $path]);
        } catch (\PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new RuntimeException('A certificate has already been issued for this event and volunteer.', 409, $exception);
            }
            throw $exception;
        }
        $certificateId = (int) $this->db->lastInsertId();
        $this->notifyUser($volunteerId, 'Event certificate issued', 'A certificate is available in your event records.');
        Http::json(['id' => $certificateId], 201);
    }

    private function downloadCertificate(int $certificateId): never
    {
        $user = Http::user();
        $statement = $this->db->prepare('SELECT * FROM certificates WHERE id = ?');
        $statement->execute([$certificateId]);
        $certificate = $statement->fetch();
        if (!$certificate) {
            throw new RuntimeException('Certificate was not found.', 404);
        }
        if ($user['role'] !== 'admin') {
            if ($user['role'] === 'volunteer') {
                if ((int) $certificate['volunteer_user_id'] !== (int) $user['id']) {
                    throw new RuntimeException('Certificate was not found.', 404);
                }
            } else {
                $this->assertEventOrganizer((int) $certificate['event_id'], $user);
            }
        }
        $root = realpath($this->config['uploads_path']);
        $relativePath = preg_replace('#^uploads/#', '', $certificate['relative_path']);
        $file = $root === false ? false : realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
        if ($root === false || $file === false || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)) {
            throw new RuntimeException('Stored certificate could not be found.', 404);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file);
        if (!in_array($mime, $this->config['allowed_upload_mimes'], true)) {
            throw new RuntimeException('Stored certificate has an unsupported file type.', 415);
        }
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($file));
        header('Content-Disposition: attachment; filename="certificate-' . $certificateId . '.' . pathinfo($file, PATHINFO_EXTENSION) . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($file);
        exit;
    }

    private function showEventQr(int $eventDateId): never
    {
        $user = Http::user();
        $statement = $this->db->prepare(
            'SELECT ed.id, ed.event_date, ed.event_id, ed.qr_token_hash, e.organizer_user_id
             FROM event_dates ed JOIN events e ON e.id = ed.event_id WHERE ed.id = ?'
        );
        $statement->execute([$eventDateId]);
        $date = $statement->fetch();
        if (!$date) {
            throw new RuntimeException('Event date was not found.', 404);
        }
        $this->assertEventOrganizer((int) $date['event_id'], $user);
        $secret = (string) ($this->config['app_key'] ?? '');
        if (strlen($secret) < 32) {
            throw new RuntimeException('Set CES_APP_KEY to at least 32 characters to enable event QR codes.', 503);
        }
        $token = hash_hmac('sha256', $date['event_id'] . ':' . $date['id'] . ':' . $date['event_date'], $secret);
        if (!hash_equals($date['qr_token_hash'], hash('sha256', $token))) {
            throw new RuntimeException('Event QR credentials are inconsistent. Contact an administrator.', 500);
        }
        $payload = json_encode(['eventDateId' => (int) $date['id'], 'token' => $token], JSON_THROW_ON_ERROR);
        Http::json([
            'eventDateId' => (int) $date['id'],
            'date' => $date['event_date'],
            'payload' => $payload,
            'qrImage' => (new \chillerlan\QRCode\QRCode())->render($payload),
        ]);
    }

    private function scanAttendance(): never
    {
        $user = Http::requireRole('volunteer');
        $this->requireApprovedVolunteer((int) $user['id']);
        $data = Http::body();
        $eventDateId = Http::positiveId((string) ($data['eventDateId'] ?? ''));
        $token = (string) ($data['token'] ?? '');
        $statement = $this->db->prepare(
            'SELECT ed.event_date, ed.qr_token_hash, ed.event_id
             FROM event_dates ed JOIN events e ON e.id = ed.event_id
             JOIN proposals p ON p.id = e.proposal_id
             WHERE ed.id = ? AND p.status = ?'
        );
        $statement->execute([$eventDateId, 'active']);
        $date = $statement->fetch();
        if (!$date || $date['event_date'] !== date('Y-m-d')) {
            throw new RuntimeException('This QR code is not valid for today.');
        }
        $secret = (string) ($this->config['app_key'] ?? '');
        if (strlen($secret) < 32) {
            throw new RuntimeException('Attendance QR scanning is not configured.', 503);
        }
        $expectedToken = hash_hmac('sha256', $date['event_id'] . ':' . $eventDateId . ':' . $date['event_date'], $secret);
        if (!hash_equals($expectedToken, $token) || !hash_equals($date['qr_token_hash'], hash('sha256', $token))) {
            throw new RuntimeException('The QR code is invalid.');
        }
        $application = $this->db->prepare(
            "SELECT id FROM event_applications WHERE event_id = ? AND volunteer_user_id = ? AND status = 'approved'"
        );
        $application->execute([(int) $date['event_id'], (int) $user['id']]);
        $applicationId = $application->fetchColumn();
        if (!$applicationId) {
            throw new RuntimeException('An approved application is required to record attendance.', 403);
        }
        $insert = $this->db->prepare("INSERT INTO attendance (application_id, event_date_id, status, scanned_at) VALUES (?, ?, 'present', NOW())");
        try {
            $insert->execute([(int) $applicationId, $eventDateId]);
        } catch (\PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new RuntimeException('Attendance has already been recorded for this event date.');
            }
            throw $exception;
        }
        Http::json(['message' => 'Attendance recorded.']);
    }

    private function overrideAttendance(): never
    {
        $user = Http::user();
        $data = Http::body();
        $applicationId = Http::positiveId((string) ($data['applicationId'] ?? ''));
        $eventDateId = Http::positiveId((string) ($data['eventDateId'] ?? ''));
        $status = $data['status'] ?? '';
        if (!in_array($status, ['present', 'absent', 'excused'], true)) {
            throw new RuntimeException('Attendance status must be present, absent, or excused.');
        }
        $statement = $this->db->prepare(
            'SELECT ea.event_id FROM event_applications ea JOIN event_dates ed ON ed.event_id = ea.event_id WHERE ea.id = ? AND ed.id = ?'
        );
        $statement->execute([$applicationId, $eventDateId]);
        $eventId = $statement->fetchColumn();
        if (!$eventId) {
            throw new RuntimeException('Application does not belong to this event date.', 404);
        }
        $this->assertEventOrganizer((int) $eventId, $user);
        $upsert = $this->db->prepare(
            'INSERT INTO attendance (application_id, event_date_id, status, marked_by, note) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), note = VALUES(note)'
        );
        $upsert->execute([$applicationId, $eventDateId, $status, $user['id'], trim((string) ($data['note'] ?? '')) ?: null]);
        Http::json(['status' => $status]);
    }

    private function listParticipantCounts(int $eventDateId): never
    {
        $user = Http::user();
        $eventId = $this->eventIdForDate($eventDateId);
        $this->assertEventOrganizer($eventId, $user);
        $statement = $this->db->prepare(
            'SELECT id, participant_group, participant_count, created_at
             FROM participant_counts WHERE event_date_id = ? ORDER BY participant_group, created_at'
        );
        $statement->execute([$eventDateId]);
        Http::json(['participants' => $statement->fetchAll()]);
    }

    private function createParticipantCount(int $eventDateId): never
    {
        $user = Http::user();
        $eventId = $this->eventIdForDate($eventDateId);
        $this->assertEventOrganizer($eventId, $user);
        $data = Http::body();
        $group = trim((string) ($data['group'] ?? ''));
        $count = filter_var($data['count'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 1000000]]);
        if ($group === '' || strlen($group) > 120 || $count === false) {
            throw new RuntimeException('Participant group and a count from 0 to 1,000,000 are required.');
        }
        $statement = $this->db->prepare('INSERT INTO participant_counts (event_date_id, participant_group, participant_count, recorded_by) VALUES (?, ?, ?, ?)');
        $statement->execute([$eventDateId, $group, $count, $user['id']]);
        Http::json(['id' => (int) $this->db->lastInsertId()], 201);
    }

    private function eventIdForDate(int $eventDateId): int
    {
        $statement = $this->db->prepare('SELECT event_id FROM event_dates WHERE id = ?');
        $statement->execute([$eventDateId]);
        $eventId = $statement->fetchColumn();
        if ($eventId === false) {
            throw new RuntimeException('Event date was not found.', 404);
        }
        return (int) $eventId;
    }

    private function report(): never
    {
        $user = Http::user();
        if (!in_array($user['role'], ['admin', 'partner'], true)) {
            throw new RuntimeException('Project reports are available to CES Admins and partner accounts.', 403);
        }
        $from = $this->requiredDate($_GET['from'] ?? null);
        $to = $this->requiredDate($_GET['to'] ?? null);
        if ($to < $from || (strtotime($to) - strtotime($from)) / 86400 > 366) {
            throw new RuntimeException('Choose a valid date range of no more than 367 days.');
        }
        $module = (string) ($_GET['module'] ?? 'projects');
        if ($module !== 'projects') {
            $this->moduleReport($user, $module, $from, $to);
        }
        $where = ['p.created_at >= ?', 'p.created_at < DATE_ADD(?, INTERVAL 1 DAY)'];
        $params = [$from, $to];
        if ($user['role'] !== 'admin') {
            $where[] = '(p.owner_user_id = ? OR EXISTS (SELECT 1 FROM proposal_partners pp WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? AND pp.invitation_status = ?))';
            array_push($params, $user['id'], $user['id'], 'accepted');
        }
        if (!empty($_GET['status'])) {
            $status = trim((string) $_GET['status']);
            if (!in_array($status, ['draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected'], true)) {
                throw new RuntimeException('Invalid project status filter.');
            }
            $where[] = 'p.status = ?';
            $params[] = $status;
        }
        if (!empty($_GET['search'])) {
            $where[] = '(p.title LIKE ? OR p.summary LIKE ?)';
            $search = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $_GET['search'])) . '%';
            array_push($params, $search, $search);
        }
        if (!empty($_GET['category'])) {
            $where[] = 'EXISTS (SELECT 1 FROM proposal_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.proposal_id = p.id AND c.name = ?)';
            $params[] = trim((string) $_GET['category']);
        }
        if (!empty($_GET['partner'])) {
            $partnerId = Http::positiveId((string) $_GET['partner']);
            $where[] = 'EXISTS (SELECT 1 FROM proposal_partners pp WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? AND pp.invitation_status = ?)';
            array_push($params, $partnerId, 'accepted');
        }
        if (isset($_GET['format']) && $_GET['format'] === 'csv') {
            $statement = $this->db->prepare(
                'SELECT p.id, p.title, p.status, p.period_start, p.period_end, p.created_at FROM proposals p WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC LIMIT 5000'
            );
            $statement->execute($params);
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="ucc-ces-project-report.csv"');
            $output = fopen('php://output', 'wb');
            if ($output === false) {
                throw new RuntimeException('Unable to create report export.', 500);
            }
            fputcsv($output, ['ID', 'Project', 'Status', 'Start date', 'End date', 'Created']);
            while ($row = $statement->fetch(PDO::FETCH_NUM)) {
                fputcsv($output, array_map([$this, 'safeCsvCell'], $row));
            }
            fclose($output);
            exit;
        }
        if (isset($_GET['format']) && $_GET['format'] === 'pdf') {
            $statement = $this->db->prepare(
                'SELECT p.id, p.title, p.status, p.period_start, p.period_end, p.created_at,
                        (SELECT COUNT(*) FROM events e WHERE e.proposal_id = p.id) AS event_count
                 FROM proposals p WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC LIMIT 1000'
            );
            $statement->execute($params);
            $rows = $statement->fetchAll();
            $escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $html = '<!doctype html><html><head><meta charset="utf-8"><style>
                body{font-family:DejaVu Sans,sans-serif;color:#172b27;font-size:10px}
                h1{font-size:18px;color:#123d36}p{color:#52655e}
                table{width:100%;border-collapse:collapse;margin-top:18px}
                th,td{border:1px solid #d9e3de;padding:7px;text-align:left}
                th{background:#eaf3ee;color:#123d36}
                </style></head><body><h1>UCC-CES Project Report</h1><p>Date range ' .
                $escape($from) . ' to ' . $escape($to) .
                '</p><table><thead><tr><th>ID</th><th>Project</th><th>Status</th><th>Period</th><th>Events</th><th>Created</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $html .= '<tr><td>' . (int) $row['id'] . '</td><td>' . $escape($row['title']) . '</td><td>' .
                    $escape(str_replace('_', ' ', $row['status'])) . '</td><td>' .
                    $escape(($row['period_start'] ?: 'Unscheduled') . ' - ' . ($row['period_end'] ?: 'Unscheduled')) . '</td><td>' .
                    (int) $row['event_count'] . '</td><td>' . $escape($row['created_at']) . '</td></tr>';
            }
            $html .= '</tbody></table></body></html>';
            $pdf = new \Dompdf\Dompdf(new \Dompdf\Options(['isRemoteEnabled' => false]));
            $pdf->loadHtml($html, 'UTF-8');
            $pdf->setPaper('A4', 'landscape');
            $pdf->render();
            $pdf->stream('ucc-ces-project-report.pdf', ['Attachment' => true]);
            exit;
        }
        $statement = $this->db->prepare(
            'SELECT p.id, p.title, p.status, p.period_start, p.period_end, p.created_at,
                    (SELECT COUNT(*) FROM events e WHERE e.proposal_id = p.id) AS event_count
             FROM proposals p WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC LIMIT 500'
        );
        $statement->execute($params);
        Http::json(['from' => $from, 'to' => $to, 'projects' => $statement->fetchAll()]);
    }

    private function moduleReport(array $user, string $module, string $from, string $to): never
    {
        $projectScope = '';
        $baseParams = [];
        if ($module === 'partners') {
            if ($user['role'] !== 'admin') {
                $projectScope = ' WHERE p.user_id = ?';
                $baseParams[] = (int) $user['id'];
            }
            $baseQuery =
                'SELECT p.user_id AS id, p.organization_name AS subject, p.organization_type AS context,
                        u.account_status AS status, u.created_at AS report_date, COALESCE(p.address, \'\') AS details,
                        p.user_id AS partner_id, p.organization_type AS category
                 FROM partners p JOIN users u ON u.id = p.user_id' . $projectScope;
        } else {
            $scope = '';
            if ($user['role'] !== 'admin') {
                $scope =
                    ' WHERE (p.owner_user_id = ? OR EXISTS (
                        SELECT 1 FROM proposal_partners pp
                        WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? AND pp.invitation_status = ?
                    ))';
                array_push($baseParams, (int) $user['id'], (int) $user['id'], 'accepted');
            }
            $category = "(SELECT GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ')
                         FROM proposal_categories pc JOIN categories c ON c.id = pc.category_id
                         WHERE pc.proposal_id = p.id)";
            $queries = [
                'events' =>
                    "SELECT e.id, e.title AS subject, p.title AS context, p.status,
                            COALESCE(MIN(ed.event_date), DATE(e.created_at)) AS report_date,
                            CONCAT('Capacity: ', e.capacity) AS details, e.organizer_user_id AS partner_id,
                            $category AS category
                     FROM events e JOIN proposals p ON p.id = e.proposal_id
                     LEFT JOIN event_dates ed ON ed.event_id = e.id" .
                    ($scope ? str_replace(' WHERE ', ' WHERE ', $scope) : '') .
                    ' GROUP BY e.id, e.proposal_id, e.title, p.id, p.owner_user_id, p.title, p.status, e.created_at, e.capacity, e.organizer_user_id',
                'applications' =>
                    "SELECT ea.id, e.title AS subject, p.title AS context, ea.status, ea.applied_at AS report_date,
                            CONCAT(u.first_name, ' ', u.last_name, ' · ', u.email) AS details,
                            e.organizer_user_id AS partner_id, $category AS category
                     FROM event_applications ea
                     JOIN events e ON e.id = ea.event_id
                     JOIN proposals p ON p.id = e.proposal_id
                     JOIN users u ON u.id = ea.volunteer_user_id" . $scope,
                'attendance' =>
                    "SELECT a.id, e.title AS subject, p.title AS context, a.status,
                            COALESCE(a.scanned_at, CONCAT(ed.event_date, ' 00:00:00')) AS report_date,
                            CONCAT(u.first_name, ' ', u.last_name, IF(a.note IS NULL, '', CONCAT(' · ', a.note))) AS details,
                            e.organizer_user_id AS partner_id, $category AS category
                     FROM attendance a
                     JOIN event_applications ea ON ea.id = a.application_id
                     JOIN users u ON u.id = ea.volunteer_user_id
                     JOIN event_dates ed ON ed.id = a.event_date_id
                     JOIN events e ON e.id = ed.event_id
                     JOIN proposals p ON p.id = e.proposal_id" . $scope,
                'participants' =>
                    "SELECT pc.id, e.title AS subject, p.title AS context, 'recorded' AS status,
                            pc.created_at AS report_date,
                            CONCAT(pc.participant_group, ': ', pc.participant_count) AS details,
                            e.organizer_user_id AS partner_id, $category AS category
                     FROM participant_counts pc
                     JOIN event_dates ed ON ed.id = pc.event_date_id
                     JOIN events e ON e.id = ed.event_id
                     JOIN proposals p ON p.id = e.proposal_id" . $scope,
                'evaluations' =>
                    "SELECT ev.id, p.title AS subject, 'Project evaluation' AS context, 'completed' AS status,
                            ev.created_at AS report_date, CONCAT('Rating ', ev.rating, '/5: ', LEFT(COALESCE(ev.feedback, ''), 600)) AS details,
                            p.owner_user_id AS partner_id, $category AS category
                     FROM evaluations ev JOIN proposals p ON p.id = ev.proposal_id" . $scope,
                'certificates' =>
                    "SELECT c.id, e.title AS subject, p.title AS context, 'issued' AS status,
                            c.issued_at AS report_date, CONCAT(u.first_name, ' ', u.last_name) AS details,
                            e.organizer_user_id AS partner_id, $category AS category
                     FROM certificates c
                     JOIN events e ON e.id = c.event_id
                     JOIN proposals p ON p.id = e.proposal_id
                     JOIN users u ON u.id = c.volunteer_user_id" . $scope,
                'documents' =>
                    "SELECT d.id, p.title AS subject, d.document_type AS context,
                            IF(d.is_signed = 1, 'signed', 'unsigned') AS status, d.created_at AS report_date,
                            d.original_name AS details, p.owner_user_id AS partner_id, $category AS category
                     FROM documents d JOIN proposals p ON p.id = d.proposal_id" . $scope,
            ];
            if (!isset($queries[$module])) {
                throw new RuntimeException('Choose a valid report module.');
            }
            $baseQuery = $queries[$module];
        }

        $statuses = [
            'partners' => ['pending', 'approved', 'rejected', 'disabled'],
            'events' => ['draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected'],
            'applications' => ['pending', 'approved', 'rejected', 'withdrawn'],
            'attendance' => ['present', 'absent', 'excused'],
            'participants' => ['recorded'],
            'evaluations' => ['completed'],
            'certificates' => ['issued'],
            'documents' => ['signed', 'unsigned'],
        ];
        if (!isset($statuses[$module])) {
            throw new RuntimeException('Choose a valid report module.');
        }
        $where = ['DATE(report_date) >= ?', 'DATE(report_date) <= ?'];
        $params = [...$baseParams, $from, $to];
        if (!empty($_GET['status'])) {
            $status = trim((string) $_GET['status']);
            if (!in_array($status, $statuses[$module], true)) {
                throw new RuntimeException('Invalid status filter for the selected report module.');
            }
            $where[] = 'status = ?';
            $params[] = $status;
        }
        if (!empty($_GET['partner'])) {
            $where[] = 'partner_id = ?';
            $params[] = Http::positiveId((string) $_GET['partner']);
        }
        if (!empty($_GET['category'])) {
            $where[] = 'category LIKE ?';
            $params[] = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $_GET['category'])) . '%';
        }
        if (!empty($_GET['search'])) {
            $search = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $_GET['search'])) . '%';
            $where[] = '(CAST(id AS CHAR) LIKE ? OR subject LIKE ? OR context LIKE ? OR details LIKE ?)';
            array_push($params, $search, $search, $search, $search);
        }
        $sql = 'SELECT id, subject, context, status, report_date, details FROM (' . $baseQuery . ') report WHERE ' .
            implode(' AND ', $where) . ' ORDER BY report_date DESC LIMIT 2000';
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll();

        $format = (string) ($_GET['format'] ?? '');
        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="ucc-ces-' . $module . '-report.csv"');
            $output = fopen('php://output', 'wb');
            if ($output === false) {
                throw new RuntimeException('Unable to create report export.', 500);
            }
            fputcsv($output, ['Record ID', 'Record', 'Related project / context', 'Status', 'Date', 'Details']);
            foreach ($rows as $row) {
                fputcsv($output, array_map([$this, 'safeCsvCell'], [
                    $row['id'], $row['subject'], $row['context'], $row['status'], $row['report_date'], $row['details'],
                ]));
            }
            fclose($output);
            exit;
        }
        if ($format === 'pdf') {
            $escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $html = '<!doctype html><html><head><meta charset="utf-8"><style>
                body{font-family:DejaVu Sans,sans-serif;color:#172b27;font-size:9px}
                h1{font-size:18px;color:#123d36}p{color:#52655e}
                table{width:100%;border-collapse:collapse;margin-top:18px}
                th,td{border:1px solid #d9e3de;padding:6px;text-align:left}
                th{background:#eaf3ee;color:#123d36}
                </style></head><body><h1>UCC-CES ' . $escape(ucfirst($module)) . ' Report</h1><p>Date range ' .
                $escape($from) . ' to ' . $escape($to) . ' · Non-financial data</p><table><thead><tr>' .
                '<th>Record</th><th>Related context</th><th>Status</th><th>Date</th><th>Details</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $html .= '<tr><td>' . $escape((string) $row['subject']) . '</td><td>' .
                    $escape((string) $row['context']) . '</td><td>' . $escape((string) $row['status']) .
                    '</td><td>' . $escape((string) $row['report_date']) . '</td><td>' .
                    $escape((string) $row['details']) . '</td></tr>';
            }
            $html .= '</tbody></table></body></html>';
            $pdf = new \Dompdf\Dompdf(new \Dompdf\Options(['isRemoteEnabled' => false]));
            $pdf->loadHtml($html, 'UTF-8');
            $pdf->setPaper('A4', 'landscape');
            $pdf->render();
            $pdf->stream('ucc-ces-' . $module . '-report.pdf', ['Attachment' => true]);
            exit;
        }
        if ($format !== '') {
            throw new RuntimeException('Choose CSV or PDF for report export.');
        }
        Http::json(['from' => $from, 'to' => $to, 'module' => $module, 'rows' => $rows]);
    }

    private function projectDossier(int $proposalId): never
    {
        $user = Http::user();
        if (!in_array($user['role'], ['admin', 'partner'], true)) {
            throw new RuntimeException('Project reports are available to CES Admins and partner accounts.', 403);
        }
        $this->assertProposalAccess($proposalId, $user, false);
        $project = $this->proposal($proposalId);

        $partners = $this->db->prepare(
            "SELECT p.organization_name, p.organization_type, pp.relationship
             FROM proposal_partners pp JOIN partners p ON p.user_id = pp.partner_user_id
             WHERE pp.proposal_id = ? AND pp.invitation_status = 'accepted'
             ORDER BY pp.relationship, p.organization_name"
        );
        $partners->execute([$proposalId]);

        $schedules = $this->db->prepare(
            'SELECT e.title AS event_title, ed.event_date, a.title AS activity_title, a.start_time,
                    a.end_time, a.venue, a.target_participants, a.activity_lead
             FROM events e JOIN event_dates ed ON ed.event_id = e.id
             JOIN activities a ON a.event_date_id = ed.id
             WHERE e.proposal_id = ? ORDER BY ed.event_date, a.start_time'
        );
        $schedules->execute([$proposalId]);

        $attendance = $this->db->prepare(
            "SELECT e.title AS event_title, ed.event_date,
                    COUNT(DISTINCT CASE WHEN ea.status = 'approved' THEN ea.id END) AS approved_volunteers,
                    COUNT(DISTINCT CASE WHEN at.status = 'present' THEN at.id END) AS present,
                    COUNT(DISTINCT CASE WHEN at.status = 'absent' THEN at.id END) AS absent,
                    COUNT(DISTINCT CASE WHEN at.status = 'excused' THEN at.id END) AS excused
             FROM events e JOIN event_dates ed ON ed.event_id = e.id
             LEFT JOIN event_applications ea ON ea.event_id = e.id
             LEFT JOIN attendance at ON at.application_id = ea.id AND at.event_date_id = ed.id
             WHERE e.proposal_id = ? GROUP BY e.id, ed.id ORDER BY ed.event_date"
        );
        $attendance->execute([$proposalId]);

        $volunteers = $this->db->prepare(
            'SELECT e.title AS event_title, u.first_name, u.last_name, vp.volunteer_type, ea.status AS application_status
             FROM events e JOIN event_applications ea ON ea.event_id = e.id
             JOIN users u ON u.id = ea.volunteer_user_id
             JOIN volunteer_profiles vp ON vp.user_id = u.id
             WHERE e.proposal_id = ? ORDER BY e.title, u.last_name, u.first_name'
        );
        $volunteers->execute([$proposalId]);

        $participants = $this->db->prepare(
            'SELECT e.title AS event_title, ed.event_date, pc.participant_group, SUM(pc.participant_count) AS participant_count
             FROM participant_counts pc JOIN event_dates ed ON ed.id = pc.event_date_id
             JOIN events e ON e.id = ed.event_id
             WHERE e.proposal_id = ? GROUP BY ed.id, pc.participant_group ORDER BY ed.event_date, pc.participant_group'
        );
        $participants->execute([$proposalId]);

        $documents = $this->db->prepare(
            'SELECT id, document_type, original_name, is_signed, created_at FROM documents
             WHERE proposal_id = ? ORDER BY created_at'
        );
        $documents->execute([$proposalId]);

        $evaluations = $this->db->prepare(
            'SELECT AVG(rating) AS average_rating, COUNT(*) AS evaluation_count
             FROM evaluations WHERE proposal_id = ?'
        );
        $evaluations->execute([$proposalId]);

        Http::json([
            'project' => [
                'id' => (int) $project['id'],
                'title' => $project['title'],
                'summary' => $project['summary'],
                'status' => $project['status'],
                'periodStart' => $project['period_start'],
                'periodEnd' => $project['period_end'],
                'duration' => $project['stated_duration'],
            ],
            'partners' => $partners->fetchAll(),
            'schedules' => $schedules->fetchAll(),
            'attendance' => $attendance->fetchAll(),
            'volunteers' => $volunteers->fetchAll(),
            'participants' => $participants->fetchAll(),
            'documents' => $documents->fetchAll(),
            'evaluation' => $evaluations->fetch(),
        ]);
    }

    private function notifications(): never
    {
        $user = Http::user();
        $statement = $this->db->prepare('SELECT id, subject, message, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100');
        $statement->execute([(int) $user['id']]);
        Http::json(['notifications' => $statement->fetchAll()]);
    }

    private function markNotificationRead(int $notificationId): never
    {
        $user = Http::user();
        $statement = $this->db->prepare(
            'UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?'
        );
        $statement->execute([$notificationId, (int) $user['id']]);
        if ($statement->rowCount() !== 1) {
            $exists = $this->db->prepare('SELECT 1 FROM notifications WHERE id = ? AND user_id = ?');
            $exists->execute([$notificationId, (int) $user['id']]);
            if (!$exists->fetchColumn()) {
                throw new RuntimeException('Notification was not found.', 404);
            }
        }
        Http::json(['message' => 'Notification marked as read.']);
    }

    private function markAllNotificationsRead(): never
    {
        $user = Http::user();
        $statement = $this->db->prepare(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL'
        );
        $statement->execute([(int) $user['id']]);
        Http::json(['message' => 'All notifications marked as read.']);
    }

    private function insertActivity(\PDOStatement $statement, int $eventDateId, mixed $activity): void
    {
        if (!is_array($activity)) {
            throw new RuntimeException('Activity details are invalid.');
        }
        $title = trim((string) ($activity['title'] ?? ''));
        $start = trim((string) ($activity['startTime'] ?? ''));
        $end = trim((string) ($activity['endTime'] ?? ''));
        $venue = trim((string) ($activity['venue'] ?? ''));
        if ($title === '' || !preg_match('/^\d{2}:\d{2}$/', $start) || !preg_match('/^\d{2}:\d{2}$/', $end) || $end <= $start || $venue === '') {
            throw new RuntimeException('Each activity needs a title, valid start/end times, and venue.');
        }
        $target = $activity['targetParticipants'] ?? null;
        if ($target !== null && filter_var($target, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]) === false) {
            throw new RuntimeException('Target participant count must be a non-negative whole number.');
        }
        $statement->execute([
            $eventDateId, $title, $start . ':00', $end . ':00', $venue,
            $target === null ? null : (int) $target, trim((string) ($activity['activityLead'] ?? '')) ?: null,
        ]);
    }

    private function syncProposalClassifications(int $proposalId, mixed $classifications): void
    {
        if (!is_array($classifications) || count($classifications) < 1) {
            throw new RuntimeException('Choose at least one project classification.');
        }
        $insert = $this->db->prepare('INSERT INTO proposal_classifications (proposal_id, classification) VALUES (?, ?)');
        foreach (array_unique($classifications) as $classification) {
            if (!in_array($classification, ['CES', 'Student Development'], true)) {
                throw new RuntimeException('Invalid project classification.');
            }
            $insert->execute([$proposalId, $classification]);
        }
    }

    private function syncProposalCategories(int $proposalId, mixed $categories): void
    {
        if (!is_array($categories) || count($categories) < 1) {
            throw new RuntimeException('Choose at least one CES category.');
        }
        $insert = $this->db->prepare('INSERT INTO proposal_categories (proposal_id, category_id) VALUES (?, ?)');
        foreach (array_unique($categories) as $categoryId) {
            $insert->execute([$proposalId, Http::positiveId((string) $categoryId)]);
        }
    }

    private function assertProposalAccess(int $proposalId, array $user, bool $ownerOnly): void
    {
        $sql = 'SELECT p.owner_user_id FROM proposals p WHERE p.id = ?';
        if (!$ownerOnly && $user['role'] !== 'admin') {
            $sql .= ' AND (p.owner_user_id = ? OR EXISTS (SELECT 1 FROM proposal_partners pp WHERE pp.proposal_id = p.id AND pp.partner_user_id = ? AND pp.invitation_status = ?))';
        }
        $statement = $this->db->prepare($sql);
        $params = [$proposalId];
        if (!$ownerOnly && $user['role'] !== 'admin') {
            array_push($params, $user['id'], $user['id'], 'accepted');
        }
        $statement->execute($params);
        $proposal = $statement->fetch();
        if (!$proposal || ($ownerOnly && (int) $proposal['owner_user_id'] !== (int) $user['id'])) {
            throw new RuntimeException('Proposal was not found or you do not have access.', 404);
        }
    }

    private function assertEventOrganizer(int $eventId, array $user): void
    {
        if ($user['role'] === 'admin') {
            return;
        }
        $statement = $this->db->prepare('SELECT organizer_user_id FROM events WHERE id = ?');
        $statement->execute([$eventId]);
        if ((int) $statement->fetchColumn() !== (int) $user['id']) {
            throw new RuntimeException('Only the event organizer or CES Admin can manage this event.', 403);
        }
    }

    private function proposal(int $id): array
    {
        $statement = $this->db->prepare('SELECT * FROM proposals WHERE id = ?');
        $statement->execute([$id]);
        $proposal = $statement->fetch();
        if (!$proposal) {
            throw new RuntimeException('Proposal was not found.', 404);
        }
        return $proposal;
    }

    private function requireApprovedVolunteer(int $userId): void
    {
        $statement = $this->db->prepare("SELECT account_status FROM users WHERE id = ? AND role = 'volunteer'");
        $statement->execute([$userId]);
        if ($statement->fetchColumn() !== 'approved') {
            throw new RuntimeException('Your volunteer account must be approved before using this feature.', 403);
        }
    }

    private function ownedProposalCounts(int $userId): array
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(DISTINCT p.id) AS proposals,
                    SUM(p.status = ?) AS active,
                    (SELECT COUNT(*) FROM events e JOIN proposals ep ON ep.id = e.proposal_id WHERE ep.owner_user_id = ?) AS events
             FROM proposals p WHERE p.owner_user_id = ?'
        );
        $statement->execute(['active', $userId, $userId]);
        return $statement->fetch() ?: [];
    }

    private function findUserByEmail(string $email): array|false
    {
        $statement = $this->db->prepare('SELECT * FROM users WHERE email = ?');
        $statement->execute([$email]);
        return $statement->fetch();
    }

    private function validateSession(): void
    {
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !isset($sessionUser['id'], $sessionUser['role'])) {
            return;
        }
        $statement = $this->db->prepare('SELECT role, account_status, password_change_required FROM users WHERE id = ?');
        $statement->execute([(int) $sessionUser['id']]);
        $account = $statement->fetch();
        if (!$account || $account['role'] !== $sessionUser['role'] || $account['account_status'] !== 'approved') {
            unset($_SESSION['user']);
            session_regenerate_id(true);
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            return;
        }
        $_SESSION['user']['mustChangePassword'] = (bool) $account['password_change_required'];
    }

    private function safeCsvCell(mixed $value): mixed
    {
        if (is_string($value) && preg_match('/^[\s\x00-\x1f]*[=+\-@]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    private function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'mustChangePassword' => (bool) $user['password_change_required'],
        ];
    }

    private function notifyAdmins(string $subject, string $message): void
    {
        $statement = $this->db->query("SELECT id FROM users WHERE role = 'admin' AND account_status = 'approved'");
        foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $adminId) {
            $this->notifyUser((int) $adminId, $subject, $message);
        }
    }

    private function notifyUser(int $userId, string $subject, string $message): void
    {
        $statement = $this->db->prepare('INSERT INTO notifications (user_id, subject, message) VALUES (?, ?, ?)');
        $statement->execute([$userId, $subject, $message]);
        $user = $this->db->prepare('SELECT email, first_name, last_name FROM users WHERE id = ?');
        $user->execute([$userId]);
        $recipient = $user->fetch();
        if ($recipient) {
            \Ces\NotificationService::send(
                $this->config['mail'],
                $recipient['email'],
                $recipient['first_name'] . ' ' . $recipient['last_name'],
                $subject,
                $message
            );
        }
    }

    private function notifyEventOrganizers(int $eventId, string $subject, string $message): void
    {
        $statement = $this->db->prepare(
            'SELECT DISTINCT organizer_user_id FROM events WHERE id = ?'
        );
        $statement->execute([$eventId]);
        foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $organizerId) {
            $this->notifyUser((int) $organizerId, $subject, $message);
        }
    }

    private function requestData(): array
    {
        $type = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains(strtolower($type), 'multipart/form-data')) {
            $data = $_POST;
            if (isset($data['payload'])) {
                $decoded = json_decode((string) $data['payload'], true);
                if (!is_array($decoded)) {
                    throw new RuntimeException('Upload payload must be valid JSON.', 400);
                }
                return $decoded;
            }
            return $data;
        }
        return Http::body();
    }

    private function storeUpload(string $field, string $folder, bool $required): string
    {
        $file = $_FILES[$field] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            if ($required) {
                throw new RuntimeException('A supporting file is required.');
            }
            return '';
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            throw new RuntimeException('The uploaded file could not be verified.');
        }
        if ((int) $file['size'] < 1 || (int) $file['size'] > (int) $this->config['max_upload_bytes']) {
            throw new RuntimeException('File must be between 1 byte and 10 MB.');
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!in_array($mime, $this->config['allowed_upload_mimes'], true)) {
            throw new RuntimeException('Only PDF, JPEG, or PNG files are allowed.');
        }
        $extension = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'][$mime];
        $directory = $this->config['uploads_path'] . DIRECTORY_SEPARATOR . $folder;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('Upload storage could not be prepared.', 500);
        }
        $filename = bin2hex(random_bytes(20)) . '.' . $extension;
        if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $filename)) {
            throw new RuntimeException('File could not be stored.', 500);
        }
        return 'uploads/' . $folder . '/' . $filename;
    }

    private function optionalDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        return $this->requiredDate($value);
    }

    private function requiredDate(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            throw new RuntimeException('Dates must use YYYY-MM-DD format.');
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            throw new RuntimeException('Enter a valid calendar date.');
        }
        return $value;
    }

    private function optionalDateTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value)) {
            throw new RuntimeException('Date/time values must use YYYY-MM-DDTHH:MM format.');
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $value);
        if (!$date || $date->format('Y-m-d\TH:i') !== $value) {
            throw new RuntimeException('Enter a valid date and time.');
        }
        return $date->format('Y-m-d H:i:s');
    }
}
