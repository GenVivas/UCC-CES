<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/Database.php';

use Ces\Database;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This command can only be run from the command line.\n");
    exit(1);
}

if (($argv[1] ?? '') !== '--apply') {
    fwrite(STDERR, "This replaces the project's sample data. Accounts and linked account profiles are preserved.\n");
    fwrite(STDERR, "Run: php scripts/seed-sample-data.php --apply\n");
    exit(2);
}

$config = require dirname(__DIR__) . '/config/app.php';
date_default_timezone_set($config['timezone']);
$db = Database::connection();
$today = new DateTimeImmutable('today', new DateTimeZone($config['timezone']));
$now = new DateTimeImmutable('now', new DateTimeZone($config['timezone']));
mt_srand(20261024);

$fingerprint = static fn (array $rows): string => hash('sha256', serialize($rows));
$usersBefore = $db->query('SELECT * FROM users ORDER BY id')->fetchAll();
$partnersBefore = $db->query('SELECT * FROM partners ORDER BY user_id')->fetchAll();
$volunteersBefore = $db->query('SELECT * FROM volunteer_profiles ORDER BY user_id')->fetchAll();
$userFingerprint = $fingerprint($usersBefore);
$partnerFingerprint = $fingerprint($partnersBefore);
$volunteerFingerprint = $fingerprint($volunteersBefore);

$adminIds = [];
$partnerIds = [];
$rolesByUserId = [];
foreach ($usersBefore as $user) {
    $userId = (int) $user['id'];
    $rolesByUserId[$userId] = $user['role'];
    if ($user['account_status'] !== 'approved') {
        continue;
    }
    if ($user['role'] === 'admin') {
        $adminIds[] = $userId;
    } elseif ($user['role'] === 'partner') {
        $partnerIds[] = $userId;
    }
}

$volunteerProfileIds = array_fill_keys(array_map('intval', array_column($volunteersBefore, 'user_id')), true);
$volunteerIds = [];
foreach ($usersBefore as $user) {
    $userId = (int) $user['id'];
    if ($user['role'] === 'volunteer' &&
        $user['account_status'] === 'approved' &&
        isset($volunteerProfileIds[$userId])) {
        $volunteerIds[] = $userId;
    }
}

if ($adminIds === [] || $partnerIds === [] || count($volunteerIds) < 2) {
    throw new RuntimeException('The seed requires an existing approved admin, partner, and two approved volunteer profiles. It never creates accounts.');
}

$projectRoot = dirname(__DIR__);
$sampleDirectory = $projectRoot . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'sample-seed';
$sampleFiles = [
    'project-brief.pdf' => ['application/pdf', 'Project Brief'],
    'signed-moa.pdf' => ['application/pdf', 'Sample Signed Document'],
    'volunteer-report.pdf' => ['application/pdf', 'Volunteer Report'],
    'volunteer-certificate.pdf' => ['application/pdf', 'Certificate'],
];
$sampleFileSizes = [];
foreach ($sampleFiles as $filename => [$expectedMime]) {
    $path = $sampleDirectory . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path) || (new finfo(FILEINFO_MIME_TYPE))->file($path) !== $expectedMime) {
        throw new RuntimeException('Missing or invalid local sample file: ' . $filename);
    }
    $sampleFileSizes[$filename] = filesize($path);
}

