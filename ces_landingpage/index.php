<?php
  $page_title  = "Community Extension Services — University of Caloocan City";
  $current_year = date("Y");
  $script_path = str_replace("\\", "/", $_SERVER["SCRIPT_NAME"] ?? "");
  $project_base = rtrim(dirname(dirname($script_path)), "/.");
  $landing_url = $project_base . "/ces_landingpage";
  $portal_url = $project_base . "/portal";
  $login_url = $project_base . "/login";

  // ── Event data (add more entries here later) ──────────────────────────────
  $events = [
    [
      "id"      => "ev1",
      "image"   => $landing_url . "/assets/images/event1.jpg",
      "tag"     => "University News",
      "tag_color" => "blue",
      "title"   => "Final Day of ALCUCOA Accreditation at UCC Main Campus",
      "date"    => "2024",
      "location"=> "UCC Main Campus, Caloocan City",
      "excerpt" => "The final day of the ALCUCOA accreditation was successfully conducted at UCC Main Campus, marking a major milestone for the university's academic programs.",
      "full"    => "The Association of Local Colleges and Universities Commission on Accreditation (ALCUCOA) conducted its final accreditation visit at the University of Caloocan City Main Campus. Faculty, administrators, and staff came together to present the university's achievements, programs, and community involvement — reflecting UCC's commitment to quality education and community service. The successful accreditation affirms UCC's dedication to providing world-class education to the people of Caloocan City.",
      "hashtags"=> ["#UCC", "#ALCUCOA", "#QualityEducation"],
    ],
    [
      "id"        => "ev2",
      "image"     => $landing_url . "/assets/images/event2.jpg",
      "tag"       => "Partnership",
      "tag_color" => "green",
      "title"     => "UCC and GET International Unite for Academic Excellence, Research Innovation, and International Opportunities",
      "date"      => "2025",
      "location"  => "University of Caloocan City, Main Campus",
      "excerpt"   => "The University of Caloocan City strengthened its commitment to academic excellence and global collaboration through the signing of a Memorandum of Agreement with the Guild of Educators in TESOL – International (GET International).",
      "full"      => "The University of Caloocan City (UCC) strengthened its commitment to academic excellence and global collaboration through the signing of a Memorandum of Agreement with the Guild of Educators in TESOL – International (GET International).\n\nEstablished in 2017, GET International has been at the forefront of enhancing educational quality through teacher training, professional development, and international collaboration. Through its TESOL programs, research initiatives, and multidisciplinary conferences, the organization promotes innovation, scholarly excellence, and global competencies — objectives that strongly align with UCC's commitment to producing globally competitive graduates, strengthening research culture, and expanding international opportunities for its academic community.\n\nThe partnership was made possible through the support and leadership of:\n• Hon. Dale Gonzalo Malapit an – Chairman, Board of Regents\n• Atty. Jessamyn Jared S. Nas – Officer-in-Charge, University of Caloocan City\n• Dr. Bernadette B. Enriquez, CESE – Vice President for Research and Extension Services\n• Dr. Wenald H. Lopez – Vice President for Academic Affairs\n• Dr. Ramona Prado – Vice President for Quality Assurance\n\nThis MOA reflects the collective effort in promoting strategic partnerships for innovation, institutional growth, and global engagement.",
      "hashtags"  => ["#BeWISE", "#UniversityOfCaloocanCity", "#GETInternational", "#MOA", "#AcademicExcellence"],
    ],
    [
      "id"        => "ev3",
      "image"     => $landing_url . "/assets/images/event3.jpg",
      "tag"       => "Partnership",
      "tag_color" => "green",
      "title"     => "BJMP–Caloocan & UCC Seal Partnership for Stronger Community Extension Services",
      "date"      => "Nobyembre 21, 2025 | Biyernes",
      "location"  => "University of Caloocan City, Main Campus",
      "excerpt"   => "JSUPT Ellen B. Barrios, Warden ng Caloocan City Jail, dumalo sa Ceremonial Signing ng MOA para sa Community Extension Services sa UCC — isang hakbang patungo sa mas inklusibong serbisyo para sa komunidad at sa mga PDL.",
      "full"      => "Bilang pagpapalakas ng ugnayang pangkomunidad at pagpapalawig ng serbisyong publiko, dumalo si JSUPT ELLEN B BARRIOS, DSC, Warden ng Caloocan City Jail, sa Ceremonial Signing of the Memorandum of Agreement (MOA) para sa Community Extension Services na ginanap noong Nobyembre 21, 2025 sa University of Caloocan City (UCC).\n\nLayunin ng kasunduang ito na higit pang pag-ibayuhin ang mga programang pangkomunidad sa lungsod, partikular ang pagbibigay ng mas malawak na oportunidad para sa mga Batang Kankaloo at sa mga Persons Deprived of Liberty (PDL) sa pamamagitan ng edukasyon, livelihood, skills training, at iba pang programa.\n\nPinangunahan ang MOA Signing nina:\n• Atty. Jared Nas – Officer-In-Charge, University of Caloocan City\n• Engr. Wenald H. Lopez – VP for Academic Affairs\n• Dr. Eloisa P. Mackay – AVP for Administration\n• Dr. Janette Aguilar – AVP for Community Extension Services\n\nKasama rin ni JSUPT BARRIOS ang mga kinatawan mula sa Caloocan City Jail: SJO2 Annielyn P. Miano, JO1 Melannie M. Frigenal, at JO1 Ricky A. Gabo — na aktibong katuwang sa pagpapaunlad ng Livelihood Program at Community Relation Services (CRS) ng BJMP-Caloocan.\n\nTampok sa bagong partnership ang pagbuo ng mas sistematikong community extension projects, pagpapalawak ng academic engagements, at pagsuporta sa produktibong rehabilitasyon ng mga PDL. Kasama rin na dumalo ang iba't ibang community partners ng UCC tulad ng PNP-Caloocan, DENR-NCR, Barangays, Business Owners, at marami pang iba.",
      "hashtags"  => ["#ChangingLivesBuildingASaferNation", "#ILoveBJMP", "#SerbisyongMakaDiyosAtMakatao", "#AksyonAtMalasakit", "#UCC", "#CES"],
    ],
    [
      "id"        => "ev4",
      "image"     => $landing_url . "/assets/images/event4.jpg",
      "tag"       => "University News",
      "tag_color" => "blue",
      "title"     => "UCC BS Psychology Holds Aeta Community Immersion to Strengthen Cultural Awareness and Community Engagement",
      "date"      => "February 13, 2026",
      "location"  => "Sitio San Martin, Brgy. Sto. Niño, Bamban, Tarlac",
      "excerpt"   => "The University of Caloocan City conducted its annual Aeta Community Immersion, providing BS Psychology students firsthand exposure to indigenous communities to deepen cultural sensitivity and social awareness.",
      "full"      => "Reaffirming its commitment to experiential learning and meaningful community partnerships, the University of Caloocan City (UCC) conducted its annual Aeta Community Immersion on February 13, 2026, at Sitio San Martin, Barangay Sto. Niño, Bamban, Tarlac. The initiative was spearheaded by the Bachelor of Science in Psychology program under the College of Liberal Arts and Sciences (CLAS).\n\nWith the guidance of CLAS Dean, Dr. Bernadette B. Enriquez, the annual immersion aims to provide Psychology students with firsthand exposure to indigenous communities to deepen cultural sensitivity, social awareness, and community engagement. Professors, faculty members, and program coordinators from the BS Psychology program, along with faculty representatives from allied programs, were present throughout the activity.\n\nThrough personal interviews and meaningful conversations with members of the Aeta community, students gained valuable insights into their cultural identity, traditions, and daily life. Indigenous Peoples Mandatory Representative (IPMR) Junjun Tolentino highlighted the tribe's profound connection to their ancestral land, which they regard as a sacred inheritance passed down through generations. He emphasized that leadership within the community demands dedication to service, resilience, and responsiveness to the needs of fellow members despite prevailing challenges.\n\nThe immersion also underscored the importance of education and youth empowerment in sustaining long-term community development. While traditional livelihoods such as farming, fishing, hunting, and trading agricultural produce remain central to the Aetas' way of life, some community members have gradually entered various sectors of the workforce and continue to pursue formal education.\n\nAs one of UCC's flagship community engagement and extension initiatives, the activity reflects the broader mission of fostering socially responsive and culturally aware graduates. By bridging classroom instruction with lived community experiences, the program strengthens the University's institutional commitment to inclusive education, outreach, and nation-building.",
      "hashtags"  => ["#UCC", "#BSPsychology", "#CLAS", "#AetaImmersion", "#CommunityEngagement", "#CulturalAwareness"],
    ],
    [
      "id"      => "ev5",
      "image"   => $landing_url . "/assets/images/event5.jpg",
      "tag"     => "Environment",
      "tag_color" => "teal",
      "title"   => "UCC Joins 41st International Coastal Cleanup 2026",
      "date"    => "September 19, 2026",
      "location"=> "Manila Bay Dolomite Beach, Roxas Boulevard, Manila",
      "excerpt" => "University of Caloocan City, through CES and in coordination with DENR, participated in the 41st International Coastal Cleanup at Manila Bay.",
      "full"    => "𝐔𝐍𝐈𝐕𝐄𝐑𝐒𝐈𝐓𝐘 𝐎𝐅 𝐂𝐀𝐋𝐎𝐎𝐂𝐀𝐍 𝐂𝐈𝐓𝐘, 𝐍𝐀𝐊𝐈𝐈𝐒𝐀 𝐒𝐀 𝟒𝟏𝐒𝐓 𝐈𝐍𝐓𝐄𝐑𝐍𝐀𝐓𝐈𝐎𝐍𝐀𝐋 𝐂𝐎𝐀𝐒𝐓𝐀𝐋 𝐂𝐋𝐄𝐀𝐍𝐔𝐏\n\nNgayong araw ay nakiisa ang University of Caloocan City sa pamamagitan ng Community Extension Services at pakikipag-ugnayan sa Department of Environment and Natural Resources (DENR) sa 41st International Coastal Clean Up na ginanap sa Manila Bay.\n\nHigit pa sa simpleng paglilinis, layunin ng gawaing ito na mapanatiling malinis ang ating mga baybayin, mabawasan ang marine litter, maprotektahan ang marine ecosystems, at mapalawak ang kamalayan ng komunidad sa kahalagahan ng pangangalaga sa karagatan.\n\nBilang isang pamantasang nakatuon sa paglilingkod sa komunidad, patuloy na isinusulong ng UCC ang mga gawaing nagtataguyod ng environmental awareness, volunteerism, at collective action para sa isang mas malinis, mas ligtas, at mas sustainable na kinabukasan.",
      "hashtags"=> ["#BeWISE", "#UniversityOfCaloocanCity", "#41stInternationalCoastalCleanUp"],
    ],
    [
      "id"      => "ev6",
      "image"   => $landing_url . "/assets/images/event6.jpg",
      "tag"     => "University News",
      "tag_color" => "blue",
      "title"   => "Benchmarking Delegation Visit: University of Caloocan City and University of Makati",
      "date"    => "September 9, 2025",
      "location"=> "University of Makati (UMak), Makati City",
      "excerpt" => "UCC conducted a benchmarking visit at UMak focused on the BS Nursing program and key institutional best practices, with vice presidents, deans, directors, and program heads from both universities.",
      "full"    => "Pursuant to the directive of Hon. Dale Gonzalo \"Along\" R. Malapit an, City Mayor and Chairman of the Board of Regents of the University of Caloocan City (UCC), and under the guidance of Atty. Jessamyn Jared S. Nas, Officer-in-Charge of UCC, the University conducted a benchmarking activity on September 9, 2025, at the University of Makati (UMak). The undertaking focused on the Bachelor of Science in Nursing program and key institutional practices, with the active participation of vice presidents, deans, directors, and program heads from both universities.\n\nThe exchange highlighted strategies in:\n• Quality assurance and academic program implementation\n• Human resource management\n• Registrar services, admissions, and scholarships\n• Research and community extension\n\nUMak, known as the \"University of Many 1sts and Beyond,\" shared best practices in nursing education, faculty appointments and workload, student admission and retention, research integration, and its partnerships with hospitals and communities. Institutional offices likewise presented their streamlined processes, including digital transactions, ISO certification, and ranking initiatives — valuable references for UCC as it prepares to expand its health sciences and allied programs.\n\nBeyond the technical exchange, the activity underscored the commitment of both universities to foster excellence, innovation, and service. This partnership affirms their shared vision of producing competent, service-driven graduates responsive to societal and global demands.",
      "hashtags"=> ["#UCC", "#UMak", "#Benchmarking", "#BSNursing", "#AcademicExcellence", "#BeWISE", "#UniversityOfCaloocanCity"],
    ],
    [
      "id"      => "ev7",
      "image"   => $landing_url . "/assets/images/event7.jpg",
      "tag"     => "Education",
      "tag_color"=> "orange",
      "title"   => "UCC Library Outreach: Igniting Young Minds Through the Magic of Storytelling",
      "date"    => "2024",
      "location"=> "Barangay 176-A & 176-D, Caloocan City",
      "excerpt" => "As we turn the last page of UCC Library 2024, the Library Outreach Program brought storytelling to life — inspiring young minds, igniting imaginations, and advocating for the love of reading, one page at a time.",
      "full"    => "As we turn the last page of the book of UCC Library 2024, the University of Caloocan City Community Extension Services, in partnership with the UCC Library, brought the magic of stories directly to the community through its Library Outreach Program.\n\nThe program centered on interactive storytelling sessions that sparked curiosity, nurtured a love for reading, and ignited the imaginations of young children in the community. By making books and stories accessible beyond the walls of the university, CES reaffirmed its commitment to education as a powerful tool for community empowerment.\n\nThis meaningful initiative was made possible through the collective support of:\n📚 Barangay 176-A — officials and community\n📚 Barangay 176-D — officials and community\n📚 Caloocan City Government\n📚 UCC Student Association of Books and Library Advocates – South Campus\n📚 UCC Student Association of Books and Library Advocates – North Campus\n📚 University of Caloocan City\n📚 UCC Community Extension Services\n📚 MEG \"ALONG\" LIFE Club Movement\n📚 UCC Library Staff and Librarians\n📚 Our dedicated storytellers\n\nEvery story shared is a seed planted — one that grows into lifelong curiosity, confidence, and a passion for learning. The UCC Library Outreach Program is a testament to what becomes possible when a university truly serves its community.",
      "hashtags"=> ["#storytelling", "#libraryoutreach", "#ReadingAdventures", "#UCC", "#CES", "#EducationForAll"],
    ],
  ];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php echo htmlspecialchars($page_title); ?></title>
  <link rel="stylesheet" href="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
