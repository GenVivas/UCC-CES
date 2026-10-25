/**
 * CES Landing Page — script.js
 * University of Caloocan City
 */

'use strict';

/* ============================================================
   NAVBAR — scroll effect + active link highlight
   ============================================================ */
const navbar   = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

function onScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  backToTopBtn.classList.toggle('visible', window.scrollY > 400);

  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 100) current = sec.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ============================================================
   HAMBURGER — mobile menu toggle
   ============================================================ */
const hamburger  = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = navLinksEl.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

navLinksEl.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinksEl.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('click', e => {
  if (!navbar.contains(e.target)) {
    navLinksEl.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
});

/* ============================================================
   BACK TO TOP
   ============================================================ */
const backToTopBtn = document.getElementById('backToTop');
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================================================
   SCROLL ANIMATIONS — Intersection Observer
   ============================================================ */
const animatedEls = document.querySelectorAll('[data-animate]');

const animObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el    = entry.target;
    const delay = parseInt(el.dataset.delay || 0, 10);
    setTimeout(() => el.classList.add('animated'), delay);
    animObserver.unobserve(el);
  });
}, { threshold: 0.12 });

animatedEls.forEach(el => animObserver.observe(el));

/* ============================================================
   COUNT-UP ANIMATION
   ============================================================ */
const countEls = document.querySelectorAll('.stat-number[data-target]');

function animateCount(el) {
  const target    = parseInt(el.dataset.target, 10);
  const suffix    = el.dataset.suffix || '';
  const duration  = 1800;
  const stepMs    = 16;
  const increment = target / (duration / stepMs);
  let current     = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString() + suffix;
  }, stepMs);
}

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animateCount(entry.target);
    countObserver.unobserve(entry.target);
  });
}, { threshold: 0.4 });

countEls.forEach(el => countObserver.observe(el));

/* ============================================================
   HIGHLIGHT FILTER TABS
   ============================================================ */
const filterBtns = document.querySelectorAll('.hl-filter');
const hlCards    = document.querySelectorAll('.hl-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active state
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    hlCards.forEach(card => {
      if (filter === 'all' || card.dataset.filter === filter) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

/* ============================================================
   EVENT DETAIL MODAL
   ============================================================ */
const modal       = document.getElementById('eventModal');
const modalClose  = document.getElementById('modalClose');
const modalImg    = document.getElementById('modalImg');
const modalBadge  = document.getElementById('modalBadge');
const modalTitle  = document.getElementById('modalTitle');
const modalMeta   = document.getElementById('modalMeta');
const modalText   = document.getElementById('modalText');
const modalHashes = document.getElementById('modalHashtags');

// Parse PHP-embedded event data
let eventsData = [];
try {
  const raw = document.getElementById('eventsData');
  if (raw) eventsData = JSON.parse(raw.textContent);
} catch (e) {
  console.warn('Could not parse events data', e);
}

function buildEventIndex() {
  const map = {};
  eventsData.forEach(ev => { map[ev.id] = ev; });
  return map;
}
const eventIndex = buildEventIndex();

function openModal(eventId) {
  const ev = eventIndex[eventId];
  if (!ev) return;

  // Populate fields
  modalImg.src    = ev.image;
  modalImg.alt    = ev.title;
  modalBadge.textContent  = ev.tag;
  modalBadge.className    = `hl-badge ${ev.tag_color}`;
  modalTitle.textContent  = ev.title;

  modalMeta.innerHTML = `
    <span><i class="fas fa-calendar-alt"></i> ${ev.date}</span>
    <span><i class="fas fa-map-marker-alt"></i> ${ev.location}</span>
  `;

  modalText.textContent = ev.full;

  // Hashtags
  modalHashes.innerHTML = '';
  if (Array.isArray(ev.hashtags)) {
    ev.hashtags.forEach(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      modalHashes.appendChild(span);
    });
  }

  // Show modal
  modal.removeAttribute('hidden');
  document.body.classList.add('modal-open');

  // Scroll modal to top
  const box = modal.querySelector('.modal-box');
  if (box) box.scrollTop = 0;

  // Focus close button for accessibility
  requestAnimationFrame(() => modalClose.focus());

  // Store which card triggered it (for focus return)
  modal._triggerEl = document.activeElement;
}

function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  if (modal._triggerEl) modal._triggerEl.focus();
}

// Open on card click or Enter/Space
hlCards.forEach(card => {
  card.addEventListener('click', () => openModal(card.dataset.event));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(card.dataset.event);
    }
  });
});

// Close button
modalClose.addEventListener('click', closeModal);

// Click backdrop to close
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

// Keyboard — Escape to close, Tab trap inside modal
document.addEventListener('keydown', e => {
  if (!modal.hasAttribute('hidden')) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    // Tab trap
    if (e.key === 'Tab') {
      const focusable = Array.from(
        modal.querySelectorAll('a, button, [tabindex="0"]')
      ).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  }
});

/* ============================================================
   CONTACT FORM — loading state
   ============================================================ */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function () {
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = 'Send Message <i class="fas fa-paper-plane"></i>';
    }, 5000);
  });
}

/* ============================================================
   SMOOTH SCROLL — anchor links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    ) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ============================================================
   INIT
   ============================================================ */
onScroll();