$categories = [
    'Environment', 'Disaster Preparedness', 'Entrepreneurship', 'Values Formation',
    'Health and Sanitation', 'Education', 'Recreation', 'Gender and Development',
];
$taxonomy = [
    'Education and Digital Inclusion' => ['Digital Literacy', 'Learning Support', 'Assistive and Inclusive Learning'],
    'Health and Sanitation' => ['Community Health Education', 'Mental Wellness Promotion', 'Water, Sanitation and Hygiene'],
    'Environment and Climate Action' => ['Urban Greening', 'Waste Reduction', 'Climate Resilience'],
    'Livelihood and Local Enterprise' => ['Microenterprise Skills', 'Financial Literacy', 'Community Product Development'],
    'Disaster Preparedness' => ['Household Preparedness', 'First Aid and Emergency Response', 'Community Risk Mapping'],
    'Youth, Family and Inclusion' => ['Youth Leadership', 'Gender and Development', 'Values Formation'],
];
$projects = [
    ['Community Digital Literacy and Online Safety Workshops', 'Education'],
    ['Senior Citizen e-Government and Mobile Phone Learning Sessions', 'Education'],
    ['After-School Reading and Numeracy Support Circles', 'Education'],
    ['Inclusive Learning Resources for Children with Disabilities', 'Education'],
    ['Community First Aid Awareness and Emergency Preparedness', 'Disaster Preparedness'],
    ['Barangay Household Risk Mapping and Go-Bag Orientation', 'Disaster Preparedness'],
    ['Family Health, Hygiene and Safe-Water Caravan', 'Health and Sanitation'],
    ['Healthy Habits and Non-Communicable Disease Prevention Forum', 'Health and Sanitation'],
    ['Youth Mental Wellness and Peer Support Seminar', 'Health and Sanitation'],
    ['Community Nutrition and Urban Gardening Demonstration', 'Health and Sanitation'],
    ['Caloocan Neighborhood Clean-Up and Waste Segregation Drive', 'Environment'],
    ['Plastic Recovery and Materials Reuse Learning Workshop', 'Environment'],
    ['Urban Greening and Native Seedling Care Project', 'Environment'],
    ['Flood-Smart Communities and Drainage Awareness Campaign', 'Environment'],
    ['Community Microenterprise and Digital Selling Clinic', 'Entrepreneurship'],
    ['Household Budgeting and Basic Financial Literacy Workshops', 'Entrepreneurship'],
    ['Local Women-Led Enterprise Product Development Sessions', 'Entrepreneurship'],
    ['Youth Leadership, Volunteerism and Civic Responsibility Camp', 'Values Formation'],
    ['Family Values, Respect and Community Wellbeing Dialogue', 'Values Formation'],
    ['Inclusive Sports and Community Recreation Day', 'Recreation'],
    ['Accessible Fitness and Active Aging Community Program', 'Recreation'],
    ['Women and Girls Community Safety and Empowerment Forum', 'Gender and Development'],
    ['Gender-Responsive Barangay Services Orientation', 'Gender and Development'],
    ['Community Emergency Communications and Response Drill', 'Disaster Preparedness'],
];
$barangays = [
    'Bagong Silang', 'Camarin', 'Bagumbong', 'Tala', 'Deparo', 'Kaybiga',
    'Llano', 'Bagong Barrio', 'Grace Park', 'Sangandaan', 'Maypajo', 'Monumento',
];
$proponents = [
    ['University of Caloocan City - Community Extension Services', 'Partner barangay council'],
    ['UCC Community Extension Services', 'Local health and wellness volunteers'],
    ['UCC faculty and student service-learning teams', 'Community-based organization'],
    ['UCC - CSD', 'Barangay disaster risk reduction and management committee'],
    ['UCC community volunteers', 'Local parent and youth associations'],
];
$components = [
    'Community orientation and needs assessment',
    'Interactive learning session and guided practice',
    'Volunteer-led demonstration and small-group activity',
    'Household outreach and resource distribution',
    'Knowledge check, referral information and participant feedback',
];
$budgets = [
    ['Participant learning materials', 'kits', 45, 285],
    ['Printed guides and accessible handouts', 'copies', 80, 35],
    ['Workshop and demonstration supplies', 'sets', 3, 850],
    ['Community venue and equipment support', 'days', 1, 4500],
    ['Participant refreshments', 'participants', 60, 105],
    ['Local transport and materials delivery', 'trips', 2, 1250],
    ['Seeds, seedlings or practical demonstration materials', 'sets', 20, 175],
    ['Health and hygiene learning packs', 'packs', 35, 220],
    ['First-aid and emergency-awareness supplies', 'kits', 4, 950],
    ['Connectivity and digital learning support', 'sessions', 4, 650],
    ['Youth activity equipment and inclusive recreation supplies', 'sets', 3, 1700],
    ['Documentation, printing and community information materials', 'lots', 1, 2800],
];
$summaries = [
    'Accessible, community-led extension activity developed with local stakeholders and UCC service-learning volunteers.',
    'Practical workshops combine facilitated learning, supervised demonstration and actionable community take-home resources.',
    'A barangay-based outreach series connecting evidence-informed education with locally identified needs and partner referrals.',
    'Participatory sessions adapt to resident schedules and accessibility requirements, with attendance and feedback recorded.',
];
$justifications = [
    'Community consultations identified a need for accessible, practical learning opportunities. The program pairs UCC extension expertise with barangay outreach and guided volunteer support.',
    'Residents benefit from clear, locally relevant information and demonstrations that can be applied at home. Activities are coordinated with appropriate community partners.',
    'Service-learning activities provide structured outreach while documenting participation, participant feedback and practical next steps for sustained engagement.',
    'The proposed activity supports inclusive community development through practical education, facilitated discussion and connections to appropriate local services.',
];
$outputs = [
    'Deliver at least three learning sessions; document participant reach and feedback; provide reusable learning and referral materials.',
    'Engage residents in an orientation and practical demonstration; record attendance and follow-up actions with the barangay partner.',
    'Train student volunteers in safe, respectful community engagement; distribute relevant resources and document recommendations.',
];
$risks = [
    'Weather or venue changes may affect attendance; confirm a covered venue and coordinate schedule updates with barangay partners.',
    'Limited devices or supplies may delay exercises; prepare offline materials, backup supplies and small-group rotations.',
    'Participants may require accessibility support; offer advance registration, accessible materials and alternate arrangements.',
    'Specialist questions may exceed the session scope; refer clinical, emergency and legal concerns to qualified local professionals.',
];
$eventTypes = [
    'Community Extension Learning Session', 'Barangay Outreach Workshop', 'Community Education Caravan',
    'UCC Service-Learning and Outreach Day', 'Community Health and Wellness Forum',
    'Neighborhood Environment Action Day', 'Community Preparedness and Skills Workshop',
];
$feedback = [
    'The facilitator explained the topic clearly and made time for questions from residents.',
    'The practical demonstration and take-home materials were useful for our community.',
    'The activity was welcoming and organized. I would recommend continuing the sessions.',
    'The session shared helpful information and connected participants with relevant local resources.',
    'The activities were relevant and well-paced, and volunteer facilitators were respectful.',
];
$json = static fn (array $value): string => json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
$date = static fn (DateTimeImmutable $value): string => $value->format('Y-m-d H:i:s');

$deleteTables = [
    'attendance', 'budget_items', 'certificates', 'documents', 'evaluations',
    'event_documentations', 'event_applications', 'participant_counts', 'activities', 'event_dates', 'event_partners', 'events',
    'proposal_categories', 'proposal_classifications', 'proposal_partners', 'proposals',
    'notifications', 'activity_logs', 'volunteer_event_evaluations', 'volunteer_documentations', 'password_reset_otps',
    'partner_subcategories', 'subcategories', 'sectors', 'categories',
];