</head>
<body>

  <!-- ========== NAVBAR ========== -->
  <header class="navbar" id="navbar">
    <div class="nav-container">
      <a href="#home" class="nav-brand">
        <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/ucc-logo.png"
             alt="University of Caloocan City Logo"
             class="nav-logo-img" />
        <div class="nav-brand-text">
          <span class="brand-title">University of Caloocan City</span>
          <span class="brand-sub">Community Extension Services</span>
        </div>
      </a>

      <nav class="nav-links" id="navLinks">
        <?php
          $nav_items = [
            "#home"      => "Home",
            "#about"     => "About CES",
            "#programs"  => "Programs",
            "#partners"  => "Community Partners",
            "#volunteer" => "Volunteer",
            "#contact"   => "Contact",
          ];
          foreach ($nav_items as $href => $label):
        ?>
          <a href="<?php echo $href; ?>" class="nav-link"><?php echo $label; ?></a>
        <?php endforeach; ?>
      </nav>

      <div class="nav-actions">
        <a href="<?php echo htmlspecialchars($login_url, ENT_QUOTES, 'UTF-8'); ?>" class="btn-signin"><i class="fas fa-sign-in-alt"></i> Sign In</a>
        <a href="<?php echo htmlspecialchars($portal_url, ENT_QUOTES, 'UTF-8'); ?>" class="btn-join">Open Portal</a>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <!-- ========== HERO ========== -->
  <section class="hero" id="home">
    <div class="hero-bg-img">
      <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event4.jpg" alt="" aria-hidden="true" />
    </div>
    <div class="hero-overlay"></div>

    <div class="hero-content">
      <span class="hero-tag">Community Extension Services</span>
      <h1 class="hero-title">
        Empowering Communities.<br />
        <span class="highlight">Creating Meaningful Change.</span>
      </h1>
      <p class="hero-desc">
        The University of Caloocan City Community Extension Services provides opportunities
        for students, faculty, and community partners to work together through meaningful
        service, collaboration, and community-related activities.
      </p>
      <div class="hero-cta">
        <a href="#programs" class="btn-primary">Explore Our Programs <i class="fas fa-arrow-right"></i></a>
        <a href="#partners" class="btn-outline">Partner With UCC</a>
      </div>
    </div>

    <div class="hero-image">
      <div class="hero-card">
        <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event4.jpg"
             alt="UCC CES Community Outreach"
             class="hero-card-img"
             onerror="this.parentElement.classList.add('hero-card-fallback');this.remove();" />
      </div>
    </div>

    <div class="hero-scroll-indicator">
      <span>Scroll Down</span>
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>

  <!-- ========== ABOUT CES ========== -->
  <section class="about" id="about">
    <div class="container">
      <div class="about-grid">

        <div class="about-text" data-animate="fade-left">
          <span class="section-tag">About CES</span>
          <h2 class="section-title">Community Extension Services</h2>
          <p>
            The University of Caloocan City Community Extension Services (UCC CES) is the
            office mandated to design, implement, and evaluate extension programs that
            respond to the needs of the communities in Caloocan City and beyond.
          </p>
          <p>
            We connect the university with the community — mobilizing students, faculty,
            and staff to actively participate in outreach, partnerships, and civic
            engagements that create lasting, meaningful impact.
          </p>
          <div class="about-quick-stats">
            <div class="about-qstat">
              <i class="fas fa-calendar-check"></i>
              <div>
                <strong>Est. 1971</strong>
                <span>Years of Service</span>
              </div>
            </div>
            <div class="about-qstat">
              <i class="fas fa-map-marker-alt"></i>
              <div>
                <strong>Caloocan City</strong>
                <span>Primary Service Area</span>
              </div>
            </div>
            <div class="about-qstat">
              <i class="fas fa-university"></i>
              <div>
                <strong>UCC Main & South</strong>
                <span>Campus Coverage</span>
              </div>
            </div>
          </div>
          <a href="#highlights" class="btn-link">See Our Activities <i class="fas fa-arrow-right"></i></a>
        </div>

        <div class="about-what" data-animate="fade-right">
          <h4 class="about-what-title">What CES Does</h4>
          <?php
            $ces_services = [
              ["icon" => "fa-hands-helping",   "color" => "green", "title" => "Community Outreach",      "text" => "Organized outreach programs that bring direct assistance, training, and resources to underserved communities in Caloocan."],
              ["icon" => "fa-file-signature",  "color" => "teal",  "title" => "Institutional Partnerships","text" => "MOAs and MOUs with LGUs, NGOs, BJMP, DENR, barangays, schools, and private sector organizations to co-implement programs."],
              ["icon" => "fa-chalkboard-teacher","color" => "olive","title" => "Capacity Building",       "text" => "Skills training, livelihood programs, and educational activities that empower community members and student volunteers alike."],
              ["icon" => "fa-leaf",            "color" => "green", "title" => "Environmental Programs",   "text" => "Environmental awareness drives and coastal cleanup activities in coordination with DENR and partner institutions."],
            ];
            foreach ($ces_services as $svc):
          ?>
            <div class="about-card">
              <div class="about-card-icon <?php echo $svc['color']; ?>">
                <i class="fas <?php echo $svc['icon']; ?>"></i>
              </div>
              <div>
                <h4><?php echo $svc['title']; ?></h4>
                <p><?php echo $svc['text']; ?></p>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

      </div>
    </div>
  </section>

  <!-- ========== VISION & MISSION ========== -->
  <section class="vision" id="vision">
    <div class="vision-bg"></div>
    <div class="container">
      <div class="section-header center" data-animate="fade-up">
        <span class="section-tag light">Vision &amp; Mission</span>
        <h2 class="section-title light">What Drives Us</h2>
      </div>
      <div class="vision-grid">
        <div class="vision-card" data-animate="fade-up" data-delay="100">
          <div class="vision-icon"><i class="fas fa-eye"></i></div>
          <h3>Vision</h3>
          <p>
            It is envisioned that the people of the community in Caloocan City, the main focus of the
            University's Extension Services Program, can be uplifted from helplessness to self-reliance,
            from indifference to positive involvement, and from helplessness to commitment.
          </p>
          <p class="vision-italic">
            This shall be realized through the effective implementation of the University's Extension Service Program.
          </p>
        </div>
        <div class="vision-card" data-animate="fade-up" data-delay="200">
          <div class="vision-icon"><i class="fas fa-rocket"></i></div>
          <h3>Mission</h3>
          <p>
            To facilitate awareness and understanding among the students on the community where they belong
            by providing opportunities in a community-related activity that fosters engagement that
            contributes transformation of society.
          </p>
          <p>
            Community extension services aims to develop well-rounded individuals who are socially responsible,
            culturally aware, and actively engaged in building a better community.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ========== GOALS ========== -->
  <section class="goals" id="goals">
    <div class="container">
      <div class="section-header center" data-animate="fade-up">
        <span class="section-tag">Our Goals</span>
        <h2 class="section-title">What We Aim to Achieve</h2>
        <p class="section-desc">Community Extension Services aims to build a bridge between the university and the communities it serves.</p>
      </div>
      <div class="goals-grid">
        <?php
          $goals = [
            ["icon" => "fa-graduation-cap", "title" => "Practical Experience",    "text" => "Provide practical experience among the students through various community services projects."],
            ["icon" => "fa-brain",          "title" => "Life Skills Development", "text" => "Aid in student's personal growth and life skills such as leadership, collaboration, communication, problem solving and critical thinking skills."],
            ["icon" => "fa-handshake",      "title" => "Social Responsibility",   "text" => "Promote social responsibility and community services commitment through participation in community-related activities."],
            ["icon" => "fa-network-wired",  "title" => "Build Connections",       "text" => "Build connections to students, professionals, and leaders which are beneficial for their future career."],
            ["icon" => "fa-globe-asia",     "title" => "Cultural Understanding",  "text" => "Promote cultural understanding to students through experiences as they will gain broadened perspectives regarding community issues."],
          ];
          foreach ($goals as $i => $goal):
        ?>
          <div class="goal-item" data-animate="fade-up" data-delay="<?php echo $i * 100; ?>">
            <div class="goal-icon"><i class="fas <?php echo $goal['icon']; ?>"></i></div>
            <h4><?php echo $goal['title']; ?></h4>
            <p><?php echo $goal['text']; ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- ========== PROGRAMS ========== -->
  <section class="programs" id="programs">
    <div class="container">
      <div class="programs-header" data-animate="fade-left">
        <div>
          <span class="section-tag">Featured Programs</span>
          <h2 class="section-title">Community Programs</h2>
          <p>We implement various programs that address community needs and create lasting impact.</p>
        </div>
        <a href="#" class="btn-primary-outline">View All Programs <i class="fas fa-arrow-right"></i></a>
      </div>
      <div class="programs-grid">
        <?php
          $programs = [
            ["color" => "edu",    "icon" => "fa-book-open", "tag" => "Education",   "title" => "Education &amp; Literacy",        "text" => "Learning support and educational activities for community beneficiaries."],
            ["color" => "health", "icon" => "fa-heartbeat", "tag" => "Health",      "title" => "Health &amp; Wellness",            "text" => "Community health awareness, assistance, and outreach initiatives."],
            ["color" => "env",    "icon" => "fa-leaf",      "tag" => "Environment", "title" => "Environment &amp; Sustainability", "text" => "Programs that encourage environmental responsibility and awareness."],
            ["color" => "dev",    "icon" => "fa-city",      "tag" => "Community",   "title" => "Community Development",            "text" => "Skills, livelihood, and capacity-building activities for local communities."],
          ];
          foreach ($programs as $i => $prog):
        ?>
          <div class="program-card" data-animate="fade-up" data-delay="<?php echo $i * 100; ?>">
            <div class="program-img <?php echo $prog['color']; ?>">
              <i class="fas <?php echo $prog['icon']; ?>"></i>
            </div>
            <div class="program-body">
              <span class="program-tag"><?php echo $prog['tag']; ?></span>
              <h4><?php echo $prog['title']; ?></h4>
              <p><?php echo $prog['text']; ?></p>
              <a href="#" class="btn-link small">Learn More <i class="fas fa-arrow-right"></i></a>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- ========== IMPACT STATS ========== -->
  <section class="impact">
    <div class="impact-left">
      <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event5.jpg"
           alt="UCC CES Coastal Cleanup"
           class="impact-real-img"
           onerror="this.parentElement.innerHTML='<div class=\'impact-img-placeholder\'><i class=\'fas fa-people-carry\'></i><p>UCC CES in Action</p></div>';" />
    </div>
    <div class="impact-right">
      <span class="section-tag light">Our Impact</span>
      <h2 class="impact-title">Making Service More Organized.<br /><span>Making Impact More Visible.</span></h2>
      <div class="stats-grid">
        <?php
          $stats = [
            ["icon" => "fa-tasks",    "target" => 12,   "suffix" => "",  "label" => "Active Projects"],
            ["icon" => "fa-users",    "target" => 245,  "suffix" => "",  "label" => "Volunteers"],
            ["icon" => "fa-building", "target" => 11,   "suffix" => "",  "label" => "Community Partners"],
            ["icon" => "fa-heart",    "target" => 2800, "suffix" => "+", "label" => "Beneficiaries"],
          ];
          foreach ($stats as $stat):
        ?>
          <div class="stat-item" data-animate="count-up">
            <div class="stat-icon"><i class="fas <?php echo $stat['icon']; ?>"></i></div>
            <span class="stat-number" data-target="<?php echo $stat['target']; ?>" data-suffix="<?php echo $stat['suffix']; ?>">0</span>
            <span class="stat-label"><?php echo $stat['label']; ?></span>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- ========== HIGHLIGHTS / GALLERY ========== -->
  <section class="highlights" id="highlights">
    <div class="container">
      <div class="section-header center" data-animate="fade-up">
        <span class="section-tag">Community in Action</span>
        <h2 class="section-title">Event Highlights</h2>
        <p class="section-desc">
          Real moments, real impact. Click any photo to learn more about each activity.
        </p>
      </div>

      <!-- Filter tabs -->
      <div class="hl-filters" data-animate="fade-up" data-delay="100">
        <button class="hl-filter active" data-filter="all">All</button>
        <button class="hl-filter" data-filter="university-news">University News</button>
        <button class="hl-filter" data-filter="partnership">Partnership</button>
        <button class="hl-filter" data-filter="education">Education</button>
        <button class="hl-filter" data-filter="environment">Environment</button>
      </div>

      <!-- Masonry-style gallery grid -->
      <div class="hl-grid">
        <?php foreach ($events as $i => $ev):
          $filter_class = strtolower(str_replace(' ', '-', $ev['tag']));
        ?>
          <article class="hl-card"
                   data-filter="<?php echo $filter_class; ?>"
                   data-event="<?php echo $ev['id']; ?>"
                   data-animate="fade-up"
                   data-delay="<?php echo ($i % 3) * 120; ?>"
                   tabindex="0"
                   role="button"
                   aria-label="View details: <?php echo htmlspecialchars($ev['title']); ?>">

            <div class="hl-card-img-wrap">
              <img src="<?php echo htmlspecialchars($ev['image'], ENT_QUOTES, 'UTF-8'); ?>"
                   alt="<?php echo htmlspecialchars($ev['title']); ?>"
                   loading="lazy"
                   onerror="this.parentElement.classList.add('img-error');this.style.display='none';" />
              <div class="hl-card-overlay">
                <span class="hl-read-more">
                  <i class="fas fa-expand-alt"></i> View Details
                </span>
              </div>
              <span class="hl-badge <?php echo $ev['tag_color']; ?>"><?php echo $ev['tag']; ?></span>
            </div>

            <div class="hl-card-body">
              <h4><?php echo htmlspecialchars($ev['title']); ?></h4>
              <p class="hl-meta">
                <i class="fas fa-calendar-alt"></i> <?php echo $ev['date']; ?>
                &nbsp;&nbsp;<i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars($ev['location']); ?>
              </p>
              <p class="hl-excerpt"><?php echo htmlspecialchars($ev['excerpt']); ?></p>
              <span class="btn-link small">Read More <i class="fas fa-arrow-right"></i></span>
            </div>
          </article>
        <?php endforeach; ?>
      </div><!-- /.hl-grid -->
    </div>
  </section>

  <!-- ========== EVENT DETAIL MODAL ========== -->
  <div class="modal-backdrop" id="eventModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" hidden>
    <div class="modal-box">
      <button class="modal-close" id="modalClose" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>

      <div class="modal-img-wrap">
        <img src="" alt="" id="modalImg" />
        <span class="hl-badge" id="modalBadge"></span>
      </div>

      <div class="modal-body">
        <p class="modal-meta" id="modalMeta"></p>
        <h2 id="modalTitle"></h2>
        <div class="modal-text" id="modalText"></div>
        <div class="modal-hashtags" id="modalHashtags"></div>
        <div class="modal-cta">
          <a href="#volunteer" class="btn-primary" id="modalVolunteerBtn">
            <i class="fas fa-hands-helping"></i> Join Our Next Activity
          </a>
          <a href="#contact" class="btn-primary-outline" id="modalContactBtn">
            <i class="fas fa-envelope"></i> Contact Us
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- JSON event data for JS modal population -->
  <script id="eventsData" type="application/json">
    <?php echo json_encode($events, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>
  </script>

  <!-- ========== VOLUNTEER ========== -->
  <section class="volunteer" id="volunteer">
    <div class="volunteer-content" data-animate="fade-left">
      <span class="section-tag light">For Student Volunteers</span>
      <h2>Learn. Serve. <span>Grow.</span></h2>
      <p>
        Gain practical experience, develop essential skills, fulfill social responsibility,
        and broaden your perspective through community extension activities.
      </p>
      <ul class="volunteer-benefits">
        <?php
          $benefits = [
            "Earn official community service hours",
            "Build leadership &amp; teamwork skills",
            "Make a real difference in Caloocan City",
            "Join meaningful outreach &amp; environmental drives",
            "Expand your professional network",
          ];
          foreach ($benefits as $benefit):
        ?>
          <li><i class="fas fa-check-circle"></i> <?php echo $benefit; ?></li>
        <?php endforeach; ?>
      </ul>
      <div class="volunteer-actions">
        <a href="#contact" class="btn-primary">
          <i class="fas fa-user-plus"></i> Register as Volunteer
        </a>
        <a href="#highlights" class="btn-outline-white">
          <i class="fas fa-images"></i> See Our Activities
        </a>
      </div>
    </div>
    <div class="volunteer-mosaic" data-animate="fade-right">
      <div class="mosaic-grid">
        <div class="mosaic-item tall">
          <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event4.jpg" alt="Community outreach"
               onerror="this.parentElement.classList.add('mosaic-fallback');this.remove();" />
          <div class="mosaic-caption">Community Outreach</div>
        </div>
        <div class="mosaic-item">
          <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event3.jpg" alt="Ugnayan event"
               onerror="this.parentElement.classList.add('mosaic-fallback');this.remove();" />
          <div class="mosaic-caption">Ugnayan sa Komunidad</div>
        </div>
        <div class="mosaic-item">
          <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event6.jpg" alt="Coastal cleanup"
               onerror="this.parentElement.classList.add('mosaic-fallback');this.remove();" />
          <div class="mosaic-caption">Coastal Cleanup</div>
        </div>
        <div class="mosaic-item wide">
          <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/event2.jpg" alt="MOU Signing"
               onerror="this.parentElement.classList.add('mosaic-fallback');this.remove();" />
          <div class="mosaic-caption">Partnership Signing</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========== PARTNERS ========== -->
  <section class="partners" id="partners">
    <div class="container">
      <div class="partners-grid">
        <div class="partners-text" data-animate="fade-left">
          <span class="section-tag">Community Partners</span>
          <h2 class="section-title">Partner With UCC CES</h2>
          <p>
            Communities, schools, organizations, and local groups can work with the University of
            Caloocan City in developing meaningful community-related initiatives.
          </p>
          <p>
            Together, we can create sustainable programs that uplift lives and transform communities
            across Caloocan City and beyond.
          </p>
          <a href="#contact" class="btn-primary">Become a Community Partner <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="partners-logos" data-animate="fade-right">
          <?php
            $partner_types = [
              ["icon" => "fa-school",   "label" => "Schools"],
              ["icon" => "fa-hospital", "label" => "Health Centers"],
              ["icon" => "fa-landmark", "label" => "LGUs"],
              ["icon" => "fa-building", "label" => "NGOs"],
              ["icon" => "fa-church",   "label" => "Community Orgs"],
              ["icon" => "fa-leaf",     "label" => "DENR / Environment"],
            ];
            foreach ($partner_types as $pt):
          ?>
            <div class="partner-badge">
              <i class="fas <?php echo $pt['icon']; ?>"></i>
              <span><?php echo $pt['label']; ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </section>

  <!-- ========== CONTACT ========== -->
  <section class="contact" id="contact">
    <div class="container">
      <div class="section-header center" data-animate="fade-up">
        <span class="section-tag">Get In Touch</span>
        <h2 class="section-title">Contact Us</h2>
        <p class="section-desc">Have questions or want to get involved? Reach out to the CES office.</p>
      </div>

      <div class="contact-grid">
        <div class="contact-info" data-animate="fade-left">
          <?php
            $contact_items = [
              ["icon" => "fa-map-marker-alt", "title" => "Address",      "text" => "University of Caloocan City<br />Biglang Awa St., Caloocan City"],
              ["icon" => "fa-envelope",       "title" => "Email",        "text" => "ces@ucc.edu.ph"],
              ["icon" => "fa-phone",          "title" => "Phone",        "text" => "(02) 8-123-4567"],
              ["icon" => "fa-clock",          "title" => "Office Hours", "text" => "Monday – Friday, 8:00 AM – 5:00 PM"],
            ];
            foreach ($contact_items as $item):
          ?>
            <div class="contact-item">
              <div class="contact-icon"><i class="fas <?php echo $item['icon']; ?>"></i></div>
              <div>
                <h4><?php echo $item['title']; ?></h4>
                <p><?php echo $item['text']; ?></p>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

        <div data-animate="fade-right">
          <?php
            $status = $_GET['status'] ?? '';
            if ($status === 'success'): ?>
              <div class="form-alert success" role="alert">
                <i class="fas fa-check-circle"></i>
                Your message has been sent! We'll get back to you soon.
              </div>
            <?php elseif ($status === 'error'):
              $err_msg = htmlspecialchars($_GET['msg'] ?? 'Something went wrong. Please try again.');
            ?>
              <div class="form-alert error" role="alert">
                <i class="fas fa-exclamation-circle"></i>
                <?php echo $err_msg; ?>
              </div>
          <?php endif; ?>

          <form class="contact-form" id="contactForm" method="POST" action="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/contact_handler.php">
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">First Name</label>
                <input type="text" id="firstName" name="first_name" placeholder="Juan" required />
              </div>
              <div class="form-group">
                <label for="lastName">Last Name</label>
                <input type="text" id="lastName" name="last_name" placeholder="Dela Cruz" required />
              </div>
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" placeholder="juan@email.com" required />
            </div>
            <div class="form-group">
              <label for="subject">Subject</label>
              <select id="subject" name="subject">
                <?php
                  $subjects = ["Volunteer Inquiry", "Partnership Proposal", "Program Information", "General Inquiry"];
                  echo '<option value="">Select a subject...</option>';
                  foreach ($subjects as $sub):
                ?>
                  <option value="<?php echo htmlspecialchars($sub); ?>"><?php echo $sub; ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" rows="5" placeholder="Write your message here..." required></textarea>
            </div>
            <button type="submit" class="btn-primary full">
              Send Message <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- ========== FOOTER ========== -->
  <footer class="footer">
    <div class="footer-top">
      <div class="container footer-grid">
        <div class="footer-brand">
          <div class="footer-logo-wrap">
            <img src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/assets/images/ucc-logo.png"
                 alt="UCC Logo"
                 class="footer-logo-img" />
            <div>
              <h3>University of Caloocan City</h3>
              <p>Community Extension Services</p>
            </div>
          </div>
          <p class="footer-desc">
            Committed to uplifting communities in Caloocan City through meaningful service,
            collaboration, and sustainable extension programs.
          </p>
          <div class="footer-socials">
            <a href="https://www.facebook.com/UCCCommunityExtensionServices" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
            <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
            <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
          </div>
        </div>

        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <?php foreach ($nav_items as $href => $label): ?>
              <li><a href="<?php echo $href; ?>"><?php echo $label; ?></a></li>
            <?php endforeach; ?>
          </ul>
        </div>

        <div class="footer-links">
          <h4>Programs</h4>
          <ul>
            <li><a href="#">Education &amp; Literacy</a></li>
            <li><a href="#">Health &amp; Wellness</a></li>
            <li><a href="#">Environment &amp; Sustainability</a></li>
            <li><a href="#">Community Development</a></li>
          </ul>
        </div>

        <div class="footer-links">
          <h4>Get Involved</h4>
          <ul>
            <li><a href="#volunteer">Become a Volunteer</a></li>
            <li><a href="#partners">Community Partners</a></li>
            <li><a href="#highlights">Event Highlights</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>&copy; <?php echo $current_year; ?> University of Caloocan City. CES Management System.</p>
        <div class="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Use</a>
        </div>
      </div>
    </div>
  </footer>

  <button class="back-to-top" id="backToTop" aria-label="Back to top">
    <i class="fas fa-chevron-up"></i>
  </button>

  <script src="<?php echo htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8'); ?>/script.js"></script>
</body>
</html>