$db->beginTransaction();
try {
    foreach ($deleteTables as $table) {
        $db->exec('DELETE FROM `' . $table . '`');
    }

    $categoryIds = [];
    $categoryInsert = $db->prepare('INSERT INTO categories (name) VALUES (?)');
    foreach ($categories as $category) {
        $categoryInsert->execute([$category]);
    }
    foreach ($db->query('SELECT id,name FROM categories')->fetchAll() as $row) {
        $categoryIds[$row['name']] = (int) $row['id'];
    }

    $sectorInsert = $db->prepare('INSERT INTO sectors (name) VALUES (?)');
    $subcategoryInsert = $db->prepare('INSERT INTO subcategories (sector_id,name) VALUES (?,?)');
    $subcategoryIds = [];
    foreach ($taxonomy as $sectorName => $subcategoryNames) {
        $sectorInsert->execute([$sectorName]);
        $sectorId = (int) $db->lastInsertId();
        foreach ($subcategoryNames as $subcategoryName) {
            $subcategoryInsert->execute([$sectorId, $subcategoryName]);
            $subcategoryIds[$subcategoryName] = (int) $db->lastInsertId();
        }
    }

    $partnerSubcategory = $db->prepare('INSERT INTO partner_subcategories (partner_user_id,subcategory_id) VALUES (?,?)');
    foreach (['Digital Literacy', 'Learning Support', 'Community Health Education', 'Urban Greening', 'Microenterprise Skills', 'Household Preparedness', 'Gender and Development'] as $subcategory) {
        $partnerSubcategory->execute([$partnerIds[0], $subcategoryIds[$subcategory]]);
    }

    $proposalInsert = $db->prepare(
        'INSERT INTO proposals
        (owner_user_id,title,summary,venue,proponents,activity_components,estimated_cost_items,total_estimated_cost,
         justification,target_beneficiaries,target_outputs,possible_risks,expected_private_partnerships,
         accepts_volunteers,volunteer_approval_mode,status,period_start,period_end,stated_duration,
         review_notes,submitted_at,reviewed_by,reviewed_at,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $proposalPartner = $db->prepare('INSERT INTO proposal_partners (proposal_id,partner_user_id,relationship,invitation_status,created_at) VALUES (?,? ,?,?,?)');
    $proposalClassification = $db->prepare('INSERT INTO proposal_classifications (proposal_id,classification) VALUES (?,?)');
    $proposalCategory = $db->prepare('INSERT INTO proposal_categories (proposal_id,category_id) VALUES (?,?)');
    $document = $db->prepare('INSERT INTO documents (proposal_id,uploaded_by,document_type,relative_path,original_name,mime_type,file_size,description,is_signed,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $eventInsert = $db->prepare('INSERT INTO events (proposal_id,organizer_user_id,title,description,venue,capacity,applications_open_at,applications_close_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    $eventPartner = $db->prepare("INSERT INTO event_partners (event_id,partner_user_id,relationship,created_at) VALUES (?,?,'organizer',?)");
    $eventCollaborator = $db->prepare("INSERT INTO event_partners (event_id,partner_user_id,relationship,created_at) VALUES (?,?,'collaborator',?)");
    $eventDateInsert = $db->prepare('INSERT INTO event_dates (event_id,event_date,qr_token_hash) VALUES (?,?,?)');
    $activityInsert = $db->prepare('INSERT INTO activities (event_date_id,title,start_time,end_time,venue,target_participants,activity_lead) VALUES (?,?,?,?,?,?,?)');
    $budgetInsert = $db->prepare('INSERT INTO budget_items (proposal_id,activity_id,description,quantity,unit_cost) VALUES (?,?,?,?,?)');
    $applicationInsert = $db->prepare('INSERT INTO event_applications (event_id,volunteer_user_id,status,applied_at,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?)');
    $attendanceInsert = $db->prepare('INSERT INTO attendance (application_id,event_date_id,status,scanned_at,checked_out_at,verification_status,marked_by,note) VALUES (?,?,?,?,?,?,?,?)');
    $participantInsert = $db->prepare('INSERT INTO participant_counts (event_date_id,participant_group,participant_count,recorded_by,created_at) VALUES (?,?,?,?,?)');
    $evaluationInsert = $db->prepare('INSERT INTO evaluations (proposal_id,submitted_by,rating,feedback,created_at) VALUES (?,?,?,?,?)');
    $volunteerEvaluationInsert = $db->prepare('INSERT INTO volunteer_event_evaluations (event_id,volunteer_user_id,rating,feedback,created_at) VALUES (?,?,?,?,?)');
    $certificateInsert = $db->prepare('INSERT INTO certificates (event_id,volunteer_user_id,relative_path,issued_at) VALUES (?,?,?,?)');
    $documentationInsert = $db->prepare('INSERT INTO volunteer_documentations (volunteer_user_id,documentation_type,relative_path,original_name,mime_type,file_size,description,created_at) VALUES (?,?,?,?,?,?,?,?)');
    $eventDocumentationInsert = $db->prepare('INSERT INTO event_documentations (event_id,uploaded_by,documentation_type,relative_path,original_name,mime_type,file_size,description,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    $notificationInsert = $db->prepare('INSERT INTO notifications (user_id,subject,message,read_at,created_at) VALUES (?,?,?,?,?)');
    $activityLog = $db->prepare('INSERT INTO activity_logs (actor_user_id,actor_role,action,entity_type,entity_id,details,ip_address,created_at) VALUES (?,?,?,?,?,?,NULL,?)');
    $log = static function (PDOStatement $statement, array $roleMap, int $actorId, string $action, string $entity, int $entityId, array $details, string $createdAt) use ($json): void {
        $statement->execute([$actorId, $roleMap[$actorId], $action, $entity, $entityId, $json($details), $createdAt]);
    };

    $eventPlans = [];
    $activeIndex = 0;
    for ($i = 0; $i < 60; $i++) {
        $project = $projects[$i % count($projects)];
        $barangay = $barangays[$i % count($barangays)];
        $status = match (true) {
            $i < 32 => 'active',
            $i < 38 => 'approved',
            $i < 42 => 'submitted',
            $i < 46 => 'under_review',
            $i < 50 => 'revision',
            $i < 54 => 'draft',
            default => 'rejected',
        };
        $scheduledDates = [];
        if ($status === 'active') {
            $offset = $activeIndex < 24
                ? -240 + ($activeIndex * 8)
                : ($activeIndex < 26 ? -1 : 5 + (($activeIndex - 26) * 5));
            $firstDate = $today->modify(sprintf('%+d days', $offset));
            for ($day = 0, $dayCount = 2 + ($activeIndex % 2); $day < $dayCount; $day++) {
                $scheduledDates[] = $firstDate->modify('+' . $day . ' days');
            }
            $periodStart = $scheduledDates[0]->modify('-14 days');
            $periodEnd = $scheduledDates[count($scheduledDates) - 1]->modify('+14 days');
            $activeIndex++;
        } else {
            $periodStart = $today->modify(sprintf('%+d days', mt_rand(-120, 160)));
            $periodEnd = $periodStart->modify('+' . mt_rand(30, 150) . ' days');
        }

        $created = $periodStart->modify('-' . mt_rand(40, 120) . ' days')->setTime(mt_rand(8, 16), mt_rand(0, 59));
        if ($created > $now) {
            $created = $now->modify('-' . mt_rand(1, 30) . ' days');
        }
        $submitted = $created->modify('+' . mt_rand(3, 12) . ' days');
        $reviewed = $submitted->modify('+' . mt_rand(3, 15) . ' days');
        $reviewedStatus = in_array($status, ['under_review', 'revision', 'approved', 'active', 'rejected'], true);
        if ($status !== 'draft' && $reviewedStatus && $reviewed > $now) {
            $reviewed = $now->modify('-' . mt_rand(1, 30) . ' days');
            $submitted = $reviewed->modify('-' . mt_rand(3, 12) . ' days');
            $created = $submitted->modify('-' . mt_rand(30, 90) . ' days');
        }
        if ($status === 'submitted' && $submitted > $now) {
            $submitted = $now->modify('-' . mt_rand(1, 20) . ' days');
            $created = $submitted->modify('-' . mt_rand(30, 90) . ' days');
        }
        $hasBeenSubmitted = $status !== 'draft';
        $costItems = [];
        $totalCents = 0;
        $firstBudget = ($i * 3) % count($budgets);
        for ($b = 0, $budgetCount = mt_rand(4, 7); $b < $budgetCount; $b++) {
            [$description, $unit, $baseQuantity, $baseCost] = $budgets[($firstBudget + $b) % count($budgets)];
            $quantity = $baseQuantity + mt_rand(-min(15, $baseQuantity - 1), 25);
            $unitCost = $baseCost + mt_rand(0, max(1, (int) round($baseCost * 0.18)));
            $subtotalCents = $quantity * $unitCost * 100;
            $totalCents += $subtotalCents;
            $costItems[] = ['description'=>$description,'unit'=>$unit,'quantity'=>$quantity,'cost'=>$unitCost,'subtotal'=>round($subtotalCents / 100, 2)];
        }
        $projectComponents = [];
        $componentCount = mt_rand(3, 5);
        for ($c = 0; $c < $componentCount; $c++) {
            $projectComponents[] = $components[($i + $c) % count($components)];
        }
        $reviewNote = match ($status) {
            'draft', 'submitted' => null,
            'under_review' => 'Sample CES review is in progress; coordinate any requested clarifications with the partner.',
            'revision' => 'Sample CES review: revise the activity schedule and clarify the partner coordination plan before resubmission.',
            'rejected' => 'Sample administrative decision: revise project scope, partner confirmation, and safeguarding plan before resubmission.',
            default => 'Sample CES review: coordinate venue accessibility, barangay outreach, and participant feedback before implementation.',
        };
        $title = sprintf(
            '%s - Barangay %s - Series %02d',
            $project[0],
            $barangay,
            intdiv($i, count($projects)) + 1
        );
        $reviewedAt = $reviewedStatus ? $date($reviewed) : null;
        $ownerId = $partnerIds[$i % count($partnerIds)];
        $collaboratorId = count($partnerIds) > 1 ? $partnerIds[($i + 1) % count($partnerIds)] : null;
        $venue = ($i % 2 === 0)
            ? 'Barangay ' . $barangay . ' multi-purpose hall'
            : 'UCC ' . (($i % 4 === 0) ? 'North' : 'South') . ' Campus outreach venue';

        $proposalInsert->execute([
            $ownerId, $title, $summaries[$i % count($summaries)], $venue,
            $json($proponents[$i % count($proponents)]), $json($projectComponents), $json($costItems),
            round($totalCents / 100, 2), $justifications[$i % count($justifications)],
            sprintf('Residents of Barangay %s, including youth, caregivers and senior citizens; anticipated reach %d-%d residents.', $barangay, 35 + ($i % 5) * 10, 85 + ($i % 4) * 15),
            $outputs[$i % count($outputs)], $risks[$i % count($risks)],
            'Coordination with the barangay council, local service partners and UCC student volunteers; venue and outreach support subject to confirmation.',
            1, ($i % 4 === 0) ? 'auto' : 'manual', $status,
            $periodStart->format('Y-m-d'), $periodEnd->format('Y-m-d'),
            count($scheduledDates) > 0 ? count($scheduledDates) . ' scheduled community outreach days' : mt_rand(4, 12) . ' week community engagement period',
            $reviewNote, $hasBeenSubmitted ? $date($submitted) : null,
            $reviewedStatus ? $adminIds[0] : null, $reviewedAt,
            $date($created), $reviewedStatus ? $reviewedAt : $date($created),
        ]);
        $proposalId = (int) $db->lastInsertId();
        $proposalPartner->execute([$proposalId, $ownerId, 'primary', 'accepted', $date($created)]);
        $collaboratorStatus = null;
        if ($collaboratorId !== null && $collaboratorId !== $ownerId && $i % 3 !== 0) {
            $collaboratorStatus = $i % 5 === 0 ? 'pending' : 'accepted';
            $proposalPartner->execute([$proposalId, $collaboratorId, 'collaborator', $collaboratorStatus, $date($created)]);
        }
        $proposalClassification->execute([$proposalId, 'CES']);
        if (in_array($project[1], ['Education', 'Entrepreneurship', 'Recreation'], true) || $i % 4 === 0) {
            $proposalClassification->execute([$proposalId, 'Student Development']);
        }
        $proposalCategory->execute([$proposalId, $categoryIds[$project[1]]]);
        if ($i % 3 === 0) {
            $additionalCategory = $categories[($i + 4) % count($categories)];
            if ($additionalCategory !== $project[1]) {
                $proposalCategory->execute([$proposalId, $categoryIds[$additionalCategory]]);
            }
        }

        $briefPath = 'uploads/sample-seed/project-brief.pdf';
        $briefCreatedAt = $created->modify('+2 days');
        if ($briefCreatedAt > $now) {
            $briefCreatedAt = $now;
        }
        $document->execute([
            $proposalId, $ownerId, 'project_brief', $briefPath,
            'SAMPLE - ' . $project[0] . ' Project Brief.pdf', 'application/pdf', $sampleFileSizes['project-brief.pdf'],
            'SAMPLE ONLY: fictional local demonstration record, not an official UCC-CES submission.',
            0,
            $date($briefCreatedAt),
        ]);
        if ($hasBeenSubmitted) {
            $signedDocumentCreatedAt = $created->modify('+3 days');
            if ($signedDocumentCreatedAt > $now) {
                $signedDocumentCreatedAt = $now;
            }
            $document->execute([
                $proposalId, $ownerId, 'signed_proposal_letter', 'uploads/sample-seed/signed-moa.pdf',
                'SAMPLE - ' . $project[0] . ' Proposal Letter.pdf', 'application/pdf', $sampleFileSizes['signed-moa.pdf'],
                'SAMPLE ONLY: generic fictional PDF used to exercise the signed-proposal-letter slot; not an authentic endorsement.',
                1, $date($signedDocumentCreatedAt),
            ]);
        }
        if ($i % 3 === 0 && $hasBeenSubmitted) {
            $document->execute([
                $proposalId, $ownerId, 'moa', 'uploads/sample-seed/signed-moa.pdf',
                'SAMPLE - ' . $barangay . ' Partnership Agreement.pdf', 'application/pdf', $sampleFileSizes['signed-moa.pdf'],
                'SAMPLE ONLY: generic fictional demonstration file; not an authentic MOA or partner agreement.',
                1, $date($created->modify('+5 days') > $now ? $now : $created->modify('+5 days')),
            ]);
        }
        if ($i % 2 === 0 && $status !== 'draft') {
            $reportPath = 'uploads/sample-seed/volunteer-report.pdf';
            $reportCreatedAt = $created->modify('+4 days');
            if ($reportCreatedAt > $now) {
                $reportCreatedAt = $now;
            }
            $document->execute([
                $proposalId, $ownerId, 'other', $reportPath,
                'SAMPLE - ' . $barangay . ' Outreach Information.pdf', 'application/pdf', $sampleFileSizes['volunteer-report.pdf'],
                'SAMPLE ONLY: generic fictional PDF reused for demonstration; not this project\'s actual report.',
                0,
                $date($reportCreatedAt),
            ]);
        }

        $logActor = $reviewedStatus ? $adminIds[0] : $ownerId;
        $action = $status === 'draft' ? 'proposal.created' : ($status === 'rejected' ? 'proposal.status_changed' : ($reviewedStatus ? 'proposal.reviewed' : 'proposal.submitted'));
        $log($activityLog, $rolesByUserId, $logActor, $action, 'proposal', $proposalId, ['status'=>$status,'sample_data'=>true], $reviewedStatus ? $reviewedAt : $date($created));
        $notificationInsert->execute([
            $ownerId, 'Sample project ' . str_replace('_', ' ', $status),
            $title . ' has sample status ' . str_replace('_', ' ', $status) . '. This is fictional local demonstration data.',
            null, $reviewedStatus ? $reviewedAt : $date($created),
        ]);

        if ($status !== 'active') {
            continue;
        }

        $eventIndex = count($eventPlans);
        $firstDate = $scheduledDates[0];
        $lastDate = $scheduledDates[count($scheduledDates) - 1];
        $openAt = $firstDate->modify('-30 days')->setTime(8, 0);
        $closeAt = $firstDate->modify('-2 days')->setTime(17, 0);
        $eventCreated = $created->modify('+' . mt_rand(10, 25) . ' days');
        if ($eventCreated > $now) {
            $eventCreated = $now;
        }
        $eventTitle = $eventTypes[$eventIndex % count($eventTypes)] . ' - ' . $barangay;
        $eventInsert->execute([
            $proposalId, $ownerId, $eventTitle,
            'Local sample schedule coordinated with Barangay ' . $barangay . '; activities include inclusive facilitation, community participation and UCC extension follow-up.',
            $venue, 60 + ($eventIndex % 5) * 25, $date($openAt), $date($closeAt), $date($eventCreated),
        ]);
        $eventId = (int) $db->lastInsertId();
        $eventPartner->execute([$eventId, $ownerId, $date($eventCreated)]);
        if ($collaboratorStatus === 'accepted' && $collaboratorId !== null) {
            $eventCollaborator->execute([$eventId, $collaboratorId, $date($eventCreated)]);
        }
        $dateRows = [];
        $firstActivityId = null;
        foreach ($scheduledDates as $dayIndex => $eventDate) {
            $eventDateInsert->execute([$eventId, $eventDate->format('Y-m-d'), hash('sha256', random_bytes(32))]);
            $eventDateId = (int) $db->lastInsertId();
            $dateRows[] = ['id'=>$eventDateId,'date'=>$eventDate];
            for ($activityIndex = 0; $activityIndex < 3; $activityIndex++) {
                $startHour = 8 + $activityIndex * 3;
                $activityVenue = ($eventIndex % 2 === 0)
                    ? 'UCC ' . (($eventIndex % 4 === 0) ? 'North' : 'South') . ' Campus outreach venue'
                    : 'Barangay ' . $barangay . ' multi-purpose hall';
                $activityInsert->execute([
                    $eventDateId, $components[($eventIndex + $dayIndex + $activityIndex) % count($components)],
                    sprintf('%02d:00:00', $startHour), sprintf('%02d:00:00', $startHour + 2),
                    $activityVenue, 35 + ($eventIndex % 6) * 10, 'UCC community extension facilitation team',
                ]);
                if ($firstActivityId === null) {
                    $firstActivityId = (int) $db->lastInsertId();
                }
            }
        }
        foreach ($costItems as $item) {
            $budgetInsert->execute([$proposalId, $firstActivityId, $item['description'], $item['quantity'], $item['cost']]);
        }
        $eventPlans[] = [
            'proposal'=>$proposalId,'event'=>$eventId,'title'=>$eventTitle,'last'=>$lastDate,'owner'=>$ownerId,
            'dates'=>$dateRows,'applications'=>[],
        ];
        $log($activityLog, $rolesByUserId, $ownerId, 'event.created', 'event', $eventId, ['proposal_id'=>$proposalId,'sample_data'=>true], $date($eventCreated));
        $notificationInsert->execute([
            $adminIds[0], 'Sample outreach event scheduled',
            $eventTitle . ' is included in the fictional local schedule.', null, $date($eventCreated),
        ]);
    }

    foreach ($eventPlans as $eventIndex => &$event) {
        $eventStarted = $event['dates'][0]['date'] <= $today;
        $eventFinished = $event['last'] < $today;
        foreach ($volunteerIds as $volunteerIndex => $volunteerId) {
            $appliedAt = $event['dates'][0]['date']
                ->modify('-' . (12 + (($eventIndex + $volunteerIndex) % 16)) . ' days')
                ->setTime(9 + ($volunteerIndex % 6), 15 + ($eventIndex % 40));
            if ($appliedAt > $now) {
                $appliedAt = $now->modify('-' . mt_rand(1, 10) . ' days');
            }
            $status = ($eventStarted || $volunteerIndex === 0) ? 'approved' : 'pending';
            $reviewedAt = $status === 'approved' ? $appliedAt->modify('+' . mt_rand(1, 4) . ' days') : null;
            if ($reviewedAt !== null && $reviewedAt > $now) {
                $reviewedAt = $appliedAt;
            }
            $applicationInsert->execute([
                $event['event'], $volunteerId, $status, $date($appliedAt),
                $status === 'approved' ? $adminIds[0] : null,
                $reviewedAt ? $date($reviewedAt) : null,
            ]);
            $applicationId = (int) $db->lastInsertId();
            $event['applications'][] = ['id'=>$applicationId,'volunteer'=>$volunteerId,'index'=>$volunteerIndex,'status'=>$status];
            $log($activityLog, $rolesByUserId, $volunteerId, 'volunteer.event_applied', 'event_application', $applicationId, ['event_id'=>$event['event'],'status'=>$status,'sample_data'=>true], $date($appliedAt));
            $notificationInsert->execute([
                $volunteerId, 'Sample event application ' . $status,
                'Your fictional demonstration application for ' . $event['title'] . ' is ' . $status . '.',
                null, $date($appliedAt),
            ]);
            if ($status !== 'approved') {
                continue;
            }
            $notificationInsert->execute([
                $event['owner'], 'Sample volunteer registration approved',
                'A demonstration volunteer is approved for ' . $event['title'] . '.',
                null, $date($reviewedAt),
            ]);

            foreach ($event['dates'] as $dayIndex => $eventDateRow) {
                $eventDate = $eventDateRow['date'];
                if ($eventDate > $today) {
                    continue;
                }
                $attendanceStatus = $dayIndex === 0 || (($eventIndex + $dayIndex + $volunteerIndex) % 7 < 5)
                    ? 'present'
                    : ((($eventIndex + $dayIndex + $volunteerIndex) % 2 === 0) ? 'excused' : 'absent');
                $attendanceAt = $eventDate->setTime(8 + ($volunteerIndex % 2), 15 + ($eventIndex % 40));
                $checkedOutAt = $attendanceStatus === 'present' && $eventDate < $today
                    ? $eventDate->setTime(15, 30 + (($eventIndex + $dayIndex + $volunteerIndex) % 30))
                    : null;
                $verificationStatus = $attendanceStatus === 'absent' ? 'pending' : 'verified';
                $attendanceInsert->execute([
                    $applicationId, $eventDateRow['id'], $attendanceStatus,
                    $attendanceStatus === 'present' ? $date($attendanceAt) : null,
                    $checkedOutAt ? $date($checkedOutAt) : null,
                    $verificationStatus,
                    $attendanceStatus === 'present' ? $event['owner'] : $adminIds[0],
                    'SAMPLE attendance record; community dates and participation are fictional.',
                ]);
                $attendanceId = (int) $db->lastInsertId();
                $log(
                    $activityLog, $rolesByUserId,
                    $attendanceStatus === 'present' ? $volunteerId : $adminIds[0],
                    'attendance.recorded', 'attendance', $attendanceId,
                    ['event_id'=>$event['event'],'status'=>$attendanceStatus,'sample_data'=>true],
                    $date($attendanceAt),
                );
                if ($volunteerIndex === 0) {
                    $groups = ['Community residents','Youth participants','Parents and caregivers','Senior citizens','UCC student volunteers'];
                    $groupCount = 3 + (($eventIndex + $dayIndex) % 3);
                    $recordedAt = $eventDate < $today ? $eventDate->setTime(16, 30) : $now;
                    for ($group = 0; $group < $groupCount; $group++) {
                        $participantInsert->execute([
                            $eventDateRow['id'], $groups[($eventIndex + $dayIndex + $group) % count($groups)],
                            mt_rand(12, 58), $adminIds[0], $date($recordedAt),
                        ]);
                    }
                }
            }

            if (!$eventFinished) {
                continue;
            }
            $rating = 3 + (($eventIndex + $volunteerIndex) % 3);
            $evaluationAt = $event['last']->modify('+2 days')->setTime(10 + $volunteerIndex, 15);
            $volunteerEvaluationInsert->execute([
                $event['event'], $volunteerId, $rating,
                $feedback[($eventIndex + $volunteerIndex) % count($feedback)], $date($evaluationAt),
            ]);
            $eventEvaluationId = (int) $db->lastInsertId();
            $evaluationInsert->execute([
                $event['proposal'], $volunteerId, $rating,
                $feedback[($eventIndex + $volunteerIndex + 1) % count($feedback)], $date($evaluationAt),
            ]);
            $log($activityLog, $rolesByUserId, $volunteerId, 'volunteer.evaluation_submitted', 'evaluation', $eventEvaluationId, ['event_id'=>$event['event'],'rating'=>$rating,'sample_data'=>true], $date($evaluationAt));

            $certificateAt = $event['last']->modify('+3 days')->setTime(11, 0);
            $certificateInsert->execute([
                $event['event'], $volunteerId, 'uploads/sample-seed/volunteer-certificate.pdf', $date($certificateAt),
            ]);
            $certificateId = (int) $db->lastInsertId();
            $log($activityLog, $rolesByUserId, $event['owner'], 'certificate.issued', 'certificate', $certificateId, ['event_id'=>$event['event'],'sample_data'=>true], $date($certificateAt));
            $notificationInsert->execute([
                $volunteerId, 'Sample volunteer certificate issued',
                'A fictional demonstration certificate is listed for ' . $event['title'] . '.',
                null, $date($certificateAt),
            ]);
        }
        if ($eventFinished) {
            foreach ([
                ['report', 'volunteer-report.pdf', 'Activity Report'],
                ['accomplishment', 'project-brief.pdf', 'Accomplishment Summary'],
            ] as $documentationIndex => [$type, $filename, $label]) {
                $uploadedAt = $event['last']->modify('+' . (3 + $documentationIndex) . ' days')->setTime(12, 0);
                $eventDocumentationInsert->execute([
                    $event['event'], $event['owner'], $type, 'uploads/sample-seed/' . $filename,
                    'SAMPLE - ' . $event['title'] . ' ' . $label . '.pdf', 'application/pdf',
                    $sampleFileSizes[$filename],
                    'SAMPLE ONLY: generic fictional demonstration PDF; it is not a report or evidence from a real event.',
                    $date($uploadedAt),
                ]);
            }
        }
        unset($event);
    }

    $documentationTypes = ['report','accomplishment','other'];
    foreach ($volunteerIds as $volunteerIndex => $volunteerId) {
        for ($i = 0; $i < 22; $i++) {
            $createdAt = $today->modify('-' . mt_rand(5, 180) . ' days')->setTime(9 + ($i % 8), ($i * 7) % 60);
            $documentationInsert->execute([
                $volunteerId, $documentationTypes[($i + $volunteerIndex) % count($documentationTypes)],
                'uploads/sample-seed/volunteer-report.pdf',
                sprintf('SAMPLE - Volunteer %02d Community Outreach Documentation.pdf', $i + 1),
                'application/pdf', $sampleFileSizes['volunteer-report.pdf'],
                'SAMPLE ONLY: fictional demonstration; this generic PDF contains no actual service or participant records.',
                $date($createdAt),
            ]);
        }
    }

    $budgetMismatches = (int) $db->query(
        'SELECT COUNT(*) FROM (
            SELECT p.id FROM proposals p JOIN budget_items b ON b.proposal_id=p.id
            GROUP BY p.id,p.total_estimated_cost
            HAVING ABS(p.total_estimated_cost-SUM(b.quantity*b.unit_cost))>0.01
        ) mismatches'
    )->fetchColumn();
    $orphanApplications = (int) $db->query(
        'SELECT COUNT(*) FROM event_applications a
         LEFT JOIN volunteer_profiles v ON v.user_id=a.volunteer_user_id
         LEFT JOIN events e ON e.id=a.event_id
         WHERE v.user_id IS NULL OR e.id IS NULL'
    )->fetchColumn();
    $orphanAttendance = (int) $db->query(
        'SELECT COUNT(*) FROM attendance a
         LEFT JOIN event_applications ea ON ea.id=a.application_id
         LEFT JOIN event_dates d ON d.id=a.event_date_id
         WHERE ea.id IS NULL OR d.id IS NULL OR ea.event_id<>d.event_id'
    )->fetchColumn();
    $orphanEventDocumentation = (int) $db->query(
        'SELECT COUNT(*) FROM event_documentations d
         LEFT JOIN events e ON e.id=d.event_id
         LEFT JOIN users u ON u.id=d.uploaded_by
         WHERE e.id IS NULL OR u.id IS NULL'
    )->fetchColumn();
    $eventsForNonActiveProposals = (int) $db->query(
        "SELECT COUNT(*) FROM events e
         JOIN proposals p ON p.id=e.proposal_id
         WHERE p.status<>'active'"
    )->fetchColumn();
    $invalidAttendanceTimes = (int) $db->query(
        "SELECT COUNT(*) FROM attendance
         WHERE checked_out_at IS NOT NULL
           AND (scanned_at IS NULL OR checked_out_at < scanned_at OR status <> 'present')"
    )->fetchColumn();
    if ($budgetMismatches !== 0 || $orphanApplications !== 0 || $orphanAttendance !== 0 ||
        $orphanEventDocumentation !== 0 || $eventsForNonActiveProposals !== 0 || $invalidAttendanceTimes !== 0) {
        throw new RuntimeException('Seed validation failed: budget totals, event workflow, documentation, or volunteer relationships do not match.');
    }

    $uploadRoot = realpath($sampleDirectory);
    if ($uploadRoot === false) {
        throw new RuntimeException('The sample upload directory is not available.');
    }
    $storedPaths = $db->query(
        'SELECT relative_path FROM documents
         UNION ALL SELECT relative_path FROM certificates
         UNION ALL SELECT relative_path FROM volunteer_documentations
         UNION ALL SELECT relative_path FROM event_documentations'
    )->fetchAll(PDO::FETCH_COLUMN);
    foreach ($storedPaths as $relativePath) {
        if (!is_string($relativePath) || !str_starts_with($relativePath, 'uploads/sample-seed/')) {
            throw new RuntimeException('A seeded file record does not use the local sample-data directory.');
        }
        $filename = substr($relativePath, strlen('uploads/sample-seed/'));
        $filePath = realpath($uploadRoot . DIRECTORY_SEPARATOR . $filename);
        if ($filePath === false || !str_starts_with($filePath, $uploadRoot . DIRECTORY_SEPARATOR) || !is_file($filePath)) {
            throw new RuntimeException('A seeded sample file is missing from local upload storage.');
        }
    }

    $db->commit();
} catch (Throwable $exception) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    throw $exception;
}

$usersAfter = $db->query('SELECT * FROM users ORDER BY id')->fetchAll();
$partnersAfter = $db->query('SELECT * FROM partners ORDER BY user_id')->fetchAll();
$volunteersAfter = $db->query('SELECT * FROM volunteer_profiles ORDER BY user_id')->fetchAll();
if ($fingerprint($usersAfter) !== $userFingerprint ||
    $fingerprint($partnersAfter) !== $partnerFingerprint ||
    $fingerprint($volunteersAfter) !== $volunteerFingerprint) {
    throw new RuntimeException('A protected account or linked profile changed during seeding.');
}

$tables = [
    'users','partners','volunteer_profiles','sectors','subcategories','partner_subcategories','categories','proposals',
    'proposal_classifications','proposal_categories','proposal_partners','documents','events','event_partners','event_dates',
    'activities','event_applications','attendance','budget_items','evaluations','participant_counts','certificates',
    'volunteer_event_evaluations','volunteer_documentations','event_documentations','password_reset_otps','notifications','activity_logs',
];
$counts = [];
foreach ($tables as $table) {
    $statement = $db->query('SELECT COUNT(*) FROM `' . $table . '`');
    $counts[$table] = (int) $statement->fetchColumn();
}

fwrite(STDOUT, "Sample data refresh completed. Users, partner profiles, and volunteer profiles were preserved.\n");
foreach ($counts as $table => $count) {
    fwrite(STDOUT, sprintf("%-30s %d\n", $table, $count));
}
fwrite(STDOUT, "Budget-total mismatches: 0\n");
fwrite(STDOUT, "Orphaned applications/attendance: 0\n");
fwrite(STDOUT, "Invalid attendance time-outs: 0\n");
