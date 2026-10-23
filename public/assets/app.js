const API = 'api';
const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const authMessage = document.querySelector('#auth-message');
const pageMessage = document.querySelector('#page-message');
const pageContent = document.querySelector('#page-content');
const pageHeading = document.querySelector('#page-heading');
const topActions = document.querySelector('#top-actions');
const pageRoutes = {
    overview: '',
    proposals: 'proposals',
    directory: 'directory',
    events: 'events',
    accounts: 'accounts',
    reports: 'reports',
    notifications: 'notifications'
};
const routeScript = document.querySelector('script[src*="app.js"]');
const scriptBasePath = routeScript
    ? new URL(routeScript.src, window.location.href).pathname.replace(/\/assets\/app\.js$/, '').replace(/\/public$/, '')
    : '';
const appBasePath = scriptBasePath.replace(/\/$/, '');
let csrfToken = '';
let currentUser = null;
let currentPage = 'overview';
let qrStream = null;
let qrTimer = 0;

function pageUrl(page) {
    const suffix = pageRoutes[page];
    return suffix ? `${appBasePath}/${suffix}` : `${appBasePath}/`;
}

function pageFromLocation() {
    const legacyTab = new URLSearchParams(window.location.search).get('tab');
    if (Object.hasOwn(pageRoutes, legacyTab)) return legacyTab;
    let path = window.location.pathname.replace(/\/+$/, '');
    if (appBasePath && path.startsWith(`${appBasePath}/public`)) {
        path = path.slice(`${appBasePath}/public`.length);
    } else if (appBasePath && path.startsWith(appBasePath)) {
        path = path.slice(appBasePath.length);
    }
    const route = path.split('/').filter(Boolean)[0];
    const page = Object.keys(pageRoutes).find(key => pageRoutes[key] === (route || ''));
    if (page) return page;
    return 'overview';
}

function syncNavigation(page) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        const active = item.dataset.page === page;
        item.classList.toggle('is-active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
        item.href = pageUrl(item.dataset.page);
    });
    document.querySelector('.brand').href = pageUrl('overview');
}

function navigateToPage(page, { replace = false } = {}) {
    if (!Object.hasOwn(pageRoutes, page)) page = 'overview';
    const url = pageUrl(page);
    if (window.location.pathname !== url || window.location.search || window.location.hash) {
        window.history[replace ? 'replaceState' : 'pushState']({ page }, '', url);
    }
    syncNavigation(page);
    return renderPage(page);
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (options.method && options.method !== 'GET') headers.set('X-CSRF-Token', csrfToken);
    const response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error('The server did not return an API response. Check the web-server rewrite configuration.');
    }
    const result = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(result?.error || 'The request could not be completed.');
    return result;
}

function showMessage(target, message, type = 'success') {
    target.textContent = message;
    target.className = `notice ${type}`;
    target.hidden = false;
}

function clearMessage(target) {
    target.hidden = true;
    target.textContent = '';
}

function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined && text !== null) element.textContent = String(text);
    if (className) element.className = className;
    return element;
}

function button(label, action, className = 'button button-quiet button-small') {
    const element = node('button', label, className);
    element.type = 'button';
    element.dataset.action = action;
    return element;
}

function formField(labelText, name, type = 'text', required = false) {
    const label = node('label', labelText);
    const input = node(type === 'select' ? 'select' : 'input');
    input.name = name;
    if (type !== 'select') input.type = type;
    if (required) input.required = true;
    label.append(input);
    return label;
}

function panel(title, description) {
    const section = node('section', undefined, 'panel');
    section.append(node('h2', title));
    if (description) section.append(node('p', description));
    return section;
}

async function loadSession() {
    try {
        const session = await request('/session');
        csrfToken = session.csrfToken;
        if (session.user) {
            enterApp(session.user);
        } else {
            showAuth();
        }
    } catch (error) {
        showAuth();
        showMessage(authMessage, error.message, 'error');
    }
}

function showAuth() {
    document.body.classList.remove('app-entry');
    document.body.classList.remove('password-change-entry');
    notificationPopover.hidden = true;
    notificationButton.setAttribute('aria-expanded', 'false');
    document.body.classList.add('auth-entry');
    document.querySelector('.app-layout').classList.remove('password-change-mode');
    document.querySelector('#password-change-view').hidden = true;
    document.querySelector('.sidebar').hidden = false;
    authView.hidden = false;
    appView.hidden = true;
    topActions.hidden = true;
}

function enterApp(user) {
    document.body.classList.remove('auth-entry');
    document.body.classList.add('app-entry');
    document.body.classList.remove('password-change-entry');
    currentUser = user;
    authView.hidden = true;
    appView.hidden = false;
    topActions.hidden = false;
    document.querySelector('#user-label').textContent = `${user.firstName} ${user.lastName} · ${user.role}`;
    document.querySelectorAll('.nav-item').forEach(item => {
        const allowedRoles = item.dataset.roles?.split(',') || ['admin', 'partner', 'volunteer'];
        item.hidden = !allowedRoles.includes(user.role) || (item.classList.contains('admin-only') && user.role !== 'admin');
    });
    if (user.mustChangePassword) {
        renderPasswordChange();
        return;
    }
    document.querySelector('.app-layout').classList.remove('password-change-mode');
    document.querySelector('#password-change-view').hidden = true;
    document.querySelector('.sidebar').hidden = false;
    navigateToPage(pageFromLocation(), { replace: true });
}

function renderPasswordChange() {
    document.body.classList.add('password-change-entry');
    const appLayout = document.querySelector('.app-layout');
    const view = document.querySelector('#password-change-view');
    appLayout.classList.add('password-change-mode');
    document.querySelector('.sidebar').hidden = true;
    document.querySelector('#page-heading').replaceChildren();
    document.querySelector('#page-message').hidden = true;
    pageContent.replaceChildren();
    view.hidden = false;
    view.replaceChildren();

    const heading = node('div', undefined, 'password-change-heading');
    heading.append(
        node('span', 'ACCOUNT SECURITY', 'auth-card-kicker'),
        node('h1', 'Set a new password'),
        node('p', 'This admin account uses a one-time temporary password. Choose a new one before continuing.')
    );
    const notice = node('div', undefined, 'notice');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.hidden = true;
    const form = node('form', undefined, 'form-stack password-change-form');
    form.innerHTML = '<label>Temporary password<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>New password <span class="field-hint">At least 12 characters</span><input name="newPassword" type="password" autocomplete="new-password" minlength="12" required></label><label>Confirm new password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" required></label><button class="button button-primary" type="submit">Save new password <span aria-hidden="true">→</span></button>';
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        if (values.newPassword !== values.confirmation) {
            showMessage(notice, 'New password and confirmation do not match.', 'error');
            return;
        }
        setBusy(form, true);
        try {
            const result = await request('/password/change', { method: 'POST', body: JSON.stringify(values) });
            csrfToken = result.csrfToken;
            showMessage(notice, result.message);
            enterApp(result.user);
        } catch (error) {
            showMessage(notice, error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });
    view.append(heading, notice, form);
}

function setBusy(form, busy) {
    const submit = form.querySelector('[type="submit"]');
    if (!submit) return;
    if (busy) {
        submit.dataset.label = submit.textContent;
        submit.textContent = 'Please wait…';
    } else if (submit.dataset.label) {
        submit.textContent = submit.dataset.label;
        delete submit.dataset.label;
    }
    submit.disabled = busy;
}

document.querySelectorAll('[data-auth]').forEach(tab => {
    tab.addEventListener('click', () => {
        const register = tab.dataset.auth === 'register';
        document.querySelectorAll('[data-auth]').forEach(item => {
            item.classList.toggle('is-active', item === tab);
            item.setAttribute('aria-selected', String(item === tab));
        });
        document.querySelector('#login-form').hidden = register;
        document.querySelector('#register-form').hidden = !register;
        document.querySelector('#auth-title').textContent = register ? 'Create your CES account' : 'Sign in to CES Portal';
        document.querySelector('#auth-subtitle').textContent = register
            ? 'Register your organization or volunteer profile.'
            : 'Enter your account credentials to continue.';
        const form = register ? document.querySelector('#register-form') : document.querySelector('#login-form');
        form.classList.remove('form-enter');
        void form.offsetWidth;
        form.classList.add('form-enter');
        clearMessage(authMessage);
    });
});

const registrationForm = document.querySelector('#register-form');
const registrationSteps = Array.from(registrationForm.querySelectorAll('[data-register-step]'));
let registrationStep = 1;

function updateRegistrationRole() {
    const isVolunteer = registrationForm.elements.role.value === 'volunteer';
    const partnerFields = document.querySelector('#partner-fields');
    const volunteerFields = document.querySelector('#volunteer-fields');
    partnerFields.hidden = isVolunteer;
    volunteerFields.hidden = !isVolunteer;
    partnerFields.querySelectorAll('input, select').forEach(input => {
        input.required = !isVolunteer;
    });
    volunteerFields.querySelectorAll('input, select').forEach(input => {
        input.required = isVolunteer;
    });
    registrationForm.elements.proof.required = true;
    document.querySelector('[data-proof-hint]').textContent = isVolunteer
        ? 'Upload a school ID, government-issued ID, or company ID.'
        : 'Upload an official ID, endorsement letter, registration, or MOA document.';
}

function showRegistrationStep(step) {
    registrationStep = step;
    registrationSteps.forEach(fieldset => {
        const active = Number(fieldset.dataset.registerStep) === step;
        fieldset.hidden = !active;
        fieldset.disabled = !active;
    });
    registrationForm.querySelector('[data-step-number]').textContent = String(step);
    registrationForm.querySelector('[data-step-title]').textContent = step === 1
        ? 'Basic account information'
        : 'Role verification details';
    registrationForm.querySelector('.registration-progress-track span').style.width = step === 1 ? '50%' : '100%';
}

function validateRegistrationStep(fieldset) {
    const invalidField = Array.from(fieldset.querySelectorAll('input, select, textarea'))
        .find(field => !field.disabled && !field.checkValidity());
    if (!invalidField) return true;
    invalidField.reportValidity();
    invalidField.focus();
    return false;
}

registrationForm.elements.role.addEventListener('change', updateRegistrationRole);
updateRegistrationRole();
showRegistrationStep(1);

registrationForm.querySelector('[data-registration-next]').addEventListener('click', () => {
    clearMessage(authMessage);
    const basicInfo = registrationSteps[0];
    if (!validateRegistrationStep(basicInfo)) return;
    if (registrationForm.elements.password.value !== registrationForm.elements.confirmation.value) {
        showMessage(authMessage, 'Password and confirmation do not match.', 'error');
        registrationForm.elements.confirmation.focus();
        return;
    }
    showRegistrationStep(2);
    const roleDetails = registrationForm.elements.role.value === 'volunteer'
        ? document.querySelector('#volunteer-fields')
        : document.querySelector('#partner-fields');
    roleDetails.querySelector('input, select')?.focus();
});

registrationForm.querySelector('[data-registration-back]').addEventListener('click', () => {
    clearMessage(authMessage);
    showRegistrationStep(1);
    registrationForm.elements.role.focus();
});

document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    clearMessage(authMessage);
    setBusy(form, true);
    try {
        const result = await request('/login', {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        csrfToken = result.csrfToken;
        form.reset();
        enterApp(result.user);
    } catch (error) {
        showMessage(authMessage, error.message, 'error');
    } finally {
        setBusy(form, false);
    }
});

registrationForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearMessage(authMessage);
    if (registrationStep === 1) {
        registrationForm.querySelector('[data-registration-next]').click();
        return;
    }
    const verification = registrationSteps[1];
    if (!validateRegistrationStep(verification)) return;
    try {
        const proof = registrationForm.elements.proof.files[0];
        if (!proof) {
            registrationForm.elements.proof.reportValidity();
            return;
        }
        if (proof.size < 1 || proof.size > 10 * 1024 * 1024) {
            showMessage(authMessage, 'Verification document must be between 1 byte and 10 MB.', 'error');
            registrationForm.elements.proof.focus();
            return;
        }
        const values = Object.fromEntries(Array.from(registrationForm.querySelectorAll('[name]'))
            .filter(input => input.name !== 'proof' && input.type !== 'file')
            .map(input => [input.name, input.value]));
        setBusy(registrationForm, true);
        const payload = new FormData();
        payload.set('payload', JSON.stringify(values));
        payload.set('proof', proof);
        const result = await request('/register', { method: 'POST', body: payload });
        registrationForm.reset();
        updateRegistrationRole();
        showRegistrationStep(1);
        showMessage(authMessage, result.message);
    } catch (error) {
        showMessage(authMessage, error.message, 'error');
    } finally {
        setBusy(registrationForm, false);
    }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
    try {
        await request('/logout', { method: 'POST', body: '{}' });
        currentUser = null;
        showAuth();
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    }
});

const notificationButton = document.querySelector('#notification-button');
const notificationPopover = document.querySelector('#notification-popover');
const notificationPopoverContent = document.querySelector('#notification-popover-content');

notificationButton.addEventListener('click', async () => {
    const opening = notificationPopover.hidden;
    notificationPopover.hidden = !opening;
    notificationButton.setAttribute('aria-expanded', String(opening));
    if (!opening) return;
    notificationPopoverContent.replaceChildren(node('p', 'Loading notifications…', 'notification-popover-empty'));
    try {
        const { notifications } = await request('/notifications');
        notificationPopoverContent.replaceChildren();
        if (!notifications.length) {
            notificationPopoverContent.append(node('p', 'You are all caught up.', 'notification-popover-empty'));
            return;
        }
        notifications.slice(0, 5).forEach(item => {
            const record = node('article', undefined, `notification-item${item.read_at ? '' : ' is-unread'}`);
            record.append(
                node('strong', item.subject),
                node('p', item.message),
                node('time', dashboardDate(item.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))
            );
            if (!item.read_at) {
                const markRead = node('button', 'Mark as read', 'notification-mark-read');
                markRead.type = 'button';
                markRead.addEventListener('click', async () => {
                    markRead.disabled = true;
                    try {
                        await request(`/notifications/${item.id}/read`, { method: 'PUT', body: '{}' });
                        notificationButton.click();
                        notificationButton.click();
                    } catch (error) {
                        notificationPopoverContent.replaceChildren(node('p', error.message, 'notification-popover-empty is-error'));
                    }
                });
                record.append(markRead);
            }
            notificationPopoverContent.append(record);
        });
    } catch (error) {
        notificationPopoverContent.replaceChildren(node('p', error.message, 'notification-popover-empty is-error'));
    }
});

document.querySelector('#notification-view-all').addEventListener('click', () => {
    notificationPopover.hidden = true;
    notificationButton.setAttribute('aria-expanded', 'false');
    const notificationsPage = Array.from(document.querySelectorAll('.nav-item')).find(item => item.dataset.page === 'notifications');
    notificationsPage?.click();
});

document.addEventListener('click', event => {
    if (!event.target.closest('.notification-menu')) {
        notificationPopover.hidden = true;
        notificationButton.setAttribute('aria-expanded', 'false');
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !notificationPopover.hidden) {
        notificationPopover.hidden = true;
        notificationButton.setAttribute('aria-expanded', 'false');
        notificationButton.focus();
    }
});

document.querySelector('#main-nav').addEventListener('click', event => {
    const target = event.target.closest('a[data-page]');
    if (!target) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateToPage(target.dataset.page);
});

window.addEventListener('popstate', () => {
    if (!currentUser || currentUser.mustChangePassword) return;
    navigateToPage(pageFromLocation(), { replace: true });
});

function setHeading(title, subtitle) {
    pageHeading.replaceChildren();
    pageHeading.append(node('h1', title), node('p', subtitle));
}

async function renderPage(page) {
    if (currentUser?.mustChangePassword) {
        renderPasswordChange();
        return;
    }
    const pageRoles = {
        proposals: ['admin', 'partner'],
        directory: ['admin', 'partner'],
        accounts: ['admin'],
        reports: ['admin', 'partner']
    };
    if (pageRoles[page] && !pageRoles[page].includes(currentUser.role)) {
        page = 'overview';
        if (pageFromLocation() !== page) {
            window.history.replaceState({ page }, '', pageUrl(page));
        }
    }
    stopQrCamera();
    currentPage = page;
    syncNavigation(page);
    clearMessage(pageMessage);
    pageContent.replaceChildren();
    const pages = {
        overview: ['Overview', 'A quick view of your UCC-CES workspace.'],
        proposals: ['Proposals', 'Build, submit, and track community project proposals.'],
        directory: ['Partner directory', 'Find approved organizations across the community network.'],
        events: ['Events & attendance', 'Coordinate volunteer applications and event-day attendance.'],
        reports: ['Project reports', 'Explore project activity with date-bounded, non-financial reporting.'],
        notifications: ['Notifications', 'Your latest system updates.']
    };
    pageHeading.hidden = page === 'accounts';
    const heading = pages[page] || pages.overview;
    if (page !== 'accounts') setHeading(heading[0], heading[1]);
    try {
        if (page === 'overview') await renderOverview();
        if (page === 'proposals') await renderProposals();
        if (page === 'directory') await renderDirectory();
        if (page === 'events') await renderEvents();
        if (page === 'accounts') await renderAccounts();
        if (page === 'reports') await renderReports();
        if (page === 'notifications') await renderNotifications();
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    }
}

async function renderOverview() {
    const overview = await request('/overview');
    const { counts } = overview;
    if (currentUser.role === 'admin') {
        renderAdminOverview(overview);
        return;
    }
    if (currentUser.role === 'partner') {
        renderPartnerOverview(overview.partnerDashboard);
        return;
    }
    const cards = node('div', undefined, 'cards');
    const labels = currentUser.role === 'partner'
        ? [['proposals', 'Your proposals'], ['active', 'Active projects'], ['events', 'Events']]
        : [['approved_applications', 'Approved applications'], ['attendance', 'Attendance records']];
    for (const [key, label] of labels) {
        const card = node('article', undefined, 'metric-card');
        card.append(node('span', label), node('strong', counts[key] ?? 0));
        cards.append(card);
    }
    pageContent.append(cards);
    const welcome = panel(`Welcome, ${currentUser.firstName}`, 'Choose a workspace section to continue. Account approval and event enrollment are separate: approved volunteers still apply to each event.');
    pageContent.append(welcome);
}

function renderPartnerOverview(dashboard) {
    const { counts, proposalStatus, upcomingEvents } = dashboard;
    const cards = node('div', undefined, 'dashboard-metrics partner-dashboard-metrics');
    [
        ['Your proposals', counts.proposals, `${counts.pending_proposals} awaiting review · ${counts.scheduled_projects} with scheduled events`, 'proposals'],
        ['Ongoing events', counts.ongoing_events, `${counts.completed_events} completed`, 'events'],
        ['Volunteer participants', counts.approved_volunteers, 'Approved across your events', 'events'],
        ['Attendance headcount', counts.attendance_headcount, 'Volunteers recorded present', 'events']
    ].forEach(([label, value, description, page]) => {
        const card = node('article', undefined, 'metric-card dashboard-metric');
        card.append(
            node('span', label, 'dashboard-metric-label'),
            node('strong', value),
            node('small', description)
        );
        card.addEventListener('click', () => {
            document.querySelector(`.nav-item[data-page="${page}"]`)?.click();
        });
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
        cards.append(card);
    });
    pageContent.append(cards);

    const heading = node('div', undefined, 'dashboard-section-heading');
    heading.append(node('h2', 'Your proposal pipeline'), node('p', 'Status summary for proposals you own or have accepted as a partner.'));
    pageContent.append(heading);
    const pipeline = panel('Proposal status');
    pipeline.classList.add('dashboard-panel', 'partner-proposal-pipeline');
    const total = Object.values(proposalStatus).reduce((sum, count) => sum + count, 0);
    if (total === 0) {
        pipeline.append(node('div', 'Your proposal status summary will appear here.', 'empty'));
    } else {
        const statusList = node('div', undefined, 'dashboard-status-list');
        Object.entries(proposalStatus).forEach(([status, count]) => {
            const row = node('div', undefined, 'dashboard-status-row');
            const label = node('span', dashboardStatusLabel(status), 'dashboard-status-label');
            const track = node('span', undefined, 'dashboard-status-track');
            const bar = node('span', undefined, `dashboard-status-bar status-${status}`);
            bar.style.width = `${(count / total) * 100}%`;
            track.setAttribute('role', 'progressbar');
            track.setAttribute('aria-label', `${dashboardStatusLabel(status)} proposals`);
            track.setAttribute('aria-valuemin', '0');
            track.setAttribute('aria-valuemax', String(total));
            track.setAttribute('aria-valuenow', String(count));
            track.append(bar);
            row.append(label, track, node('strong', count));
            statusList.append(row);
        });
        pipeline.append(statusList);
    }
    pipeline.append(dashboardLink('View proposals', 'proposals'));
    pageContent.append(pipeline);

    const eventsHeading = node('div', undefined, 'dashboard-section-heading partner-upcoming-heading');
    eventsHeading.append(node('h2', 'Upcoming & ongoing events'), node('p', 'Scheduled activities linked to your partner account.'));
    pageContent.append(eventsHeading);
    const eventsPanel = panel('Your event schedule');
    eventsPanel.classList.add('dashboard-panel');
    if (!upcomingEvents.length) {
        eventsPanel.append(node('div', 'No upcoming events are scheduled for your partner account.', 'empty'));
    } else {
        const list = node('div', undefined, 'record-list dashboard-record-list');
        upcomingEvents.forEach(item => {
            const record = node('article', undefined, 'record dashboard-event-record');
            const info = node('div', undefined, 'record-main');
            info.append(
                node('strong', item.title),
                node('small', `${item.project_title} · ${dashboardDate(item.event_date, { month: 'short', day: 'numeric', year: 'numeric' })} · ${item.approved_applications}/${item.capacity} volunteers`)
            );
            record.append(info);
            list.append(record);
        });
        eventsPanel.append(list);
    }
    eventsPanel.append(dashboardLink('Open events & attendance', 'events'));
    pageContent.append(eventsPanel);
}

function dashboardLink(label, page) {
    const link = node('button', label, 'button button-quiet button-small');
    link.type = 'button';
    link.addEventListener('click', () => {
        const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.dataset.page === page);
        navItem?.click();
    });
    return link;
}

function dashboardDate(value, options) {
    const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : `${value}T00:00:00`);
    return new Intl.DateTimeFormat('en-PH', { ...options, timeZone: 'Asia/Manila' }).format(date);
}

function dashboardStatusLabel(status) {
    return status.replaceAll('_', ' ');
}

function dashboardTrendBadge(trend, previousMonth, noHistoryLabel, trendBasis = '') {
    const badge = node('span', undefined, 'dashboard-trend');
    if (trendBasis) {
        badge.title = `Compared by ${trendBasis}.`;
    }
    if (!trend || trend.previous < 1) {
        badge.classList.add('is-neutral');
        badge.textContent = noHistoryLabel;
        if (trendBasis) badge.setAttribute('aria-label', `${trendBasis}: ${badge.textContent}`);
        return badge;
    }
    const change = Math.round(((trend.current - trend.previous) / trend.previous) * 100);
    badge.classList.add(change < 0 ? 'is-down' : 'is-up');
    badge.textContent = `${change > 0 ? '+' : ''}${change}% vs ${previousMonth}`;
    if (trendBasis) {
        const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
        badge.setAttribute('aria-label', `${trendBasis}: ${direction} ${Math.abs(change)}% vs ${previousMonth}`);
    }
    return badge;
}

function renderAdminOverview(overview) {
    const { counts, proposalStatus, monthlyActivities, reviewQueue, upcomingEvents, monthOverMonth, recentActions } = overview;
    const todayParts = new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date()).reduce((parts, part) => {
        parts[part.type] = part.value;
        return parts;
    }, {});
    const periodStart = `${todayParts.year}-${todayParts.month}-01`;
    const periodLabel = `${dashboardDate(periodStart, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })} to Present`;
    const period = node('section', undefined, 'dashboard-period');
    period.append(
        node('span', 'REPORTING PERIOD', 'dashboard-period-label'),
        node('strong', periodLabel, 'dashboard-period-value')
    );
    pageContent.append(period);

    const metrics = [
        {
            label: 'Active projects',
            value: counts.active_projects,
            description: 'Projects currently underway',
            page: 'proposals',
            trend: null,
            trendLabel: 'No historical status data',
            featured: true
        },
        {
            label: 'Proposal submissions',
            value: monthOverMonth.proposal_submissions.current,
            description: `${counts.pending_proposals} awaiting review`,
            page: 'proposals',
            trend: monthOverMonth.proposal_submissions,
            trendLabel: 'No prior-month submissions',
            trendBasis: 'new proposal submissions'
        },
        {
            label: 'New registrations',
            value: monthOverMonth.account_registrations.current,
            description: `${counts.pending_accounts} accounts awaiting approval`,
            page: 'accounts',
            trend: monthOverMonth.account_registrations,
            trendLabel: 'No prior-month registrations',
            trendBasis: 'new partner and volunteer registrations'
        },
        {
            label: 'Volunteer applications',
            value: monthOverMonth.volunteer_applications.current,
            description: `${counts.pending_applications} awaiting a decision`,
            page: 'events',
            trend: monthOverMonth.volunteer_applications,
            trendLabel: 'No prior-month applications',
            trendBasis: 'volunteer applications received'
        },
        {
            label: 'Scheduled events',
            value: monthOverMonth.scheduled_events.current,
            description: `${counts.upcoming_events} upcoming events`,
            page: 'events',
            trend: monthOverMonth.scheduled_events,
            trendLabel: 'No prior-month events',
            trendBasis: 'events created'
        }
    ];
    const cards = node('div', undefined, 'dashboard-metrics');
    metrics.forEach(metric => {
        const card = node('article', undefined, `metric-card dashboard-metric${metric.featured ? ' dashboard-metric-priority' : ''}`);
        card.append(
            node('span', metric.label, 'dashboard-metric-label'),
            node('strong', metric.value),
            node('small', metric.description),
            dashboardTrendBadge(metric.trend, monthOverMonth.previousMonth, metric.trendLabel, metric.trendBasis)
        );
        if (metric.trendBasis) {
            card.append(node('small', `Trend: ${metric.trendBasis}`, 'dashboard-trend-basis'));
        }
        card.addEventListener('click', () => {
            const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.dataset.page === metric.page);
            navItem?.click();
        });
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${metric.value} ${metric.label}. Open ${metric.page}.`);
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
        cards.append(card);
    });
    pageContent.append(cards);

    const chartsHeading = node('div', undefined, 'dashboard-section-heading');
    chartsHeading.append(node('h2', 'Charts'), node('p', 'Proposal pipeline and scheduled CES activities.'));
    pageContent.append(chartsHeading);

    const analytics = node('div', undefined, 'dashboard-grid');
    const pipeline = panel('Proposal pipeline', 'A live view of where proposals stand.');
    pipeline.classList.add('dashboard-panel');
    const statusEntries = Object.entries(proposalStatus);
    const statusTotal = statusEntries.reduce((sum, [, total]) => sum + total, 0);
    if (!statusTotal) {
        pipeline.append(node('div', 'Proposal statuses will appear here when proposals are submitted.', 'empty'));
    } else {
        const statusList = node('div', undefined, 'dashboard-status-list');
        statusEntries.forEach(([status, total]) => {
            const row = node('div', undefined, 'dashboard-status-row');
            const label = node('span', dashboardStatusLabel(status), 'dashboard-status-label');
            const track = node('span', undefined, 'dashboard-status-track');
            const bar = node('span', undefined, `dashboard-status-bar status-${status}`);
            bar.style.width = `${(total / statusTotal) * 100}%`;
            track.setAttribute('role', 'progressbar');
            track.setAttribute('aria-label', `${dashboardStatusLabel(status)} proposals`);
            track.setAttribute('aria-valuemin', '0');
            track.setAttribute('aria-valuemax', String(statusTotal));
            track.setAttribute('aria-valuenow', String(total));
            track.append(bar);
            row.append(label, track, node('strong', total));
            statusList.append(row);
        });
        pipeline.append(statusList);
    }
    pipeline.append(dashboardLink('View proposals', 'proposals'));

    const activity = panel('CES activities', 'Scheduled event dates over the last six months.');
    activity.classList.add('dashboard-panel');
    if (!monthlyActivities.some(item => item.total > 0)) {
        activity.append(node('div', 'Scheduled activity dates will appear here as projects plan events.', 'empty'));
    } else {
        const chart = node('div', undefined, 'dashboard-month-chart');
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', 'Number of scheduled event dates by month over the last six months');
        const maxActivity = Math.max(1, ...monthlyActivities.map(item => item.total));
        monthlyActivities.forEach(item => {
            const column = node('div', undefined, 'dashboard-month-column');
            const value = node('span', item.total, 'dashboard-month-value');
            const track = node('span', undefined, 'dashboard-month-track');
            const bar = node('span', undefined, 'dashboard-month-bar');
            bar.style.height = `${item.total ? Math.max(8, (item.total / maxActivity) * 100) : 0}%`;
            track.append(bar);
            column.append(value, track, node('span', dashboardDate(`${item.month}-01`, { month: 'short' }), 'dashboard-month-label'));
            chart.append(column);
        });
        activity.append(chart);
    }
    activity.append(dashboardLink('View events', 'events'));
    analytics.append(pipeline, activity);
    pageContent.append(analytics);

    const actionsHeading = node('div', undefined, 'dashboard-section-heading dashboard-actions-heading');
    actionsHeading.append(node('h2', 'Recent Actions'), node('p', 'Latest updates sent to your CES Admin account.'));
    pageContent.append(actionsHeading);
    const actionsPanel = panel('Latest updates', 'Recent account, proposal, and collaboration activity.');
    actionsPanel.classList.add('dashboard-panel', 'dashboard-actions-panel');
    if (!recentActions.length) {
        actionsPanel.append(node('div', 'No recent actions have been recorded yet.', 'empty'));
    } else {
        const list = node('div', undefined, 'record-list dashboard-record-list');
        recentActions.forEach(action => {
            const record = node('article', undefined, `record dashboard-action-record${action.read_at ? '' : ' is-unread'}`);
            const info = node('div', undefined, 'record-main');
            info.append(
                node('strong', action.subject),
                node('small', action.message),
                node('small', dashboardDate(action.created_at, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))
            );
            record.append(info, node('span', action.read_at ? 'Read' : 'New', 'badge'));
            list.append(record);
        });
        actionsPanel.append(list);
    }
    actionsPanel.append(dashboardLink('View all notifications', 'notifications'));
    pageContent.append(actionsPanel);

    const followupsHeading = node('div', undefined, 'dashboard-section-heading dashboard-followups-heading');
    followupsHeading.append(node('h2', 'Needs attention'), node('p', 'Proposal reviews and upcoming project activities.'));
    pageContent.append(followupsHeading);
    const operations = node('div', undefined, 'dashboard-grid dashboard-lower-grid');
    const reviews = panel('Proposal review queue', 'The latest proposals awaiting CES Admin review.');
    reviews.classList.add('dashboard-panel');
    if (!reviewQueue.length) {
        reviews.append(node('div', 'You are all caught up on proposal reviews.', 'empty'));
    } else {
        const list = node('div', undefined, 'record-list dashboard-record-list');
        reviewQueue.forEach(proposal => {
            const record = node('article', undefined, 'record');
            const info = node('div', undefined, 'record-main');
            info.append(
                node('strong', proposal.title),
                node('small', `${proposal.first_name} ${proposal.last_name} · Updated ${dashboardDate(proposal.updated_at, { month: 'short', day: 'numeric' })}`)
            );
            record.append(info, node('span', dashboardStatusLabel(proposal.status), `badge status-badge status-${proposal.status}`));
            list.append(record);
        });
        reviews.append(list);
    }
    reviews.append(dashboardLink('Open review queue', 'proposals'));

    const eventsPanel = panel('Upcoming activities', 'The next scheduled dates for active CES projects.');
    eventsPanel.classList.add('dashboard-panel');
    if (!upcomingEvents.length) {
        eventsPanel.append(node('div', 'No upcoming activity dates are scheduled yet.', 'empty'));
    } else {
        const list = node('div', undefined, 'record-list dashboard-record-list');
        upcomingEvents.forEach(event => {
            const record = node('article', undefined, 'record dashboard-event-record');
            const date = node('span', undefined, 'dashboard-event-date');
            date.append(
                node('strong', dashboardDate(event.event_date, { day: '2-digit' })),
                node('small', dashboardDate(event.event_date, { month: 'short' }))
            );
            const info = node('div', undefined, 'record-main');
            info.append(node('strong', event.title), node('small', event.project_title));
            record.append(date, info);
            list.append(record);
        });
        eventsPanel.append(list);
    }
    eventsPanel.append(dashboardLink('Manage events', 'events'));
    operations.append(reviews, eventsPanel);
    pageContent.append(operations);
}

async function renderProposals() {
    if (currentUser.role === 'partner') {
        const { categories } = await request('/categories');
        const section = panel('Start a proposal', 'Complete the four project-brief sections to save a draft. Attach the required documents before submitting it for CES Admin review.');
        const form = createProposalWizard(categories);
        form.addEventListener('submit', createProposal);
        section.append(form);
        pageContent.append(section);
    }
    const { proposals } = await request('/proposals');
    const section = panel('Proposal register', 'Search proposals by title or proposer and filter by current status.');
    section.classList.add('proposal-register');
    const filters = node('div', undefined, 'proposal-filters');
    filters.innerHTML = '<label>Search<input name="search" type="search" placeholder="Search title or proposer"></label><label>Status<select name="status"><option value="">All statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="revision">Needs revision</option><option value="approved">Approved</option><option value="active">Active</option><option value="rejected">Rejected</option></select></label>';
    const tableWrap = node('div', undefined, 'proposal-table-wrap');
    const table = node('table', undefined, 'proposal-table');
    table.innerHTML = '<thead><tr><th scope="col">Proposal</th><th scope="col">Proposer</th><th scope="col">Status</th><th scope="col">Project dates</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead>';
    const body = node('tbody');
    proposals.forEach(proposal => {
        const row = node('tr');
        row.dataset.status = proposal.status;
        row.dataset.search = `${proposal.title} ${proposal.first_name} ${proposal.last_name}`.toLocaleLowerCase();
        const titleCell = node('td', undefined, 'proposal-title-cell');
        titleCell.append(node('strong', proposal.title));
        const attachmentCount = node('small', `${Number(proposal.attachment_count || 0)} document(s) attached`, 'proposal-attachment-count');
        attachmentCount.dataset.attachmentCount = '';
        titleCell.append(attachmentCount);
        const proposerCell = node('td', `${proposal.first_name} ${proposal.last_name}`);
        const statusLabel = {
            draft: 'Draft',
            submitted: 'Submitted',
            under_review: 'Under review',
            revision: 'Needs revision',
            approved: 'Approved',
            active: 'Active',
            rejected: 'Rejected'
        }[proposal.status] || dashboardStatusLabel(proposal.status);
        const statusCell = node('td');
        statusCell.append(node('span', statusLabel, `badge proposal-status status-${proposal.status}`));
        if (currentUser.role === 'partner' && proposal.user_invitation_status === 'pending') {
            statusCell.append(node('span', 'Invitation pending', 'badge status-badge'));
        }
        if (proposal.review_notes) {
            statusCell.append(node('small', `Review note: ${proposal.review_notes}`, 'proposal-review-note'));
        }
        const projectDates = proposal.period_start
            ? `${dashboardDate(proposal.period_start, { month: 'short', day: 'numeric', year: 'numeric' })}${proposal.period_end ? ` – ${dashboardDate(proposal.period_end, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
            : 'Not scheduled';
        const datesCell = node('td', projectDates);
        const updatedCell = node('td', dashboardDate(proposal.updated_at, { month: 'short', day: 'numeric', year: 'numeric' }));
        const actionsCell = node('td');
        const actions = node('div', undefined, 'record-actions');
        if (['admin', 'partner'].includes(currentUser.role)) {
            actions.append(button('View', `dossier-${proposal.id}`, 'button button-quiet button-small'));
        }
        if (currentUser.role === 'partner' && Number(proposal.owner_user_id) === currentUser.id) {
            if (proposal.status === 'draft') {
                actions.append(button('Edit', `editproposal-${proposal.id}`, 'button button-quiet button-small'));
                actions.append(button('Add document', `upload-${proposal.id}`, 'button button-quiet button-small'));
                actions.append(button('Submit', `submit-${proposal.id}`, 'button button-primary button-small'));
            } else if (proposal.status === 'revision') {
                actions.append(button('Add document', `upload-${proposal.id}`, 'button button-quiet button-small'));
            }
        }
        if (currentUser.role === 'partner' && proposal.user_relationship === 'collaborator' && proposal.user_invitation_status === 'pending') {
            actions.append(
                button('Accept invitation', `collaborate-${proposal.id}-accepted`, 'button button-primary button-small'),
                button('Decline', `collaborate-${proposal.id}-declined`, 'button button-danger button-small')
            );
        }
        if (currentUser.role === 'admin' && ['submitted', 'under_review', 'revision', 'approved', 'active'].includes(proposal.status)) {
            actions.append(button('Invite partner', `invitepartner-${proposal.id}`, 'button button-quiet button-small'));
        }
        if (currentUser.role === 'admin' && ['submitted', 'under_review'].includes(proposal.status)) {
            const reviewNote = node('input');
            reviewNote.type = 'text';
            reviewNote.maxLength = 2000;
            reviewNote.placeholder = 'Optional review note';
            reviewNote.setAttribute('aria-label', `Review note for ${proposal.title}`);
            actions.append(reviewNote);
            if (proposal.status === 'submitted') actions.append(button('Start review', `review-${proposal.id}-under_review`));
            actions.append(button('Request revision', `review-${proposal.id}-revision`), button('Approve', `review-${proposal.id}-approved`), button('Reject', `review-${proposal.id}-rejected`, 'button button-danger button-small'));
        }
        if (currentUser.role === 'admin' && proposal.status === 'approved') {
            actions.append(button('Activate', `review-${proposal.id}-active`, 'button button-primary button-small'));
        }
        actionsCell.append(actions);
        row.append(titleCell, proposerCell, statusCell, datesCell, updatedCell, actionsCell);
        body.append(row);
    });
    table.append(body);
    tableWrap.append(table);
    const empty = node('div', proposals.length ? 'No proposals match these filters.' : 'No proposals to show yet.', 'empty proposal-empty');
    empty.hidden = proposals.length > 0;
    filters.addEventListener('input', () => filterProposalRows(body, filters, empty));
    filters.addEventListener('change', () => filterProposalRows(body, filters, empty));
    section.append(filters, tableWrap, empty);
    pageContent.append(section);
}

function createProposalWizard(categories, proposal = null) {
    const form = node('form', undefined, 'panel-form proposal-wizard-form');
    form.noValidate = true;
    form.innerHTML = `
        <div class="proposal-wizard-indicator" aria-live="polite">
            <div><span data-wizard-count>1</span> of 4 · <strong data-wizard-title>General Project Information</strong></div>
            <div class="proposal-wizard-progress"><span data-wizard-progress></span></div>
        </div>
        <section class="proposal-wizard-step" data-wizard-step="0">
            <h3>1. General Project Information</h3>
            <label>Project Name<input name="title" maxlength="190" required></label>
            <label class="wide">Brief Description<textarea name="summary" rows="3" maxlength="10000" required></textarea></label>
            <div class="wide proposal-list-editor"><div class="proposal-list-heading"><strong>Co-Proponents / Partner Entities</strong><button type="button" class="button button-quiet button-small" data-add-row="proponents">Add proponent</button></div><div data-proponents-list></div></div>
            <label>Program Start Date<input name="periodStart" type="date" required></label>
            <label>Program End Date<input name="periodEnd" type="date" required></label>
            <label class="wide">Program Duration / Term<input name="duration" maxlength="100" placeholder="Optional, e.g. 2-day program or 3 months"></label>
        </section>
        <section class="proposal-wizard-step" data-wizard-step="1" hidden>
            <h3>2. Activity Components &amp; Justification</h3>
            <div class="wide proposal-list-editor"><div class="proposal-list-heading"><strong>Activity Components / Steps</strong><button type="button" class="button button-quiet button-small" data-add-row="activities">Add activity</button></div><div data-activities-list></div></div>
            <label class="wide">Justification / Objectives<textarea name="justification" rows="6" maxlength="20000" placeholder="Describe the need, objectives, innovation, collaboration, and problem-solving approach." required></textarea></label>
        </section>
        <section class="proposal-wizard-step" data-wizard-step="2" hidden>
            <h3>3. Estimated Budget &amp; Cost Breakdown</h3>
            <p class="wide field-hint">Enter the quantity, unit or pax details, and cost per unit. Subtotals and the total are calculated automatically.</p>
            <div class="wide proposal-list-editor"><div class="proposal-list-heading"><strong>Budget Items</strong><button type="button" class="button button-quiet button-small" data-add-row="budget">Add budget item</button></div><div data-budget-list></div></div>
            <div class="wide proposal-budget-total"><span>Total Estimated Cost</span><strong data-budget-total>₱0.00</strong></div>
        </section>
        <section class="proposal-wizard-step" data-wizard-step="3" hidden>
            <h3>4. Beneficiaries, Outputs &amp; Risk Assessment</h3>
            <label class="wide">Target Beneficiaries &amp; Headcount<textarea name="targetBeneficiaries" rows="3" maxlength="10000" placeholder="Identify beneficiary groups and estimated headcount." required></textarea></label>
            <label class="wide">Target Outputs / Success Indicators<textarea name="targetOutputs" rows="3" maxlength="10000" placeholder="List measurable outputs or indicators of success." required></textarea></label>
            <label class="wide">Possible Risks &amp; Mitigation Plan<textarea name="possibleRisks" rows="3" maxlength="10000" placeholder="Describe possible risks and how they will be mitigated." required></textarea></label>
            <label class="wide">Expected Private / External Partner Involvement<textarea name="expectedPrivatePartnerships" rows="2" maxlength="10000" placeholder="Optional"></textarea></label>
            <fieldset class="wide choice-group proposal-choice-group"><legend>Project Classification (choose at least one)</legend><div data-classification-options></div></fieldset>
            <fieldset class="wide choice-group proposal-choice-group"><legend>CES Category (choose at least one)</legend><div data-category-options></div></fieldset>
        </section>
        <div class="proposal-wizard-actions">
            <button type="button" class="button button-quiet" data-wizard-back hidden>← Back</button>
            <button type="button" class="button button-primary" data-wizard-next>Next: Activity Components →</button>
            <button type="submit" class="button button-primary" data-wizard-submit hidden>Save Draft</button>
        </div>`;
    const classificationOptions = form.querySelector('[data-classification-options]');
    ['CES', 'Student Development'].forEach(value => {
        const label = node('label', value);
        const input = node('input');
        input.type = 'checkbox';
        input.name = 'classifications';
        input.value = value;
        input.checked = proposal?.classifications?.includes(value) || false;
        label.prepend(input);
        classificationOptions.append(label);
    });
    const categoryOptions = form.querySelector('[data-category-options]');
    categories.forEach(category => {
        const label = node('label', category.name);
        const input = node('input');
        input.type = 'checkbox';
        input.name = 'categoryIds';
        input.value = category.id;
        input.checked = proposal?.categoryIds?.includes(Number(category.id)) || false;
        label.prepend(input);
        categoryOptions.append(label);
    });

    form.elements.title.value = proposal?.title || '';
    form.elements.summary.value = proposal?.summary || '';
    form.elements.periodStart.value = proposal?.periodStart || '';
    form.elements.periodEnd.value = proposal?.periodEnd || '';
    form.elements.duration.value = proposal?.duration || '';
    form.elements.justification.value = proposal?.justification || '';
    form.elements.targetBeneficiaries.value = proposal?.targetBeneficiaries || '';
    form.elements.targetOutputs.value = proposal?.targetOutputs || '';
    form.elements.possibleRisks.value = proposal?.possibleRisks || '';
    form.elements.expectedPrivatePartnerships.value = proposal?.expectedPrivatePartnerships || '';
    (proposal?.proponents?.length ? proposal.proponents : ['']).forEach(value => addProposalTextRow(form, 'proponents', value));
    (proposal?.activityComponents?.length ? proposal.activityComponents : ['']).forEach(value => addProposalTextRow(form, 'activities', value));
    (proposal?.estimatedCostItems?.length ? proposal.estimatedCostItems : [{}]).forEach(value => addProposalBudgetRow(form, value));

    const titles = ['General Project Information', 'Activity Components & Justification', 'Estimated Budget & Cost Breakdown', 'Beneficiaries, Outputs & Risk Assessment'];
    let activeStep = 0;
    const showStep = index => {
        activeStep = index;
        showProposalWizardStep(form, index, titles);
    };
    const validateStep = index => {
        const step = form.querySelector(`[data-wizard-step="${index}"]`);
        const invalid = Array.from(step.querySelectorAll('input[required], textarea[required], select[required]')).find(input => !input.checkValidity());
        if (invalid) {
            invalid.reportValidity();
            invalid.focus();
            return false;
        }
        if (index === 0 && !form.querySelector('[data-proponents-list] input').value.trim()) {
            form.querySelector('[data-proponents-list] input').setCustomValidity('Add at least one co-proponent or partner entity.');
            form.querySelector('[data-proponents-list] input').reportValidity();
            form.querySelector('[data-proponents-list] input').setCustomValidity('');
            return false;
        }
        if (index === 1 && !Array.from(step.querySelectorAll('[data-activities-list] textarea')).some(input => input.value.trim())) {
            showMessage(pageMessage, 'Add at least one activity component or step.', 'error');
            return false;
        }
        if (index === 2 && !Array.from(form.querySelectorAll('[data-budget-list] input')).every(input => input.checkValidity())) {
            const invalidBudgetInput = Array.from(form.querySelectorAll('[data-budget-list] input')).find(input => !input.checkValidity());
            invalidBudgetInput?.reportValidity();
            return false;
        }
        if (index === 3) {
            if (!step.querySelectorAll('[name="classifications"]:checked').length || !step.querySelectorAll('[name="categoryIds"]:checked').length) {
                showMessage(pageMessage, 'Select at least one project classification and CES category.', 'error');
                return false;
            }
        }
        clearMessage(pageMessage);
        return true;
    };
    form.querySelector('[data-wizard-next]').addEventListener('click', event => {
        event.preventDefault();
        activeStep = Number(form.dataset.activeWizardStep || 0);
        if (validateStep(activeStep)) showStep(Math.min(activeStep + 1, titles.length - 1));
    });
    form.querySelector('[data-wizard-back]').addEventListener('click', event => {
        event.preventDefault();
        activeStep = Number(form.dataset.activeWizardStep || 0);
        showStep(Math.max(activeStep - 1, 0));
    });
    form.addEventListener('click', event => {
        const add = event.target.closest('[data-add-row]');
        if (add) {
            if (add.dataset.addRow === 'proponents') addProposalTextRow(form, 'proponents');
            if (add.dataset.addRow === 'activities') addProposalTextRow(form, 'activities');
            if (add.dataset.addRow === 'budget') addProposalBudgetRow(form);
            return;
        }
        const remove = event.target.closest('[data-remove-row]');
        if (remove) {
            const rows = remove.closest('[data-row-list]').querySelectorAll('[data-editor-row]');
            if (rows.length > 1) remove.closest('[data-editor-row]').remove();
            updateProposalBudgetTotal(form);
        }
    });
    form.addEventListener('input', event => {
        if (event.target.matches('[data-budget-cost], [data-budget-quantity]')) updateProposalBudgetTotal(form);
        if (event.target.name === 'periodStart') form.elements.periodEnd.min = event.target.value;
    });
    form.elements.periodEnd.min = form.elements.periodStart.value;
    updateProposalBudgetTotal(form);
    showStep(0);
    return form;
}

function showProposalWizardStep(form, index, titles = [
    'General Project Information',
    'Activity Components & Justification',
    'Estimated Budget & Cost Breakdown',
    'Beneficiaries, Outputs & Risk Assessment'
]) {
    form.dataset.activeWizardStep = String(index);
    form.querySelectorAll('[data-wizard-step]').forEach((step, stepIndex) => {
        step.hidden = stepIndex !== index;
    });
    form.querySelector('[data-wizard-count]').textContent = String(index + 1);
    form.querySelector('[data-wizard-title]').textContent = titles[index];
    form.querySelector('[data-wizard-progress]').style.width = `${((index + 1) / titles.length) * 100}%`;
    form.querySelector('[data-wizard-back]').hidden = index === 0;
    form.querySelector('[data-wizard-next]').hidden = index === titles.length - 1;
    form.querySelector('[data-wizard-submit]').hidden = index !== titles.length - 1;
    const nextLabels = [
        'Next: Activity Components →',
        'Next: Estimated Budget →',
        'Next: Beneficiaries & Risks →'
    ];
    if (index < nextLabels.length) {
        form.querySelector('[data-wizard-next]').textContent = nextLabels[index];
    }
    const activeStep = form.querySelector(`[data-wizard-step="${index}"]`);
    activeStep.classList.remove('wizard-step-enter');
    requestAnimationFrame(() => activeStep.classList.add('wizard-step-enter'));
}

function addProposalTextRow(form, listName, value = '') {
    const listSelector = listName === 'proponents' ? '[data-proponents-list]' : '[data-activities-list]';
    const row = node('div', undefined, 'proposal-editor-row');
    row.dataset.editorRow = '';
    const input = node(listName === 'activities' ? 'textarea' : 'input');
    input.required = true;
    input.value = value;
    input.maxLength = listName === 'activities' ? 1000 : 190;
    input.placeholder = listName === 'activities' ? 'Describe an activity or project step' : 'e.g., UCC + City Government of Caloocan';
    input.setAttribute('aria-label', listName === 'activities' ? 'Activity component or step' : 'Co-proponent or partner entity');
    input.dataset.wizardValue = listName;
    if (listName === 'activities') input.rows = 2;
    row.append(input, proposalRemoveButton());
    const list = form.querySelector(listSelector);
    list.dataset.rowList = '';
    list.append(row);
}

function addProposalBudgetRow(form, item = {}) {
    const row = node('div', undefined, 'proposal-budget-row');
    row.dataset.editorRow = '';
    const fields = [
        ['description', 'Item description', 'text', item.description || '', '255'],
        ['unit', 'Unit / pax details', 'text', item.unit || '', '100'],
        ['quantity', 'Quantity', 'number', item.quantity ?? '', ''],
        ['cost', 'Cost per unit (₱)', 'number', item.cost ?? '', '']
    ];
    fields.forEach(([key, placeholder, type, value, maxLength]) => {
        const input = node('input');
        input.type = type;
        input.placeholder = placeholder;
        input.value = value;
        input.required = true;
        input.setAttribute('aria-label', placeholder);
        input.dataset.budgetField = key;
        if (maxLength) input.maxLength = Number(maxLength);
        if (type === 'number') {
            input.min = key === 'quantity' ? '0.01' : '0';
            input.step = '0.01';
            input.dataset[key === 'cost' ? 'budgetCost' : 'budgetQuantity'] = '';
        }
        row.append(input);
    });
    const subtotal = node('small', '₱0.00', 'proposal-budget-subtotal');
    subtotal.dataset.budgetSubtotal = '';
    row.append(subtotal, proposalRemoveButton());
    const list = form.querySelector('[data-budget-list]');
    list.dataset.rowList = '';
    list.append(row);
}

function proposalRemoveButton() {
    const remove = node('button', 'Remove', 'button button-quiet button-small proposal-remove-row');
    remove.type = 'button';
    remove.dataset.removeRow = '';
    remove.setAttribute('aria-label', 'Remove row');
    return remove;
}

function updateProposalBudgetTotal(form) {
    let cents = 0;
    form.querySelectorAll('[data-editor-row]').forEach(row => {
        if (!row.querySelector('[data-budget-cost]')) return;
        const quantity = Number(row.querySelector('[data-budget-quantity]').value) || 0;
        const cost = Number(row.querySelector('[data-budget-cost]').value) || 0;
        const subtotal = Math.round(quantity * cost * 100);
        cents += subtotal;
        row.querySelector('[data-budget-subtotal]').textContent = `₱${(subtotal / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    });
    form.querySelector('[data-budget-total]').textContent = `₱${(cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function serializeProposalWizard(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.proponents = Array.from(form.querySelectorAll('[data-proponents-list] input')).map(input => input.value.trim()).filter(Boolean);
    data.activityComponents = Array.from(form.querySelectorAll('[data-activities-list] textarea')).map(input => input.value.trim()).filter(Boolean);
    data.estimatedCostItems = Array.from(form.querySelectorAll('[data-budget-list] [data-editor-row]')).map(row => ({
        description: row.querySelector('[data-budget-field="description"]').value.trim(),
        unit: row.querySelector('[data-budget-field="unit"]').value.trim(),
        quantity: row.querySelector('[data-budget-field="quantity"]').value,
        cost: row.querySelector('[data-budget-field="cost"]').value
    }));
    data.classifications = formData.getAll('classifications');
    data.categoryIds = formData.getAll('categoryIds');
    return data;
}

function validateCompleteProposalWizard(form) {
    for (let index = 0; index < 4; index++) {
        const step = form.querySelector(`[data-wizard-step="${index}"]`);
        const invalid = Array.from(step.querySelectorAll('input[required], textarea[required]')).find(input => !input.checkValidity());
        if (invalid) {
            showProposalWizardStep(form, index);
            invalid.reportValidity();
            invalid.focus();
            return false;
        }
        if (index === 0 && !Array.from(step.querySelectorAll('[data-proponents-list] input')).some(input => input.value.trim())) {
            showProposalWizardStep(form, index);
            const input = step.querySelector('[data-proponents-list] input');
            input.setCustomValidity('Add at least one co-proponent or partner entity.');
            input.reportValidity();
            input.setCustomValidity('');
            return false;
        }
        if (index === 1 && !Array.from(step.querySelectorAll('[data-activities-list] textarea')).some(input => input.value.trim())) {
            showProposalWizardStep(form, index);
            showMessage(pageMessage, 'Add at least one activity component or step.', 'error');
            return false;
        }
        if (index === 3 && (!step.querySelectorAll('[name="classifications"]:checked').length || !step.querySelectorAll('[name="categoryIds"]:checked').length)) {
            showProposalWizardStep(form, index);
            showMessage(pageMessage, 'Select at least one project classification and CES category.', 'error');
            return false;
        }
    }
    clearMessage(pageMessage);
    return true;
}

function filterProposalRows(tableBody, filters, emptyState) {
    const search = filters.querySelector('[name="search"]').value.trim().toLocaleLowerCase();
    const status = filters.querySelector('[name="status"]').value;
    let visible = 0;
    tableBody.querySelectorAll('tr').forEach(row => {
        const matches = (!search || row.dataset.search.includes(search)) && (!status || row.dataset.status === status);
        row.hidden = !matches;
        if (matches) visible++;
    });
    emptyState.hidden = visible > 0;
}

async function editProposal(proposalId) {
    const [{ proposal }, { categories }] = await Promise.all([
        request(`/proposals/${proposalId}/edit-data`),
        request('/categories')
    ]);
    const section = panel('Edit draft proposal', 'Update the Project Brief fields. Your existing selections are preserved.');
    section.classList.add('proposal-edit-panel');
    const form = createProposalWizard(categories, proposal);
    form.querySelector('[data-wizard-submit]').textContent = 'Save Changes';
    const cancel = node('button', 'Cancel', 'button button-quiet');
    cancel.type = 'button';
    cancel.addEventListener('click', () => section.remove());
    form.querySelector('.proposal-wizard-actions').append(cancel);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateCompleteProposalWizard(form)) return;
        setBusy(form, true);
        try {
            await request(`/proposals/${proposalId}`, {
                method: 'PUT',
                body: JSON.stringify(serializeProposalWizard(form))
            });
            section.remove();
            showMessage(pageMessage, 'Draft proposal updated.');
            await renderPage('proposals');
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });
    section.append(form);
    pageContent.prepend(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function createProposal(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateCompleteProposalWizard(form)) return;
    const data = serializeProposalWizard(form);
    setBusy(form, true);
    try {
        await request('/proposals', { method: 'POST', body: JSON.stringify(data) });
        await renderPage('proposals');
        showMessage(pageMessage, 'Draft saved.');
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    } finally {
        setBusy(form, false);
    }
}

async function renderDirectory() {
    const { partners, sectors = [] } = await request('/directory');
    const section = panel('Partner catalog', 'Explore approved organizations, connect with potential co-proponents, and view their CES collaboration history.');
    section.classList.add('partner-catalog');
    const toolbar = node('div', undefined, 'partner-catalog-toolbar');
    const intro = node('div', undefined, 'partner-catalog-intro');
    intro.append(node('span', `${partners.length} approved organizations`, 'partner-catalog-count'));
    const toolbarActions = node('div', undefined, 'partner-catalog-actions');
    if (currentUser.role === 'admin') {
        const manage = button('Manage sectors', 'manage-sectors', 'button button-quiet');
        manage.addEventListener('click', () => openSectorManager(sectors));
        toolbarActions.append(manage);
    }
    toolbar.append(intro, toolbarActions);

    const filters = node('div', undefined, 'directory-toolbar');
    const categories = [
        ['UCC Academic Units', 'UCC Department / Academic Unit'],
        ['Local Government Units (LGU / Barangay)', 'Local Government Unit (LGU / Barangay)'],
        ['Government Agencies (e.g., MMDA, DSWD)', 'Government Agency (e.g., MMDA, DSWD)'],
        ['NGOs / Non-Profits', 'NGO / Non-Profit Organization'],
        ['Private Sector / Corporate Partners', 'Private Sector / Corporate Partner']
    ];
    const searchLabel = node('label', 'Search partners');
    const search = node('input');
    search.type = 'search';
    search.name = 'search';
    search.placeholder = 'Partner, representative, email, phone, or location';
    searchLabel.append(search);
    const categoryLabel = node('label', 'Organization category');
    const categoryFilter = node('select');
    categoryFilter.name = 'category';
    categoryFilter.add(new Option('All Partners', ''));
    categories.forEach(([label, value]) => categoryFilter.add(new Option(label, value)));
    categoryLabel.append(categoryFilter);
    const statusLabel = node('label', 'Partnership activity');
    const statusFilter = node('select');
    statusFilter.name = 'status';
    statusFilter.add(new Option('All activity', ''));
    statusFilter.add(new Option('Active Partner', 'active'));
    statusFilter.add(new Option('Inactive / Past Partner', 'inactive'));
    statusLabel.append(statusFilter);
    filters.append(searchLabel, categoryLabel, statusLabel);

    const list = node('div', undefined, 'partner-catalog-grid');
    partners.forEach(partner => {
        const category = partner.organization_category || partner.organization_type || 'Other';
        const active = Number(partner.active_project_count || 0) > 0 || Number(partner.upcoming_event_count || 0) > 0;
        const searchable = [
            partner.organization_name, partner.first_name, partner.last_name, partner.official_designation,
            partner.email, partner.contact_number,
            partner.address, category, partner.sectors, partner.subcategories
        ].filter(Boolean).join(' ').toLocaleLowerCase();
        const card = node('article', undefined, 'partner-catalog-card');
        card.dataset.search = searchable;
        card.dataset.category = category;
        card.dataset.status = active ? 'active' : 'inactive';
        const cardHeader = node('div', undefined, 'partner-card-header');
        const initials = partner.organization_name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toLocaleUpperCase();
        cardHeader.append(node('span', initials || 'P', 'partner-logo-placeholder'));
        const badges = node('div', undefined, 'partner-card-badges');
        badges.append(
            node('span', category.replace(/\s*\(e\.g\.,[^)]*\)/i, ''), 'badge partner-category-badge'),
            node('span', active ? 'Active partner' : 'Past partner', `badge partner-activity-badge ${active ? 'is-active' : 'is-inactive'}`)
        );
        cardHeader.append(badges);
        const cardInfo = node('div', undefined, 'partner-card-info');
        cardInfo.append(node('h3', partner.organization_name));
        const representative = [partner.first_name, partner.last_name].filter(Boolean).join(' ');
        cardInfo.append(node('p', [representative, partner.official_designation].filter(Boolean).join(' · ') || 'Representative not listed'));
        const contact = node('div', undefined, 'partner-card-contact');
        contact.append(
            node('span', partner.email || 'Email not listed'),
            node('span', partner.contact_number || 'Phone not listed'),
            node('span', partner.address || 'Location not listed')
        );
        const stats = node('div', undefined, 'partner-card-stats');
        stats.append(
            node('div', `${Number(partner.active_project_count || 0)} active · ${Number(partner.completed_project_count || 0)} completed CES projects`, 'partner-card-stat'),
            node('div', `${Number(partner.upcoming_event_count || 0)} upcoming · ${Number(partner.past_event_count || 0)} past events`, 'partner-card-stat')
        );
        const actions = node('div', undefined, 'partner-card-actions');
        const view = button('View Organization Profile', `viewpartner-${partner.id}`, 'button button-primary button-small');
        view.addEventListener('click', () => showPartnerProfile(Number(partner.id), sectors));
        actions.append(view);
        card.append(cardHeader, cardInfo, contact, stats, actions);
        list.append(card);
    });

    const empty = node('div', partners.length ? 'No partners match the selected filters.' : 'No approved partners are listed yet.', 'empty partner-catalog-empty');
    empty.hidden = partners.length > 0;
    const applyFilters = () => {
        const query = search.value.trim().toLocaleLowerCase();
        let visibleCount = 0;
        list.querySelectorAll('.partner-catalog-card').forEach(card => {
            const matches = (!query || card.dataset.search.includes(query))
                && (!categoryFilter.value || card.dataset.category === categoryFilter.value)
                && (!statusFilter.value || card.dataset.status === statusFilter.value);
            card.hidden = !matches;
            if (matches) visibleCount++;
        });
        empty.hidden = visibleCount > 0;
    };
    filters.addEventListener('input', applyFilters);
    filters.addEventListener('change', applyFilters);
    section.append(toolbar, filters, list, empty);
    pageContent.append(section);
}

function openSectorManager(sectors) {
    document.querySelector('#sector-manager-modal')?.remove();
    const dialog = node('dialog', undefined, 'sector-manager-modal');
    dialog.id = 'sector-manager-modal';
    dialog.setAttribute('aria-labelledby', 'sector-manager-title');
    const content = node('div', undefined, 'sector-manager-content');
    const header = node('header', undefined, 'sector-manager-header');
    const heading = node('div');
    heading.append(node('p', 'DIRECTORY SETTINGS', 'eyebrow'));
    const title = node('h2', 'Manage sectors');
    title.id = 'sector-manager-title';
    heading.append(title);
    const close = button('×', 'close-sector-manager', 'button button-quiet sector-manager-close');
    close.setAttribute('aria-label', 'Close sector manager');
    header.append(heading, close);

    const forms = node('div', undefined, 'sector-manager-forms');
    const sectorForm = node('form', undefined, 'sector-manager-form');
    sectorForm.innerHTML = '<label>New sector<input name="name" maxlength="120" placeholder="e.g., Education and Skills" required></label><button class="button button-primary" type="submit">Add sector</button>';
    const subcategoryForm = node('form', undefined, 'sector-manager-form');
    subcategoryForm.innerHTML = '<label>Parent sector<select name="sectorId" required></select></label><label>New subcategory<input name="name" maxlength="120" placeholder="e.g., Digital literacy" required></label><button class="button button-primary" type="submit">Add subcategory</button>';
    const sectorOptions = new Map();
    sectors.forEach(item => sectorOptions.set(String(item.sector_id), item.sector_name));
    Array.from(sectorOptions.entries()).sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
        subcategoryForm.elements.sectorId.add(new Option(name, id));
    });
    const message = node('p', '', 'sector-manager-message');
    message.hidden = true;
    const onSubmit = (form, payload, successMessage) => {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            try {
                await request('/directory', { method: 'POST', body: JSON.stringify(payload(form)) });
                dialog.close();
                await renderPage('directory');
                showMessage(pageMessage, successMessage);
            } catch (error) {
                message.textContent = error.message;
                message.className = 'sector-manager-message is-error';
                message.hidden = false;
            } finally {
                submitButton.disabled = false;
            }
        });
    };
    onSubmit(sectorForm, form => ({ type: 'sector', name: form.elements.name.value }), 'Sector added.');
    onSubmit(subcategoryForm, form => ({
        type: 'subcategory',
        sectorId: form.elements.sectorId.value,
        name: form.elements.name.value
    }), 'Subcategory added.');
    forms.append(sectorForm, subcategoryForm);

    const list = node('section', undefined, 'sector-manager-list');
    list.append(node('h3', 'Current sectors and subcategories'));
    const grouped = new Map();
    sectors.forEach(item => {
        const key = String(item.sector_id);
        if (!grouped.has(key)) grouped.set(key, { name: item.sector_name, subcategories: [] });
        if (item.subcategory_name) grouped.get(key).subcategories.push(item.subcategory_name);
    });
    if (!grouped.size) {
        list.append(node('p', 'No sectors have been created yet.'));
    } else {
        grouped.forEach(group => {
            const row = node('div', undefined, 'sector-manager-row');
            row.append(node('strong', group.name), node('span', group.subcategories.join(' · ') || 'No subcategories'));
            list.append(row);
        });
    }
    const footer = node('footer', undefined, 'sector-manager-footer');
    const done = button('Done', 'close-sector-manager', 'button button-quiet');
    footer.append(done);
    content.append(header, message, forms, list, footer);
    dialog.append(content);
    dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-action="close-sector-manager"]')) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

async function showPartnerProfile(partnerId, sectors) {
    try {
        const { partner, projects } = await request(`/directory/${partnerId}`);
        document.querySelector('#partner-profile-modal')?.remove();
        const dialog = node('dialog', undefined, 'partner-profile-modal');
        dialog.id = 'partner-profile-modal';
        dialog.setAttribute('aria-labelledby', 'partner-profile-title');
        const content = node('div', undefined, 'partner-profile-content');
        const header = node('header', undefined, 'partner-profile-header');
        const heading = node('div', undefined, 'partner-profile-heading');
        const eyebrow = node('p', 'PARTNER ORGANIZATION', 'eyebrow');
        const title = node('h2', partner.organization_name);
        title.id = 'partner-profile-title';
        const meta = node('div', undefined, 'partner-profile-meta');
        meta.append(
            node('span', partner.organization_category || partner.organization_type, 'badge partner-category-badge'),
            node('span', partner.sectors || 'Unclassified')
        );
        heading.append(eyebrow, title, meta);
        const close = button('×', 'close-partner-profile', 'button button-quiet partner-profile-close');
        close.setAttribute('aria-label', 'Close organization profile');
        header.append(heading, close);

        const body = node('div', undefined, 'partner-profile-body');
        const details = node('section', undefined, 'partner-profile-section');
        details.append(node('h3', 'Organization details'));
        const detailGrid = node('dl', undefined, 'partner-profile-detail-grid');
        [
            ['Category', partner.organization_category || partner.organization_type || 'Not listed'],
            ['Sector tags', partner.subcategories || partner.sectors || 'Not classified'],
            ['Representative', [partner.first_name, partner.last_name].filter(Boolean).join(' ') || 'Not listed'],
            ['Designation', partner.official_designation || 'Not listed'],
            ['Email', partner.email || 'Not listed'],
            ['Phone', partner.contact_number || 'Not listed'],
            ['Location', partner.address || 'Not listed'],
            ['Account status', partner.account_status || 'approved']
        ].forEach(([label, value]) => {
            detailGrid.append(node('dt', label), node('dd', value));
        });
        details.append(detailGrid);

        const verification = node('section', undefined, 'partner-profile-section');
        verification.append(node('h3', 'Verification & agreements'));
        const signedMoa = projects.reduce((sum, project) => sum + Number(project.signed_moa_count || 0), 0);
        const signedMou = projects.reduce((sum, project) => sum + Number(project.signed_mou_count || 0), 0);
        verification.append(
            node('p', partner.verification_available ? 'Organization verification document is on file.' : 'No organization verification document is on file.'),
            node('p', `${signedMoa} signed MOA · ${signedMou} signed MOU across approved collaborations.`)
        );
        if (currentUser.role === 'admin' && partner.verification_available) {
            const proof = node('a', 'View verification document', 'button button-quiet button-small');
            proof.href = `api/accounts/${partner.id}/proof`;
            proof.target = '_blank';
            proof.rel = 'noopener';
            verification.append(proof);
        }

        const collaborations = node('section', undefined, 'partner-profile-section');
        collaborations.append(node('h3', 'CES proposals & events'));
        if (!projects.length) {
            collaborations.append(node('p', 'No approved or active co-hosted projects yet.'));
        } else {
            const projectList = node('div', undefined, 'partner-project-list');
            projects.forEach(project => {
                const card = node('article', undefined, 'partner-project-card');
                const projectTitle = node('div', undefined, 'partner-project-title');
                projectTitle.append(
                    node('strong', project.title),
                    node('span', project.status.replaceAll('_', ' '), `badge proposal-status status-${project.status}`)
                );
                const dates = project.period_start
                    ? `${project.period_start}${project.period_end ? ` to ${project.period_end}` : ''}`
                    : 'Dates not scheduled';
                card.append(projectTitle, node('p', dates), node('small', project.events || 'No linked events yet.'));
                projectList.append(card);
            });
            collaborations.append(projectList);
        }
        body.append(details, verification, collaborations);

        if (currentUser.role === 'admin') {
            const manage = node('details', undefined, 'partner-profile-admin');
            manage.append(node('summary', 'Edit organization profile and sectors'));
            const form = node('form', undefined, 'partner-profile-edit-form');
            const nameLabel = node('label', 'Organization name');
            const nameInput = node('input');
            nameInput.name = 'organizationName';
            nameInput.maxLength = 190;
            nameInput.required = true;
            nameInput.value = partner.organization_name;
            nameLabel.append(nameInput);
            const typeLabel = node('label', 'Organization category');
            const typeSelect = node('select');
            typeSelect.name = 'organizationCategory';
            [
                'UCC Department / Academic Unit',
                'Local Government Unit (LGU / Barangay)',
                'Government Agency (e.g., MMDA, DSWD)',
                'NGO / Non-Profit Organization',
                'Private Sector / Corporate Partner',
                'Other'
            ].forEach(category => typeSelect.add(new Option(category, category)));
            typeSelect.value = partner.organization_category || 'Other';
            typeLabel.append(typeSelect);
            const addressLabel = node('label', 'Location / address');
            const addressInput = node('input');
            addressInput.name = 'address';
            addressInput.maxLength = 500;
            addressInput.value = partner.address || '';
            addressLabel.append(addressInput);
            const subcategoryLabel = node('label', 'Sector subcategories');
            const subcategorySelect = node('select');
            subcategorySelect.name = 'subcategoryIds';
            subcategorySelect.multiple = true;
            subcategorySelect.size = Math.min(6, Math.max(3, sectors.filter(item => item.subcategory_id !== null).length));
            const assigned = new Set((partner.subcategory_ids || '').split(',').filter(Boolean));
            sectors.filter(item => item.subcategory_id !== null).forEach(item => {
                const option = new Option(`${item.sector_name} / ${item.subcategory_name}`, item.subcategory_id);
                option.selected = assigned.has(String(item.subcategory_id));
                subcategorySelect.add(option);
            });
            subcategoryLabel.append(subcategorySelect);
            const save = button('Save profile', '', 'button button-primary button-small');
            save.removeAttribute('data-action');
            save.type = 'submit';
            form.append(nameLabel, typeLabel, addressLabel, subcategoryLabel, save);
            form.addEventListener('submit', async event => {
                event.preventDefault();
                save.disabled = true;
                try {
                    await request(`/directory/${partner.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            organizationName: nameInput.value,
                            organizationCategory: typeSelect.value,
                            address: addressInput.value,
                            subcategoryIds: Array.from(subcategorySelect.selectedOptions, option => option.value)
                        })
                    });
                    dialog.close();
                    await renderPage('directory');
                    showMessage(pageMessage, 'Partner organization profile and classifications updated.');
                } catch (error) {
                    let errorNotice = form.querySelector('.partner-profile-error');
                    if (!errorNotice) {
                        errorNotice = node('p', undefined, 'partner-profile-error notice error');
                        form.prepend(errorNotice);
                    }
                    errorNotice.textContent = error.message;
                } finally {
                    save.disabled = false;
                }
            });
            body.append(manage, form);
        }
        const footer = node('footer', undefined, 'partner-profile-footer');
        footer.append(button('Close', 'close-partner-profile', 'button button-quiet'));
        content.append(header, body, footer);
        dialog.append(content);
        dialog.addEventListener('click', event => {
            if (event.target === dialog || event.target.closest('[data-action="close-partner-profile"]')) dialog.close();
        });
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.append(dialog);
        dialog.showModal();
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    }
}

async function renderEvents() {
    if (currentUser.role === 'admin') {
        const month = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit'
        }).format(new Date());
        const dashboard = await request(`/events/admin-dashboard?month=${encodeURIComponent(month)}`);
        renderAdminEventsDashboard(dashboard);
        return;
    }
    if (currentUser.role === 'partner') {
        const section = panel('Schedule an event', 'Create event dates and at least one activity for each date. Events require an approved project.');
        const form = node('form', undefined, 'panel-form');
        form.innerHTML = '<label>Approved project<select name="proposalId" required><option value="">Choose a project</option></select></label><label>Event title<input name="eventTitle" required></label><label>Volunteer capacity<input name="capacity" type="number" min="1" required></label><label>Applications open<input name="applicationsOpenAt" type="datetime-local"></label><label>Applications close<input name="applicationsCloseAt" type="datetime-local"></label><label class="wide">Description<textarea name="description" rows="2"></textarea></label><div class="wide event-date-list"></div><div class="wide event-form-actions"><button class="button button-quiet" type="button" data-add-date>Add event date</button><button class="button button-primary" type="submit">Create event</button></div>';
        const { proposals } = await request('/proposals');
        proposals.filter(proposal => ['approved', 'active'].includes(proposal.status) &&
            (Number(proposal.owner_user_id) === currentUser.id || proposal.user_invitation_status === 'accepted'))
            .forEach(proposal => form.elements.proposalId.add(new Option(proposal.title, proposal.id)));
        const dateList = form.querySelector('.event-date-list');
        addEventDateEditor(dateList);
        form.querySelector('[data-add-date]').addEventListener('click', () => addEventDateEditor(dateList));
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form));
            const dateEditors = Array.from(dateList.querySelectorAll('.event-date-editor'));
            const dateValues = dateEditors.map(dateEditor => dateEditor.querySelector('[name="date"]').value);
            if (!dateEditors.length || dateValues.some(date => !date) || new Set(dateValues).size !== dateValues.length) {
                showMessage(pageMessage, 'Add at least one unique event date.', 'error');
                return;
            }
            const payload = {
                proposalId: values.proposalId,
                title: values.eventTitle,
                capacity: Number(values.capacity),
                description: values.description,
                applicationsOpenAt: values.applicationsOpenAt,
                applicationsCloseAt: values.applicationsCloseAt,
                dates: dateEditors.map(dateEditor => ({
                    date: dateEditor.querySelector('[name="date"]').value,
                    activities: Array.from(dateEditor.querySelectorAll('.event-activity-editor'), activityEditor => {
                        const activity = Object.fromEntries(Array.from(activityEditor.querySelectorAll('[name]'), input => [input.name, input.value]));
                        activity.targetParticipants = activity.targetParticipants === '' ? null : Number(activity.targetParticipants);
                        return activity;
                    })
                }))
            };
            try {
                await request('/events', { method: 'POST', body: JSON.stringify(payload) });
                await renderPage('events');
                showMessage(pageMessage, 'Event scheduled.');
            } catch (error) {
                showMessage(pageMessage, error.message, 'error');
            }
        });
        section.append(form);
        pageContent.append(section);
    } else if (currentUser.role === 'volunteer') {
        const scan = panel('Record attendance', 'Paste the event-date QR payload after scanning it with a QR reader.');
        const form = node('form', undefined, 'scan-form');
        form.innerHTML = '<label>QR payload<input name="payload" placeholder=\'{"eventDateId":1,"token":"…"}\' required></label><button class="button button-quiet" type="button" data-action="camera">Use camera</button><video id="qr-camera" class="qr-camera" playsinline muted hidden></video><button class="button button-primary" type="submit">Check in</button>';
        form.addEventListener('submit', async event => {
            event.preventDefault();
            try {
                const parsed = JSON.parse(new FormData(form).get('payload'));
                await request('/attendance/scan', { method: 'POST', body: JSON.stringify(parsed) });
                showMessage(pageMessage, 'Attendance recorded.');
                form.reset();
            } catch (error) {
                showMessage(pageMessage, error instanceof SyntaxError ? 'Enter a valid QR payload.' : error.message, 'error');
            }
        });
        scan.append(form);
        pageContent.append(scan);
    }
    const { events } = await request('/events');
    if (!events.length) {
        pageContent.append(node('div', currentUser.role === 'partner' ? 'No events have been scheduled for your projects yet.' : 'No active project events are available.', 'empty'));
        if (currentUser.role === 'partner') {
            await renderPartnerEventsDashboard(events);
        }
        return;
    }
    const list = node('div', undefined, 'record-list');
    for (const item of events) {
        const record = node('article', undefined, 'record');
        const info = node('div', undefined, 'record-main');
        const details = [
            item.project_title,
            item.next_event_date ? `Next date ${dashboardDate(item.next_event_date, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No dates scheduled',
            `${item.approved_applications} approved · capacity ${item.capacity}`
        ];
        if (currentUser.role === 'volunteer') {
            details.push(item.application_status ? `Application: ${item.application_status}` : 'Not applied');
            details.push(Number(item.attendance_count) ? 'Attendance recorded' : '');
        }
        info.append(node('strong', item.title), node('small', details.filter(Boolean).join(' · ')));
        const actions = node('div', undefined, 'record-actions');
        if (currentUser.role === 'volunteer') {
            if (!item.application_status && Number(item.approved_applications) < Number(item.capacity)) {
                actions.append(button('Apply', `apply-${item.id}`, 'button button-primary button-small'));
            }
            actions.append(button('Event dates', `dates-${item.id}`, 'button button-quiet button-small'));
            actions.append(button('My certificates', `certificates-${item.id}`));
        } else if (currentUser.role === 'partner') {
            actions.append(
                button('Attendees', `attendees-${item.id}`, 'button button-quiet button-small'),
                button('Dates / attendance', `dates-${item.id}`, 'button button-quiet button-small'),
                button('Export attendance', `attendexport-${item.id}`, 'button button-quiet button-small')
            );
        } else {
            actions.append(button('Applications', `applications-${item.id}`), button('Dates / attendance', `dates-${item.id}`), button('Certificates', `certificates-${item.id}`));
        }
        record.append(info, actions);
        list.append(record);
    }
    pageContent.append(list);
    if (currentUser.role === 'partner') {
        await renderPartnerEventsDashboard(events);
    }
}

function renderAdminEventsDashboard(data) {
    const metrics = node('section', undefined, 'admin-event-metrics');
    [
        ['scheduled_events', 'Scheduled / Ongoing Events', data.metrics.scheduled_events, 'Events with dates today or ahead'],
        ['registered_volunteers', 'Registered Volunteers', data.metrics.registered_volunteers, 'Unique applicants across active programs'],
        ['attendance_headcount', 'Attendance Headcount', data.metrics.attendance_headcount, 'Volunteers present and community participants'],
        ['completed_programs', 'Completed Programs', data.metrics.completed_programs, 'All scheduled event dates have passed']
    ].forEach(([key, label, value, hint]) => {
        const card = node('article', undefined, 'admin-event-metric');
        card.dataset.metric = key;
        card.append(node('span', label), node('strong', Number(value || 0).toLocaleString()), node('small', hint));
        metrics.append(card);
    });
    pageContent.append(metrics);

    const calendarPanel = panel('Calendar of Events', 'Approved and active university and partner extension activities.');
    calendarPanel.classList.add('admin-event-calendar-panel');
    const calendar = node('div', undefined, 'admin-event-calendar');
    calendarPanel.append(calendar);
    pageContent.append(calendarPanel);

    const volunteerPanel = panel('Volunteer Applications', 'Review registrations and volunteer affiliations for each community project.');
    volunteerPanel.classList.add('admin-volunteer-review-panel');
    const volunteerList = node('div', undefined, 'admin-volunteer-review-list');
    if (!data.events.length) volunteerList.append(node('div', 'No approved or active events are available.', 'empty'));
    data.events.forEach(item => {
        const record = node('article', undefined, 'admin-volunteer-review-row');
        const info = node('div', undefined, 'record-main');
        info.append(node('strong', item.title), node('small', `${item.project_title} · ${item.partner_name || 'UCC / University program'}`));
        record.append(info, button('Review volunteers', `applications-${item.id}`, 'button button-quiet button-small'));
        volunteerList.append(record);
    });
    volunteerPanel.append(volunteerList);
    pageContent.append(volunteerPanel);

    const eventsPanel = panel('Event Management', 'Filter the university-wide event register and open attendance or volunteer records.');
    eventsPanel.classList.add('admin-event-management-panel');
    const toolbar = node('div', undefined, 'admin-event-filter-toolbar');
    const searchLabel = node('label', 'Search events, programs, or partners');
    const search = node('input');
    search.type = 'search';
    search.name = 'search';
    search.placeholder = 'Search by event, program, partner, or department';
    searchLabel.append(search);
    const statusLabel = node('label', 'Event status');
    const status = node('select');
    [['all', 'All statuses'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['completed', 'Completed']].forEach(([value, label]) => status.add(new Option(label, value)));
    statusLabel.append(status);
    const partnerLabel = node('label', 'Partner / Department');
    const partner = node('select');
    partner.add(new Option('All partners / departments', ''));
    [...new Set(data.events.map(item => item.partner_name).filter(Boolean).flatMap(name => name.split(', ')))].sort((a, b) => a.localeCompare(b))
        .forEach(name => partner.add(new Option(name, name)));
    partnerLabel.append(partner);
    toolbar.append(searchLabel, statusLabel, partnerLabel);
    const tableWrap = node('div', undefined, 'admin-event-table-wrap');
    const table = node('table', undefined, 'admin-event-table');
    table.innerHTML = '<thead><tr><th>Event / Program</th><th>Host Partner / Department</th><th>Date &amp; Time Range</th><th>Venue / Location</th><th>Volunteers</th><th>Attendance</th><th>Status</th><th>Actions</th></tr></thead>';
    const tbody = node('tbody');
    table.append(tbody);
    tableWrap.append(table);
    eventsPanel.append(toolbar, tableWrap);
    pageContent.append(eventsPanel);

    const renderRows = () => {
        tbody.replaceChildren();
        const query = search.value.trim().toLocaleLowerCase();
        const selectedPartner = partner.value;
        const filtered = data.events.filter(item => {
            const matchesText = !query || `${item.title} ${item.project_title} ${item.partner_name || ''}`.toLocaleLowerCase().includes(query);
            const matchesStatus = status.value === 'all' || item.event_status === status.value;
            const matchesPartner = !selectedPartner || (item.partner_name || '').split(', ').includes(selectedPartner);
            return matchesText && matchesStatus && matchesPartner;
        });
        if (!filtered.length) {
            const row = node('tr');
            const cell = node('td', 'No events match the selected filters.', 'admin-event-empty');
            cell.colSpan = 8;
            row.append(cell);
            tbody.append(row);
            return;
        }
        filtered.forEach(item => {
            const row = node('tr');
            const eventCell = node('td', undefined, 'admin-event-name');
            eventCell.append(node('strong', item.title), node('small', item.project_title));
            const partnerCell = node('td', item.partner_name || 'UCC / University program');
            const dateStart = item.date_start ? dashboardDate(item.date_start, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const dateEnd = item.date_end ? dashboardDate(item.date_end, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const scheduleCell = node('td', undefined, 'admin-event-schedule');
            scheduleCell.append(
                node('span', dateStart ? (dateStart === dateEnd ? dateStart : `${dateStart} – ${dateEnd}`) : 'No event dates'),
                node('small', item.start_time ? `${String(item.start_time).slice(0, 5)} – ${String(item.end_time || '').slice(0, 5)}` : 'Time not set')
            );
            const venueCell = node('td', item.venues || 'Venue not set', 'admin-event-venue');
            const volunteers = Number(item.registered_volunteers || 0);
            const attendance = Number(item.attendance_headcount || 0);
            const statusBadge = node('span', item.event_status, `badge status-badge event-status-${item.event_status}`);
            const actions = node('div', undefined, 'admin-event-actions');
            actions.append(
                button('View Attendance Log', `dates-${item.id}`, 'button button-quiet button-small'),
                button('Manage Volunteers', `applications-${item.id}`, 'button button-quiet button-small'),
                button('Export CSV', `attendexport-${item.id}`, 'button button-primary button-small'),
                button('Print / PDF', `attendanceprint-${item.id}`, 'button button-quiet button-small')
            );
            row.append(
                eventCell,
                partnerCell,
                scheduleCell,
                venueCell,
                node('td', volunteers.toLocaleString()),
                node('td', attendance.toLocaleString()),
                node('td', undefined, 'admin-event-status-cell'),
                node('td', undefined, 'admin-event-action-cell')
            );
            row.children[6].append(statusBadge);
            row.children[7].append(actions);
            row.dataset.eventId = item.id;
            tbody.append(row);
        });
    };
    search.addEventListener('input', renderRows);
    [status, partner].forEach(select => select.addEventListener('change', renderRows));
    renderRows();
    renderAdminEventCalendar(calendar, data.month, data.calendar);
}

async function refreshAdminEventSummary() {
    if (currentUser.role !== 'admin') return;
    const month = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit'
    }).format(new Date());
    const data = await request(`/events/admin-dashboard?month=${encodeURIComponent(month)}`);
    Object.entries(data.metrics).forEach(([key, value]) => {
        const card = pageContent.querySelector(`.admin-event-metric[data-metric="${key}"]`);
        if (card) card.querySelector('strong').textContent = Number(value || 0).toLocaleString();
    });
    data.events.forEach(item => {
        const row = pageContent.querySelector(`.admin-event-table tr[data-event-id="${item.id}"]`);
        if (!row) return;
        row.children[4].textContent = Number(item.registered_volunteers || 0).toLocaleString();
        row.children[5].textContent = Number(item.attendance_headcount || 0).toLocaleString();
    });
}

function showAdminCalendarEvent(item) {
    document.querySelector('#admin-calendar-event-modal')?.remove();
    const dialog = node('dialog', undefined, 'admin-calendar-event-modal');
    dialog.id = 'admin-calendar-event-modal';
    dialog.setAttribute('aria-labelledby', 'admin-calendar-event-title');
    const content = node('div', undefined, 'admin-calendar-event-content');
    const header = node('header', undefined, 'admin-calendar-event-header');
    const heading = node('div');
    heading.append(node('p', 'COMMUNITY EXTENSION EVENT', 'eyebrow'));
    const title = node('h2', item.title);
    title.id = 'admin-calendar-event-title';
    const status = node('span', item.event_status, `badge status-badge event-status-${item.event_status}`);
    heading.append(title, status);
    const close = button('×', 'close-admin-event-summary', 'button button-quiet admin-calendar-event-close');
    close.setAttribute('aria-label', 'Close event details');
    header.append(heading, close);

    const date = dashboardDate(item.event_date, { month: 'long', day: 'numeric', year: 'numeric' });
    const time = item.start_time ? `${String(item.start_time).slice(0, 5)} – ${String(item.end_time || '').slice(0, 5)}` : 'Time not set';
    const details = node('dl', undefined, 'admin-calendar-event-details');
    [
        ['Project', item.project_title || '—'],
        ['Date & time', `${date} · ${time}`],
        ['Venue / location', item.venues || 'Venue not set'],
        ['Host partners / departments', item.partner_name || 'UCC / University program'],
        ['Registered volunteers', Number(item.registered_volunteers || 0).toLocaleString()],
        ['Attendance headcount', Number(item.attendance_headcount || 0).toLocaleString()]
    ].forEach(([label, value]) => {
        details.append(node('dt', label), node('dd', value));
    });
    const footer = node('footer', undefined, 'admin-calendar-event-footer');
    const attendance = button('View full attendance logs', `calendar-event-attendance-${item.id}`, 'button button-primary');
    const done = button('Close', 'close-admin-event-summary', 'button button-quiet');
    footer.append(attendance, done);
    content.append(header, details, footer);
    dialog.append(content);
    dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-action="close-admin-event-summary"]')) dialog.close();
        if (event.target.closest(`[data-action="calendar-event-attendance-${item.id}"]`)) {
            dialog.close();
            showDates(Number(item.id)).catch(error => showMessage(pageMessage, error.message, 'error'));
        }
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

function renderAdminEventCalendar(container, month, events) {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const eventsByDate = new Map();
    events.forEach(item => {
        const entries = eventsByDate.get(item.event_date) || [];
        entries.push(item);
        eventsByDate.set(item.event_date, entries);
    });
    const toolbar = node('div', undefined, 'admin-event-calendar-toolbar');
    const previous = button('Previous month', 'admin-calendar-previous', 'button button-quiet button-small');
    const next = button('Next month', 'admin-calendar-next', 'button button-quiet button-small');
    toolbar.append(previous, node('h3', new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(first)), next);
    const grid = node('div', undefined, 'admin-event-calendar-grid');
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(label => grid.append(node('div', label, 'admin-event-calendar-weekday')));
    for (let i = 0; i < first.getDay(); i++) grid.append(node('div', undefined, 'admin-event-calendar-day is-outside'));
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const cell = node('div', undefined, 'admin-event-calendar-day');
        cell.append(node('span', day, 'admin-event-calendar-day-number'));
        (eventsByDate.get(date) || []).forEach(item => {
            const eventButton = button('', `admin-calendar-event-${item.id}`, `admin-event-calendar-event event-status-${item.event_status}`);
            eventButton.append(
                node('span', item.title, 'admin-event-calendar-title'),
                node('span', item.event_status, 'admin-event-calendar-status')
            );
            eventButton.title = `${item.project_title}${item.partner_name ? ` · ${item.partner_name}` : ''} · ${item.event_status}`;
            eventButton.addEventListener('click', event => {
                event.stopPropagation();
                showAdminCalendarEvent(item).catch(error => showMessage(pageMessage, error.message, 'error'));
            });
            cell.append(eventButton);
        });
        grid.append(cell);
    }
    while ((grid.children.length - 7) % 7 !== 0) grid.append(node('div', undefined, 'admin-event-calendar-day is-outside'));
    container.replaceChildren(toolbar, grid);
    const changeMonth = async offset => {
        const changed = new Date(year, monthNumber - 1 + offset, 1);
        const nextMonth = `${changed.getFullYear()}-${String(changed.getMonth() + 1).padStart(2, '0')}`;
        try {
            const result = await request(`/events/admin-dashboard?month=${encodeURIComponent(nextMonth)}`);
            renderAdminEventCalendar(container, result.month, result.calendar);
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    };
    previous.addEventListener('click', () => changeMonth(-1));
    next.addEventListener('click', () => changeMonth(1));
}

async function renderPartnerEventsDashboard(events) {
    const calendarSection = panel('Partner calendar', 'Your approved and scheduled events plus public UCC-CES activities available for collaboration.');
    calendarSection.classList.add('partner-calendar-panel');
    const calendar = node('div', undefined, 'partner-calendar');
    calendarSection.append(calendar);
    pageContent.append(calendarSection);

    const attendanceSection = panel('Attendance & attendee overview', 'Volunteer applications and community participant totals for events linked to your partner account.');
    attendanceSection.classList.add('partner-attendance-panel');
    if (!events.length) {
        attendanceSection.append(node('div', 'Attendee records will appear when your organization has scheduled events.', 'empty'));
    } else {
        const attendeeList = node('div', undefined, 'record-list partner-attendee-event-list');
        events.forEach(item => {
            const record = node('article', undefined, 'record partner-attendee-event');
            const info = node('div', undefined, 'record-main');
            info.append(
                node('strong', item.title),
                node('small', `${item.project_title} · ${Number(item.approved_applications)} approved volunteers · capacity ${item.capacity}`)
            );
            record.append(info, button('View attendees', `attendees-${item.id}`, 'button button-quiet button-small'), button('Export CSV', `attendexport-${item.id}`, 'button button-primary button-small'));
            attendeeList.append(record);
        });
        attendanceSection.append(attendeeList);
    }
    pageContent.append(attendanceSection);

    const renderCalendar = async month => {
        calendar.replaceChildren(node('div', 'Loading calendar…', 'empty'));
        try {
            const data = await request(`/partner/calendar?month=${encodeURIComponent(month)}`);
            const [year, monthNumber] = data.month.split('-').map(Number);
            const first = new Date(year, monthNumber - 1, 1);
            const daysInMonth = new Date(year, monthNumber, 0).getDate();
            const offset = first.getDay();
            const eventsByDate = new Map();
            [...data.partnerEvents.map(event => ({ ...event, visibility: 'partner' })),
                ...data.publicEvents.map(event => ({ ...event, visibility: 'public' }))].forEach(event => {
                const items = eventsByDate.get(event.event_date) || [];
                items.push(event);
                eventsByDate.set(event.event_date, items);
            });
            const monthLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(first);
            const toolbar = node('div', undefined, 'partner-calendar-toolbar');
            const previous = button('Previous month', 'calendar-previous', 'button button-quiet button-small');
            const next = button('Next month', 'calendar-next', 'button button-quiet button-small');
            toolbar.append(previous, node('h3', monthLabel), next);
            const grid = node('div', undefined, 'partner-calendar-grid');
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                grid.append(node('div', day, 'partner-calendar-weekday'));
            });
            for (let index = 0; index < offset; index++) {
                grid.append(node('div', undefined, 'partner-calendar-day is-outside'));
            }
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${data.month}-${String(day).padStart(2, '0')}`;
                const cell = node('div', undefined, 'partner-calendar-day');
                cell.append(node('span', day, 'partner-calendar-day-number'));
                (eventsByDate.get(date) || []).forEach(event => {
                    const eventButton = button(
                        event.title,
                        event.visibility === 'partner' ? `calendar-event-${event.id}` : 'calendar-public-event',
                        `partner-calendar-event is-${event.visibility}`
                    );
                    eventButton.title = `${event.project_title}${event.venue ? ` · ${event.venue}` : ''}`;
                    eventButton.dataset.eventId = event.id;
                    eventButton.dataset.visibility = event.visibility;
                    eventButton.dataset.date = event.event_date;
                    cell.append(eventButton);
                });
                grid.append(cell);
            }
            while ((grid.children.length - 7) % 7 !== 0) {
                grid.append(node('div', undefined, 'partner-calendar-day is-outside'));
            }
            calendar.replaceChildren(toolbar, grid);
            previous.addEventListener('click', event => {
                event.stopPropagation();
                const priorMonth = new Date(year, monthNumber - 2, 1);
                renderCalendar(`${priorMonth.getFullYear()}-${String(priorMonth.getMonth() + 1).padStart(2, '0')}`);
            });
            next.addEventListener('click', event => {
                event.stopPropagation();
                const nextMonth = new Date(year, monthNumber, 1);
                renderCalendar(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
            });
            grid.addEventListener('click', event => {
                const target = event.target.closest('[data-action]');
                if (!target) return;
                event.stopPropagation();
                if (target.dataset.visibility === 'partner') {
                    showDates(Number(target.dataset.eventId)).catch(error => showMessage(pageMessage, error.message, 'error'));
                } else {
                    showMessage(pageMessage, `${target.textContent} · ${dashboardDate(target.dataset.date, { month: 'long', day: 'numeric', year: 'numeric' })} · Public UCC-CES event`);
                }
            });
        } catch (error) {
            console.error('Partner calendar could not be loaded:', error);
            calendar.replaceChildren(node('div', error.message, 'empty'));
        }
    };
    await renderCalendar(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date()));
}

async function showPartnerEventAttendees(eventId) {
    const [{ applications }, { dates }] = await Promise.all([
        request(`/events/${eventId}/applications`),
        request(`/events/${eventId}/dates`)
    ]);
    const attendanceByApplication = new Map(applications.map(application => [Number(application.id), 0]));
    const participantTotals = [];
    for (const date of dates) {
        const [{ attendance }, { participants }] = await Promise.all([
            request(`/event-dates/${date.id}/attendance`),
            request(`/event-dates/${date.id}/participants`)
        ]);
        attendance.forEach(item => {
            if (item.attendance_status === 'present') {
                attendanceByApplication.set(Number(item.application_id), (attendanceByApplication.get(Number(item.application_id)) || 0) + 1);
            }
        });
        participants.forEach(item => participantTotals.push({ ...item, event_date: date.event_date }));
    }
    const section = panel('Event attendees', 'Volunteer application status, attendance records, and separately recorded community participant totals.');
    section.classList.add('applications-panel', 'partner-attendee-details');
    if (!applications.length) {
        section.append(node('div', 'No volunteer applications have been submitted for this event.', 'empty'));
    } else {
        applications.forEach(application => {
            const record = node('article', undefined, 'record');
            const info = node('div', undefined, 'record-main');
            info.append(
                node('strong', `${application.first_name} ${application.last_name}`),
                node('small', `${application.email} · ${attendanceByApplication.get(Number(application.id)) || 0} date(s) attended`)
            );
            record.append(info, node('span', application.status, `badge status-badge status-${application.status}`));
            section.append(record);
        });
    }
    const communitySection = node('section', undefined, 'partner-community-counts');
    communitySection.append(node('h3', 'Community participant counts'));
    if (!participantTotals.length) {
        communitySection.append(node('p', 'No community participant counts have been recorded for this event.', 'empty'));
    } else {
        participantTotals.forEach(item => {
            communitySection.append(node('p', `${dashboardDate(item.event_date, { month: 'short', day: 'numeric', year: 'numeric' })} · ${item.participant_group}: ${item.participant_count}`));
        });
    }
    section.append(communitySection);
    const existing = pageContent.querySelector('.partner-attendee-details');
    existing?.remove();
    pageContent.prepend(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function downloadPartnerAttendance(eventId) {
    const response = await fetch(`${API}/events/${eventId}/attendance-export`, { credentials: 'same-origin' });
    if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json') ? await response.json() : null;
        throw new Error(result?.error || 'Attendance export failed.');
    }
    const blob = await response.blob();
    const link = node('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ucc-ces-event-${eventId}-attendance.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function printEventAttendanceReport(eventId) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) throw new Error('Allow pop-ups to open the printable attendance report.');
    try {
        const [{ events }, { dates }] = await Promise.all([request('/events'), request(`/events/${eventId}/dates`)]);
        const event = events.find(item => Number(item.id) === eventId);
        if (!event) throw new Error('The selected event could not be found.');
        const sections = [];
        for (const date of dates) {
            const { attendance } = await request(`/event-dates/${date.id}/attendance`);
            const rows = attendance.map(item => `<tr><td>${escapeReportText(`${item.first_name} ${item.last_name}`)}</td><td>${escapeReportText(item.affiliation || '—')}</td><td>${escapeReportText(item.attendance_status || 'Not recorded')}</td><td>${escapeReportText(item.scanned_at || '—')}</td><td>${escapeReportText(item.attendance_note || '')}</td></tr>`).join('');
            sections.push(`<section><h2>${escapeReportText(date.event_date)}</h2><table><thead><tr><th>Volunteer</th><th>Affiliation</th><th>Attendance status</th><th>Recorded at</th><th>Note</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No approved volunteer attendance records.</td></tr>'}</tbody></table></section>`);
        }
        const safeTitle = escapeReportText(event.title);
        reportWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${safeTitle} attendance report</title><style>body{font:14px Arial,sans-serif;color:#183a2a;margin:32px}h1{font-size:22px}h2{font-size:16px;margin-top:28px}p{color:#56675e}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cddbd1;padding:8px;text-align:left;font-size:12px}th{background:#edf5ef}@media print{body{margin:14mm}}</style></head><body><h1>${safeTitle}</h1><p>${escapeReportText(event.project_title)} · UCC-CES Attendance Report</p>${sections.join('')}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
        reportWindow.document.close();
    } catch (error) {
        reportWindow.close();
        throw error;
    }
}

function escapeReportText(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function addEventDateEditor(container) {
    const editor = node('section', undefined, 'event-date-editor');
    const heading = node('div', undefined, 'event-editor-heading');
    heading.append(node('strong', 'Event date'));
    const removeDate = button('Remove date', 'remove-date', 'button button-quiet button-small');
    removeDate.addEventListener('click', () => editor.remove());
    heading.append(removeDate);
    const date = node('label', 'Date');
    const dateInput = node('input');
    dateInput.type = 'date';
    dateInput.name = 'date';
    dateInput.required = true;
    date.append(dateInput);
    const activityList = node('div', undefined, 'event-activity-list');
    const addActivity = button('Add activity', 'add-activity', 'button button-quiet button-small');
    addActivity.addEventListener('click', () => addEventActivityEditor(activityList));
    editor.append(heading, date, activityList, addActivity);
    addEventActivityEditor(activityList);
    container.append(editor);
}

function addEventActivityEditor(container) {
    const editor = node('div', undefined, 'event-activity-editor');
    const fields = node('div', undefined, 'panel-form');
    fields.innerHTML = '<label>Activity title<input name="title" required></label><label>Venue<input name="venue" required></label><label>Start time<input name="startTime" type="time" required></label><label>End time<input name="endTime" type="time" required></label><label>Target participants<input name="targetParticipants" type="number" min="0"></label><label>Activity lead<input name="activityLead"></label>';
    const remove = button('Remove activity', 'remove-activity', 'button button-quiet button-small');
    remove.addEventListener('click', () => editor.remove());
    editor.append(fields, remove);
    container.append(editor);
}

async function renderAccounts(status = 'pending') {
    if (currentUser.role !== 'admin') return;
    const section = panel('Account Management');
    section.classList.add('account-management');
    const filters = node('div', undefined, 'account-filter-toolbar');
    filters.innerHTML = `
        <label class="account-filter-status">Account status
            <select name="status">
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="disabled">Disabled / Archived</option>
                <option value="">All Accounts</option>
            </select>
        </label>
        <label>Account type
            <select name="role">
                <option value="">All Types</option>
                <option value="partner">Partner / Proposer</option>
                <option value="volunteer">Volunteer</option>
            </select>
        </label>
        <label data-account-category-filter hidden>Organization category
            <select name="category">
                <option value="">All organization categories</option>
                <option value="UCC Department / Academic Unit">UCC Department / Academic Unit</option>
                <option value="Local Government Unit (LGU / Barangay)">Local Government Unit (LGU / Barangay)</option>
                <option value="Government Agency (e.g., MMDA, DSWD)">Government Agency (e.g., MMDA, DSWD)</option>
                <option value="NGO / Non-Profit Organization">NGO / Non-Profit</option>
                <option value="Private Sector / Corporate Partner">Private Sector</option>
            </select>
        </label>
        <label data-account-affiliation-filter hidden>Volunteer affiliation / school / company
            <input name="affiliation" type="search" placeholder="School, company, or community">
        </label>
        <label class="account-search">Search accounts
            <input name="search" type="search" placeholder="Name, email, or organization">
        </label>
        <label>Sort by
            <select name="sort">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
            </select>
        </label>`;
    const list = node('div', undefined, 'record-list account-record-list');
    const empty = node('div', undefined, 'empty');
    const detailsDialog = node('dialog', undefined, 'account-details-modal');
    detailsDialog.setAttribute('aria-labelledby', 'account-details-title');
    const detailsContent = node('div', undefined, 'account-details-content');
    detailsDialog.append(detailsContent);
    detailsDialog.addEventListener('click', event => {
        if (event.target === detailsDialog) detailsDialog.close();
    });
    const cleanOrganizationCategory = value => String(value || '')
        .replace(/\s*\(e\.g\.,[^)]*\)/i, '')
        .trim();
    const statusFilter = filters.querySelector('[name="status"]');
    const roleFilter = filters.querySelector('[name="role"]');
    const categoryFilter = filters.querySelector('[name="category"]');
    const affiliationFilter = filters.querySelector('[name="affiliation"]');
    const searchFilter = filters.querySelector('[name="search"]');
    const sortFilter = filters.querySelector('[name="sort"]');
    let currentAccounts = [];
    statusFilter.value = status;

    const renderRecords = accounts => {
        const role = roleFilter.value;
        filters.querySelector('[data-account-category-filter]').hidden = role !== 'partner';
        filters.querySelector('[data-account-affiliation-filter]').hidden = role !== 'volunteer';
        const search = searchFilter.value.trim().toLocaleLowerCase();
        const affiliationSearch = affiliationFilter.value.trim().toLocaleLowerCase();
        const category = categoryFilter.value;
        const visibleAccounts = accounts.filter(account => {
            if (role && account.role !== role) return false;
            if (category && account.organization_category !== category) return false;
            const affiliation = `${account.registration_classification || account.volunteer_type || ''} ${account.affiliation_name || ''} ${account.campus || ''}`.toLocaleLowerCase();
            if (affiliationSearch && !affiliation.includes(affiliationSearch)) return false;
            const searchable = `${account.first_name} ${account.last_name} ${account.email} ${account.organization_name || ''}`.toLocaleLowerCase();
            return !search || searchable.includes(search);
        });
        visibleAccounts.sort((left, right) => {
            if (sortFilter.value === 'alphabetical') {
                return `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`);
            }
            const leftDate = new Date(String(left.created_at).replace(' ', 'T')).getTime();
            const rightDate = new Date(String(right.created_at).replace(' ', 'T')).getTime();
            return sortFilter.value === 'oldest' ? leftDate - rightDate : rightDate - leftDate;
        });
        list.replaceChildren();
        visibleAccounts.forEach(account => {
            const record = node('article', undefined, 'record account-record');
            const info = node('div', undefined, 'record-main');
            const identity = node('div', undefined, 'account-record-identity');
            identity.append(node('strong', `${account.first_name} ${account.last_name}`));
            const tags = node('div', undefined, 'account-record-tags');
            tags.append(
                node('span', account.account_status.replaceAll('_', ' '), `badge status-badge status-${account.account_status}`),
                node('span', account.role === 'partner' ? 'Partner' : 'Volunteer', `badge account-type-badge account-type-${account.role}`)
            );
            let categoryLabel = '';
            if (account.role === 'partner') {
                const categoryName = cleanOrganizationCategory(account.organization_category || account.organization_type || 'Partner');
                categoryLabel = `${categoryName}: ${account.organization_name || 'Organization not provided'}`;
            } else {
                const classification = account.registration_classification || account.volunteer_type || 'Volunteer';
                const affiliation = account.affiliation_name || account.campus || '';
                categoryLabel = `Volunteer: ${classification}${affiliation ? ` · ${affiliation}` : ''}`;
            }
            tags.append(node('span', categoryLabel, 'badge account-metadata-badge'));
            identity.append(tags);
            info.append(identity);
            if (account.role === 'partner' && account.official_designation) {
                info.append(node('small', account.official_designation));
            }
            info.append(
                node('small', `${account.email} · ${account.contact_number}`),
                node('small', `Registered ${dashboardDate(account.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}`)
            );
            record.tabIndex = 0;
            record.setAttribute('role', 'button');
            record.setAttribute('aria-label', `View full details for ${account.first_name} ${account.last_name}`);
            record.append(info, node('span', 'View Full Details', 'account-view-details'));
            const openDetails = () => {
                detailsDialog.dataset.accountId = String(account.id);
                const fields = node('dl', undefined, 'account-details-grid');
                const category = account.role === 'partner'
                    ? cleanOrganizationCategory(account.organization_category || account.organization_type || 'Partner')
                    : account.registration_classification || account.volunteer_type || 'Volunteer';
                const affiliation = account.role === 'partner'
                    ? account.organization_name || 'Not provided'
                    : account.affiliation_name || account.campus || 'Not provided';
                const details = [
                    ['Full Name', `${account.first_name} ${account.last_name}`],
                    ['Designation / Role', account.official_designation || account.registration_classification || account.volunteer_type || 'Not provided'],
                    ['Email Address', account.email],
                    ['Contact Number', account.contact_number || 'Not provided'],
                    ['Registration Date', dashboardDate(account.created_at, { month: 'long', day: 'numeric', year: 'numeric' })],
                    ['Account Type', account.role === 'partner' ? 'Partner / Proposer' : 'Volunteer'],
                    ['Category', category],
                    [account.role === 'partner' ? 'Organization Name' : 'Affiliation / School / Company', affiliation],
                    ['Account Status', account.account_status.replaceAll('_', ' ')]
                ];
                details.forEach(([label, value]) => {
                    const term = node('dt', label);
                    const description = node('dd', value);
                    fields.append(term, description);
                });
                detailsContent.replaceChildren();
                const header = node('div', undefined, 'account-details-header');
                header.append(
                    node('div', undefined, 'account-details-heading'),
                    button('Close', 'close-account-details', 'button button-quiet button-small')
                );
                const detailTitle = node('h2', `${account.first_name} ${account.last_name}`);
                detailTitle.id = 'account-details-title';
                header.querySelector('.account-details-heading').append(
                    node('span', 'ACCOUNT DETAILS', 'auth-card-kicker'),
                    detailTitle,
                    node('span', account.account_status.replaceAll('_', ' '), `badge status-badge status-${account.account_status}`)
                );
                detailsContent.append(header, fields);
                if (account.rejection_reason) {
                    const reason = node('section', undefined, 'account-rejection-reason');
                    reason.append(node('h3', 'Rejection reason'), node('p', account.rejection_reason));
                    detailsContent.append(reason);
                }
                const proofPath = account.partner_verification_path || account.affiliation_proof_path;
                if (proofPath) {
                    const proof = node('section', undefined, 'account-proof-section');
                    const proofHeading = node('div', undefined, 'account-proof-heading');
                    proofHeading.append(node('h3', 'Verification document'));
                    const proofLink = node('a', 'Open document', 'button button-quiet button-small');
                    proofLink.href = `${API}/accounts/${account.id}/proof`;
                    proofLink.target = '_blank';
                    proofLink.rel = 'noopener';
                    proofHeading.append(proofLink);
                    const preview = node('iframe', undefined, 'account-proof-preview');
                    preview.src = proofLink.href;
                    preview.title = `Verification document for ${account.first_name} ${account.last_name}`;
                    proof.append(proofHeading, preview);
                    detailsContent.append(proof);
                } else {
                    detailsContent.append(node('p', 'No verification document was uploaded.', 'empty'));
                }
                const actions = node('div', undefined, 'account-details-actions');
                if (account.account_status === 'pending') {
                    const approveButton = button('Approve', 'confirm-account-review', 'button button-primary');
                    approveButton.dataset.status = 'approved';
                    const rejectButton = button('Reject', 'confirm-account-review', 'button button-danger');
                    rejectButton.dataset.status = 'rejected';
                    actions.append(
                        approveButton,
                        rejectButton
                    );
                } else if (account.account_status === 'approved') {
                    const disableButton = button('Disable / Archive', 'confirm-account-review', 'button button-danger');
                    disableButton.dataset.status = 'disabled';
                    actions.append(disableButton);
                } else if (account.account_status === 'disabled') {
                    const enableButton = button('Re-enable', 'confirm-account-review', 'button button-primary');
                    enableButton.dataset.status = 'approved';
                    actions.append(enableButton);
                }
                if (actions.childElementCount) detailsContent.append(actions);
                detailsDialog.showModal();
            };
            record.addEventListener('click', event => {
                if (event.target.closest('a, button, input, select, textarea')) return;
                openDetails();
            });
            record.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetails();
                }
            });
            list.append(record);
        });
        empty.textContent = accounts.length === 0 && statusFilter.value === 'pending'
            ? 'There are no accounts waiting for approval.'
            : 'No accounts match the selected filters.';
        empty.hidden = visibleAccounts.length > 0;
    };

    detailsContent.addEventListener('click', async event => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;
        event.stopPropagation();
        if (actionButton.dataset.action === 'close-account-details') {
            detailsDialog.close();
            return;
        }
        if (actionButton.dataset.action === 'confirm-account-review') {
            const status = actionButton.dataset.status;
            const accountId = detailsDialog.dataset.accountId;
            if (!accountId || !['approved', 'rejected', 'disabled'].includes(status)) {
                const error = new Error('The selected account could not be identified for review.');
                console.error(error);
                showMessage(pageMessage, error.message, 'error');
                return;
            }
            const confirmation = node('form', undefined, 'account-action-confirmation');
            confirmation.noValidate = status !== 'rejected';
            const message = status === 'approved'
                ? 'Are you sure you want to approve this account? An automated notification will be sent to the user.'
                : status === 'rejected'
                    ? 'Provide a reason for rejecting this account. The user will be notified.'
                    : status === 'disabled'
                        ? 'Are you sure you want to disable this active account?'
                        : 'Are you sure you want to re-enable this account?';
            confirmation.append(node('p', message));
            if (status === 'rejected') {
                const reasonField = node('label', 'Reason for rejection');
                const reasonInput = node('textarea');
                reasonInput.name = 'reason';
                reasonInput.required = true;
                reasonInput.maxLength = 2000;
                reasonInput.rows = 3;
                reasonInput.setAttribute('aria-label', 'Reason for rejection');
                reasonField.append(reasonInput);
                confirmation.append(reasonField);
            }
            const actions = node('div', undefined, 'account-confirmation-actions');
            const cancelButton = button('Cancel', 'cancel-account-confirmation', 'button button-quiet');
            const confirmButton = node('button', 'Confirm', status === 'rejected' || status === 'disabled' ? 'button button-danger' : 'button button-primary');
            confirmButton.type = 'submit';
            actions.append(cancelButton, confirmButton);
            confirmation.append(actions);
            detailsContent.querySelector('.account-action-confirmation')?.remove();
            detailsContent.append(confirmation);
            confirmation.addEventListener('submit', async submitEvent => {
                submitEvent.preventDefault();
                submitEvent.stopPropagation();
                const activeAccountId = detailsDialog.dataset.accountId;
                const reason = confirmation.elements.reason?.value.trim() || '';
                if (!activeAccountId) {
                    const error = new Error('The selected account could not be identified for review.');
                    console.error(error);
                    showMessage(pageMessage, error.message, 'error');
                    return;
                }
                if (status === 'rejected' && !reason) {
                    confirmation.elements.reason?.focus();
                    showMessage(pageMessage, 'Enter a reason for rejection.', 'error');
                    return;
                }
                confirmButton.disabled = true;
                try {
                    await request(`/accounts/${encodeURIComponent(activeAccountId)}/review`, {
                        method: 'POST',
                        body: JSON.stringify({ status, reason })
                    });
                    detailsDialog.close();
                    await renderPage('accounts');
                    showMessage(pageMessage, `Account ${status}.`);
                } catch (error) {
                    console.error('Account review failed:', error);
                    showMessage(pageMessage, error.message, 'error');
                    confirmButton.disabled = false;
                }
            });
            if (status === 'rejected') confirmation.querySelector('textarea').focus();
            return;
        }
        if (actionButton.dataset.action === 'cancel-account-confirmation') {
            actionButton.closest('.account-action-confirmation').remove();
            return;
        }
    });

    const initialAccounts = await request(`/accounts${status ? `?status=${encodeURIComponent(status)}` : ''}`);
    currentAccounts = initialAccounts.accounts;
    statusFilter.addEventListener('change', async () => {
        statusFilter.disabled = true;
        try {
            const selectedStatus = statusFilter.value;
            const { accounts } = await request(`/accounts${selectedStatus ? `?status=${encodeURIComponent(selectedStatus)}` : ''}`);
            currentAccounts = accounts;
            renderRecords(currentAccounts);
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        } finally {
            statusFilter.disabled = false;
        }
    });
    [roleFilter, categoryFilter, affiliationFilter, searchFilter, sortFilter].forEach(control => {
        control.addEventListener(control === searchFilter || control === affiliationFilter ? 'input' : 'change', () => renderRecords(currentAccounts));
    });
    renderRecords(currentAccounts);
    section.append(filters, list, empty, detailsDialog);
    pageContent.append(section);
}

async function renderReports() {
    const section = panel('Non-financial module reports', 'Choose a CES data module, set the required date range, then apply optional filters or export the results.');
    const form = node('form', undefined, 'panel-form');
    form.innerHTML = '<label>Report module<select name="module"><option value="projects">Projects</option><option value="partners">Partners</option><option value="events">Events</option><option value="applications">Volunteer applications</option><option value="attendance">Daily attendance</option><option value="participants">Participants</option><option value="evaluations">Evaluations</option><option value="certificates">Certificates</option><option value="documents">Documentation</option></select></label><label>From<input name="from" type="date" required></label><label>To<input name="to" type="date" required></label><label>Status<select name="status"><option value="">All statuses</option></select></label><label>Partner<select name="partner"><option value="">All partners</option></select></label><label>Category<select name="category"><option value="">All categories</option></select></label><label>Search<input name="search" type="search"></label><button class="button button-primary" type="submit">Run report</button><button class="button button-quiet" type="button" data-action="export-report" data-format="csv">Export CSV</button><button class="button button-quiet" type="button" data-action="export-report" data-format="pdf">Export PDF</button>';
    const statusOptions = {
        projects: ['draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected'],
        partners: ['pending', 'approved', 'rejected', 'disabled'],
        events: ['draft', 'submitted', 'under_review', 'revision', 'approved', 'active', 'rejected'],
        applications: ['pending', 'approved', 'rejected', 'withdrawn'],
        attendance: ['present', 'absent', 'excused'],
        participants: ['recorded'],
        evaluations: ['completed'],
        certificates: ['issued'],
        documents: ['signed', 'unsigned']
    };
    const refreshStatusOptions = () => {
        const select = form.elements.status;
        select.replaceChildren(new Option('All statuses', ''));
        statusOptions[form.elements.module.value].forEach(status => select.add(new Option(dashboardStatusLabel(status), status)));
    };
    refreshStatusOptions();
    form.elements.module.addEventListener('change', refreshStatusOptions);
    const [partnersResult, categoriesResult] = await Promise.all([request('/directory'), request('/categories')]);
    const partnerSelect = form.elements.partner;
    partnersResult.partners.forEach(partner => partnerSelect.add(new Option(partner.organization_name, partner.id)));
    const categorySelect = form.elements.category;
    const refreshCategories = () => {
        categorySelect.replaceChildren(new Option('All categories', ''));
        if (form.elements.module.value === 'partners') {
            Array.from(new Set(partnersResult.partners.map(partner => partner.organization_type)))
                .sort()
                .forEach(category => categorySelect.add(new Option(category, category)));
        } else {
            categoriesResult.categories.forEach(category => categorySelect.add(new Option(category.name, category.name)));
        }
    };
    refreshCategories();
    form.elements.module.addEventListener('change', refreshCategories);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const query = new URLSearchParams(Object.fromEntries(new FormData(form)));
        try {
            const result = await request(`/reports?${query}`);
            const priorResults = pageContent.querySelector('.report-results');
            priorResults?.remove();
            if (result.rows) {
                const table = node('table', undefined, 'proposal-table report-table');
                table.innerHTML = '<thead><tr><th scope="col">Record</th><th scope="col">Related project / context</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col">Details</th></tr></thead>';
                const body = node('tbody');
                result.rows.forEach(row => {
                    const tableRow = node('tr');
                    tableRow.append(
                        node('td', row.subject),
                        node('td', row.context || '—'),
                        node('td', row.status || '—'),
                        node('td', row.report_date || '—'),
                        node('td', row.details || '—')
                    );
                    body.append(tableRow);
                });
                table.append(body);
                const results = node('div', undefined, 'proposal-table-wrap report-results');
                results.dataset.total = result.rows.length;
                if (!result.rows.length) results.append(node('div', 'No records match these filters.', 'empty'));
                else results.append(table);
                pageContent.append(results);
                return;
            }
            const output = node('div', undefined, 'record-list');
            if (!result.projects.length) output.append(node('div', 'No projects match these filters.', 'empty'));
            result.projects.forEach(project => {
                const record = node('article', undefined, 'record');
                const info = node('div', `${project.title} · ${project.period_start || 'Unscheduled'} · ${project.event_count} event(s)`, 'record-main');
                const actions = node('div', undefined, 'record-actions');
                actions.append(node('span', project.status.replaceAll('_', ' '), 'badge'), button('Project dossier', `dossier-${project.id}`));
                record.append(info, actions);
                output.append(record);
            });
            output.classList.add('report-results');
            pageContent.append(output);
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    });
    section.append(form);
    pageContent.append(section);
}

async function renderNotifications() {
    const { notifications } = await request('/notifications');
    if (!notifications.length) {
        pageContent.append(node('div', 'You are all caught up.', 'empty'));
        return;
    }
    const unread = notifications.some(item => !item.read_at);
    if (unread) {
        const markAll = button('Mark all as read', 'notificationreadall', 'button button-quiet button-small');
        pageContent.append(markAll);
    }
    const list = node('div', undefined, 'record-list');
    notifications.forEach(item => {
        const record = node('article', undefined, 'record');
        const info = node('div', undefined, 'record-main');
        info.append(node('strong', item.subject), node('small', `${item.message} · ${dashboardDate(item.created_at, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`));
        record.append(info, node('span', item.read_at ? 'Read' : 'Unread', `badge ${item.read_at ? '' : 'is-unread'}`));
        if (!item.read_at) record.append(button('Mark as read', `notificationread-${item.id}`, 'button button-quiet button-small'));
        list.append(record);
    });
    pageContent.append(list);
}

pageContent.addEventListener('click', async event => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const [action, id, value] = actionButton.dataset.action.split('-');
    actionButton.disabled = true;
    try {
        if (action === 'submit') {
            await openSubmitConfirmation(Number(id));
        } else if (action === 'review') {
            const proposalId = actionButton.dataset.action.split('-')[1];
            const decision = actionButton.dataset.action.substring(`review-${proposalId}-`.length);
            const notes = actionButton.closest('tr')?.querySelector('[aria-label^="Review note for"]')?.value || '';
            await request(`/proposals/${proposalId}/review`, { method: 'POST', body: JSON.stringify({ status: decision, notes }) });
            showMessage(pageMessage, 'Proposal status updated.');
            await renderPage('proposals');
        } else if (action === 'account') {
            await request(`/accounts/${id}/review`, { method: 'POST', body: JSON.stringify({ status: value }) });
            await renderPage('accounts');
            showMessage(pageMessage, 'Account review saved.');
        } else if (action === 'notificationread') {
            await request(`/notifications/${id}/read`, { method: 'PUT', body: '{}' });
            await renderPage('notifications');
        } else if (action === 'notificationreadall') {
            await request('/notifications/read-all', { method: 'PUT', body: '{}' });
            await renderPage('notifications');
        } else if (action === 'apply') {
            await request(`/events/${id}/apply`, { method: 'POST', body: '{}' });
            showMessage(pageMessage, 'Application submitted for organizer review.');
            await renderPage('events');
        } else if (action === 'upload') {
            await openDocumentForm(Number(id));
        } else if (action === 'dates') {
            await showDates(Number(id));
        } else if (action === 'applications') {
            await showApplications(Number(id));
        } else if (action === 'attendees') {
            await showPartnerEventAttendees(Number(id));
        } else if (action === 'attendexport') {
            await downloadPartnerAttendance(Number(id));
        } else if (action === 'attendanceprint') {
            await printEventAttendanceReport(Number(id));
        } else if (action === 'attendance' && id === 'list') {
            await showDateAttendance(Number(value));
        } else if (action === 'attendance' && id !== 'list') {
            await request('/attendance/override', {
                method: 'POST',
                body: JSON.stringify({
                    applicationId: Number(id),
                    eventDateId: Number(actionButton.dataset.eventDateId),
                    status: value,
                    note: actionButton.dataset.note || ''
                })
            });
            await showDateAttendance(Number(actionButton.dataset.eventDateId));
            await refreshAdminEventSummary();
        } else if (action === 'participants') {
            await showParticipantCounts(Number(id));
        } else if (action === 'certificates') {
            await showCertificates(Number(id));
        } else if (action === 'appreview') {
            const applicationId = Number(actionButton.dataset.id);
            const status = actionButton.dataset.status;
            await request(`/applications/${applicationId}/review`, { method: 'POST', body: JSON.stringify({ status }) });
            showMessage(pageMessage, `Application ${status}.`);
            await showApplications(Number(actionButton.dataset.eventId));
            await refreshAdminEventSummary();
        } else if (action === 'export') {
            await exportReport(actionButton.dataset.format || 'csv');
        } else if (action === 'camera') {
            await startQrCamera(actionButton);
        } else if (action === 'editproposal') {
            await editProposal(Number(id));
        } else if (action === 'dossier') {
            await showProjectDossier(Number(id));
        } else if (action === 'collaborate') {
            await respondToCollaboration(Number(id), value);
        } else if (action === 'invitepartner') {
            await showInvitePartnerForm(Number(id));
        }
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    } finally {
        actionButton.disabled = false;
    }
});

async function loadProposalDocuments(proposalId) {
    return request(`/proposals/${proposalId}/documents`);
}

function proposalDocumentSlots() {
    return [
        { type: 'signed_proposal_letter', key: 'signed_proposal_letter', title: 'Signed Proposal Letter', required: true, signed: true },
        { type: 'project_brief', key: 'project_brief', title: 'Project Brief Document', required: true, signed: false },
        { type: 'moa', key: 'signed_moa_mou', title: 'Signed MOA / MOU', required: true, signed: true },
        { type: 'other', key: 'other', title: 'Other Supporting Attachments', required: false, signed: false }
    ];
}

function proposalDocumentForSlot(documents, slot) {
    const matching = documents.filter(document => {
        if (slot.key === 'signed_moa_mou') return ['moa', 'mou'].includes(document.document_type);
        if (slot.key === 'other') return ['other', 'narrative_report'].includes(document.document_type);
        return document.document_type === slot.type;
    });
    return matching.find(document => !slot.signed || Number(document.is_signed) === 1) || matching[0];
}

function updateProposalAttachmentCount(proposalId, attachmentCount) {
    const uploadButton = pageContent.querySelector(`tr [data-action="upload-${proposalId}"]`);
    const row = uploadButton?.closest('tr');
    const count = row?.querySelector('[data-attachment-count]');
    if (count) count.textContent = `${Number(attachmentCount)} document(s) attached`;
}

async function openDocumentForm(proposalId, { focusSlot = null } = {}) {
    document.querySelector('#proposal-upload-modal')?.remove();
    let documentState;
    try {
        documentState = await loadProposalDocuments(proposalId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
        return;
    }

    const dialog = node('dialog', undefined, 'proposal-upload-modal');
    dialog.id = 'proposal-upload-modal';
    dialog.setAttribute('aria-labelledby', 'proposal-upload-title');
    const content = node('div', undefined, 'proposal-upload-content');
    const header = node('header', undefined, 'proposal-upload-header');
    const heading = node('div');
    heading.append(
        node('p', 'PROPOSAL DOCUMENTS', 'eyebrow'),
        node('h2', 'Upload Proposal Documents'),
        node('p', 'Attach each required document to this proposal. Signed documents must be marked signed to meet submission requirements.')
    );
    heading.querySelector('h2').id = 'proposal-upload-title';
    const closeButton = button('×', 'close-document-upload', 'button button-quiet button-small proposal-upload-close');
    closeButton.setAttribute('aria-label', 'Close upload dialog');
    header.append(heading, closeButton);
    const message = node('div', '', 'proposal-upload-message');
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.hidden = true;
    const slots = node('div', undefined, 'proposal-document-slots');
    const row = pageContent.querySelector(`tr [data-action="upload-${proposalId}"]`)?.closest('tr');

    const closeDialog = () => {
        if (dialog.open) dialog.close();
        dialog.remove();
    };
    dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-action="close-document-upload"]')) closeDialog();
    });
    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeDialog();
    });

    const renderSlot = (slot, currentState) => {
        const currentDocuments = currentState.documents;
        const existing = proposalDocumentForSlot(currentDocuments, slot);
        const isReady = Boolean(currentState.readiness[slot.key]);
        const card = node('section', undefined, `proposal-document-slot${isReady ? ' is-attached' : slot.required ? ' is-missing' : ''}`);
        card.dataset.documentSlot = slot.key;
        const slotHeading = node('div', undefined, 'proposal-document-slot-heading');
        const label = node('div', undefined, 'proposal-document-slot-label');
        label.append(node('strong', slot.title));
        if (slot.required) label.append(node('span', 'Required', 'proposal-document-required'));
        else label.append(node('span', 'Optional', 'proposal-document-optional'));
        const statusText = isReady ? 'Complete' : existing && slot.signed ? 'Needs signature' : existing ? 'Attached' : slot.required ? 'Missing' : 'Optional';
        const status = node('span', statusText, `proposal-document-status${isReady ? ' is-attached' : slot.required ? ' is-missing' : ''}`);
        slotHeading.append(label, status);
        card.append(slotHeading);

        if (existing) {
            const attached = node('div', undefined, 'proposal-document-attached');
            attached.append(
                node('span', isReady ? '✓' : '!', `proposal-document-check${isReady ? '' : ' is-pending'}`),
                node('span', `File attached: ${existing.original_name}${Number(existing.is_signed) ? ' · signed' : ''}`)
            );
            card.append(attached);
        }

        const form = node('form', undefined, 'proposal-slot-upload-form');
        const fileDrop = node('label', undefined, 'proposal-file-drop');
        fileDrop.dataset.fileDrop = '';
        fileDrop.append(
            node('span', 'Choose a file or drag here', 'proposal-file-drop-title'),
            node('span', 'PDF, DOCX, PNG, or JPG · up to 10 MB', 'proposal-file-name')
        );
        const input = node('input');
        input.type = 'file';
        input.name = 'file';
        input.required = true;
        input.accept = '.pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg';
        fileDrop.append(input);
        form.append(fileDrop);

        const options = node('div', undefined, 'proposal-slot-options');
        if (slot.key === 'signed_moa_mou') {
            const agreementLabel = node('label', 'Agreement type');
            const agreement = node('select');
            agreement.name = 'agreementType';
            agreement.add(new Option('MOA', 'moa'));
            agreement.add(new Option('MOU', 'mou'));
            agreementLabel.append(agreement);
            options.append(agreementLabel);
        }
        if (slot.signed) {
            const signedLabel = node('label', 'This document is signed');
            const signed = node('input');
            signed.type = 'checkbox';
            signed.name = 'isSigned';
            signed.checked = true;
            signedLabel.prepend(signed);
            options.append(signedLabel);
        }
        const remarks = node('input');
        remarks.type = 'text';
        remarks.name = 'description';
        remarks.maxLength = 500;
        remarks.placeholder = 'Optional remarks';
        const remarksLabel = node('label', 'Remarks');
        remarksLabel.append(remarks);
        options.append(remarksLabel);
        const submit = node('button', existing ? 'Replace file' : 'Upload file', 'button button-primary button-small');
        submit.type = 'submit';
        options.append(submit);
        form.append(options);

        const fileName = fileDrop.querySelector('.proposal-file-name');
        const fileInput = input;
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            fileName.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOCX, PNG, or JPG · up to 10 MB';
        });
        ['dragenter', 'dragover'].forEach(type => fileDrop.addEventListener(type, event => {
            event.preventDefault();
            fileDrop.classList.add('is-dragging');
        }));
        ['dragleave', 'drop'].forEach(type => fileDrop.addEventListener(type, event => {
            event.preventDefault();
            fileDrop.classList.remove('is-dragging');
        }));
        fileDrop.addEventListener('drop', event => {
            const [file] = event.dataTransfer.files;
            if (!file) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileInput.files = transfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const file = fileInput.files[0];
            const allowedExtension = /\.(pdf|docx|png|jpe?g)$/i.test(file?.name || '');
            if (!file || file.size < 1 || file.size > 10 * 1024 * 1024 || !allowedExtension) {
                message.textContent = 'Choose a PDF, DOCX, PNG, or JPG file between 1 byte and 10 MB.';
                message.className = 'proposal-upload-message is-error';
                message.hidden = false;
                return;
            }
            const payload = new FormData();
            const documentType = slot.key === 'signed_moa_mou'
                ? form.elements.agreementType.value
                : slot.type;
            const isSigned = slot.signed ? form.elements.isSigned.checked : false;
            payload.set('payload', JSON.stringify({
                documentType,
                isSigned,
                description: form.elements.description.value.trim()
            }));
            payload.set('file', file);
            submit.disabled = true;
            submit.textContent = 'Uploading…';
            message.hidden = true;
            try {
                const result = await request(`/proposals/${proposalId}/documents`, { method: 'POST', body: payload });
                if (Number(result.proposalId) !== proposalId) {
                    throw new Error('The document upload was associated with an unexpected proposal.');
                }
                updateProposalAttachmentCount(proposalId, result.attachmentCount);
                documentState = {
                    documents: [{
                        id: Number(result.id),
                        document_type: documentType,
                        original_name: file.name,
                        is_signed: isSigned
                    }, ...documentState.documents],
                    readiness: result.readiness
                };
                const replacement = renderSlot(slot, documentState);
                card.replaceWith(replacement);
                if (row) row.dataset.documentReadiness = JSON.stringify(documentState.readiness);
                message.textContent = `${slot.title} uploaded successfully.`;
                message.className = 'proposal-upload-message is-success';
                message.hidden = false;
                showMessage(pageMessage, 'Proposal document uploaded.');
            } catch (error) {
                message.textContent = error.message;
                message.className = 'proposal-upload-message is-error';
                message.hidden = false;
            } finally {
                submit.disabled = false;
                submit.textContent = existing ? 'Replace file' : 'Upload file';
            }
        });
        card.append(form);
        return card;
    };

    proposalDocumentSlots().forEach(slot => {
        const card = renderSlot(slot, documentState);
        if (focusSlot === slot.key) card.classList.add('is-focus-target');
        slots.append(card);
    });
    const footer = node('footer', undefined, 'proposal-upload-actions');
    footer.append(button('Close', 'close-document-upload', 'button button-quiet'));
    content.append(header, message, slots, footer);
    dialog.append(content);
    document.body.append(dialog);
    dialog.showModal();
    if (focusSlot) {
        requestAnimationFrame(() => dialog.querySelector(`[data-document-slot="${CSS.escape(focusSlot)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
}

async function openSubmitConfirmation(proposalId) {
    document.querySelector('#proposal-submit-modal')?.remove();
    let documentState;
    try {
        documentState = await loadProposalDocuments(proposalId);
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
        return;
    }
    const proposalRow = pageContent.querySelector(`tr [data-action="submit-${proposalId}"]`)?.closest('tr');
    const proposalTitle = proposalRow?.querySelector('.proposal-title-cell strong')?.textContent || 'this proposal';
    const slots = proposalDocumentSlots().filter(slot => slot.required);
    const missing = slots.filter(slot => !documentState.readiness[slot.key]);
    const dialog = node('dialog', undefined, 'proposal-submit-modal');
    dialog.id = 'proposal-submit-modal';
    dialog.setAttribute('aria-labelledby', 'proposal-submit-title');
    const content = node('div', undefined, 'proposal-submit-content');
    const header = node('header', undefined, 'proposal-submit-header');
    const heading = node('div');
    heading.append(node('p', 'SUBMISSION REVIEW', 'eyebrow'));
    const title = node('h2', 'Submit proposal');
    title.id = 'proposal-submit-title';
    heading.append(title);
    const close = button('×', 'close-proposal-submit', 'button button-quiet proposal-submit-close');
    close.setAttribute('aria-label', 'Close submission dialog');
    header.append(heading, close);

    const body = node('div', undefined, 'proposal-submit-body');
    const summary = node('p', undefined, 'proposal-submit-summary');
    summary.textContent = missing.length
        ? `Complete the required documents for “${proposalTitle}” before submitting.`
        : `Are you sure you want to submit “${proposalTitle}” for CES Admin review? Once submitted, editing will be restricted.`;
    body.append(summary);
    const checklist = node('ul', undefined, 'proposal-submit-checklist');
    slots.forEach(slot => {
        const ready = Boolean(documentState.readiness[slot.key]);
        const item = node('li', undefined, ready ? 'is-complete' : 'is-missing');
        item.append(
            node('span', ready ? '✓' : '!', 'proposal-checklist-mark'),
            node('span', `${slot.title}${ready ? ' attached' : ' missing'}`)
        );
        if (!ready) {
            const attach = button('Attach', `attach-required-document-${proposalId}-${slot.key}`, 'button button-quiet button-small');
            attach.addEventListener('click', () => {
                dialog.close();
                dialog.remove();
                openDocumentForm(proposalId, { focusSlot: slot.key });
            });
            item.append(attach);
        }
        checklist.append(item);
    });
    body.append(checklist);
    const message = node('p', '', 'proposal-submit-message');
    message.hidden = true;
    const footer = node('footer', undefined, 'proposal-submit-actions');
    const cancel = button('Cancel', 'close-proposal-submit', 'button button-quiet');
    const confirm = button('Confirm Submission', `confirm-proposal-submit-${proposalId}`, 'button button-primary');
    confirm.disabled = missing.length > 0;
    if (missing.length) confirm.textContent = 'Complete required documents';
    footer.append(cancel, confirm);
    content.append(header, body, message, footer);
    dialog.append(content);
    dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-action="close-proposal-submit"]')) dialog.close();
        if (event.target.closest(`[data-action^="confirm-proposal-submit-${proposalId}"]`)) {
            event.preventDefault();
        }
    });
    confirm.addEventListener('click', async () => {
        if (missing.length) return;
        confirm.disabled = true;
        confirm.textContent = 'Submitting…';
        try {
            await request(`/proposals/${proposalId}/submit`, { method: 'POST', body: '{}' });
            dialog.close();
            await renderPage('proposals');
            showMessage(pageMessage, 'Proposal submitted for CES Admin review.');
        } catch (error) {
            message.textContent = error.message;
            message.className = 'proposal-submit-message is-error';
            message.hidden = false;
            confirm.disabled = false;
            confirm.textContent = 'Confirm Submission';
        }
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

async function showDates(eventId) {
    const { dates } = await request(`/events/${eventId}/dates`);
    const section = panel('Event dates');
    for (const date of dates) {
        const row = node('div', undefined, 'record');
        row.append(node('div', dashboardDate(date.event_date, { month: 'long', day: 'numeric', year: 'numeric' }), 'record-main'));
        if (currentUser.role !== 'volunteer') {
            const actions = node('div', undefined, 'record-actions');
            actions.append(
                button('Show QR', `qr-${date.id}`, 'button button-quiet button-small'),
                button('Attendance', `attendance-list-${date.id}`, 'button button-quiet button-small'),
                button('Participants', `participants-${date.id}`, 'button button-quiet button-small')
            );
            row.append(actions);
        }
        section.append(row);
    }
    const existing = pageContent.querySelector('.event-dates');
    existing?.remove();
    section.classList.add('event-dates');
    pageContent.prepend(section);
    section.addEventListener('click', async event => {
        const target = event.target.closest('[data-action^="qr-"]');
        if (!target) return;
        const eventDateId = target.dataset.action.slice(3);
        try {
            const result = await request(`/event-dates/${eventDateId}/qr`);
            const payload = JSON.parse(result.payload);
            const wrapper = node('div', undefined, 'panel');
            const image = node('img');
            image.src = result.qrImage;
            image.alt = `Attendance QR code for ${result.date}`;
            image.width = 220;
            image.height = 220;
            wrapper.append(node('h2', `Date-locked QR · ${result.date}`), image, node('code', JSON.stringify(payload), 'qr-payload'));
            section.append(wrapper);
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    });
}

async function showDateAttendance(eventDateId) {
    const { attendance } = await request(`/event-dates/${eventDateId}/attendance`);
    const section = panel('Event-date attendance', 'Only approved applications are listed. Save a status override with an optional note.');
    if (!attendance.length) {
        section.append(node('div', 'No approved volunteers are assigned to this event date.', 'empty'));
    }
    attendance.forEach(item => {
        const record = node('article', undefined, 'record');
        const info = node('div', undefined, 'record-main');
        info.append(
            node('strong', `${item.first_name} ${item.last_name}`),
            node('small', `${item.email} · ${item.affiliation || 'Volunteer'} · ${item.attendance_status || 'Not recorded'}${item.scanned_at ? ` · ${dashboardDate(item.scanned_at, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}`)
        );
        const controls = node('div', undefined, 'attendance-edit-controls');
        const status = node('select');
        status.setAttribute('aria-label', `Attendance status for ${item.first_name} ${item.last_name}`);
        status.add(new Option('Choose status', ''));
        [['present', 'Present'], ['absent', 'Absent'], ['excused', 'Excused']].forEach(([value, label]) => status.add(new Option(label, value)));
        status.value = item.attendance_status || '';
        const note = node('input');
        note.type = 'text';
        note.maxLength = 500;
        note.placeholder = 'Optional note';
        note.value = item.attendance_note || '';
        note.setAttribute('aria-label', `Attendance note for ${item.first_name} ${item.last_name}`);
        const save = button('Save', `attendance-${item.application_id}-${status.value}`, 'button button-primary button-small');
        save.disabled = !status.value;
        save.dataset.eventDateId = eventDateId;
        status.addEventListener('change', () => {
            save.dataset.action = `attendance-${item.application_id}-${status.value}`;
            save.disabled = !status.value;
        });
        save.addEventListener('click', () => { save.dataset.note = note.value; });
        controls.append(status, note, save);
        record.append(info, controls);
        section.append(record);
    });
    const existing = pageContent.querySelector('.attendance-panel');
    existing?.remove();
    section.classList.add('attendance-panel');
    pageContent.prepend(section);
}

async function showParticipantCounts(eventDateId) {
    const { participants } = await request(`/event-dates/${eventDateId}/participants`);
    const section = panel('Participant counts', 'Record non-financial participant totals for this event date.');
    const form = node('form', undefined, 'panel-form');
    form.innerHTML = '<label>Participant group<input name="group" maxlength="120" required></label><label>Count<input name="count" type="number" min="0" max="1000000" required></label><button class="button button-primary" type="submit">Add count</button>';
    form.addEventListener('submit', async event => {
        event.preventDefault();
        try {
            const values = Object.fromEntries(new FormData(form));
            await request(`/event-dates/${eventDateId}/participants`, {
                method: 'POST',
                body: JSON.stringify({ group: values.group, count: Number(values.count) })
            });
            await showParticipantCounts(eventDateId);
            await refreshAdminEventSummary();
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    });
    section.append(form);
    if (!participants.length) section.append(node('div', 'No participant totals recorded for this date.', 'empty'));
    participants.forEach(item => section.append(node('div', `${item.participant_group}: ${item.participant_count}`, 'record')));
    const existing = pageContent.querySelector('.participant-panel');
    existing?.remove();
    section.classList.add('participant-panel');
    pageContent.prepend(section);
}

async function showCertificates(eventId) {
    const { certificates } = await request(`/events/${eventId}/certificates`);
    const section = panel(currentUser.role === 'volunteer' ? 'My certificates' : 'Event certificates');
    if (!certificates.length) section.append(node('div', 'No certificates have been issued for this event.', 'empty'));
    certificates.forEach(certificate => {
        const record = node('article', undefined, 'record');
        const name = currentUser.role === 'volunteer'
            ? `Issued ${dashboardDate(certificate.issued_at, { month: 'short', day: 'numeric', year: 'numeric' })}`
            : `${certificate.first_name} ${certificate.last_name} · ${dashboardDate(certificate.issued_at, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        const link = node('a', 'Download certificate', 'button button-quiet button-small');
        link.href = `${API}/certificates/${certificate.id}`;
        record.append(node('span', name, 'record-main'), link);
        section.append(record);
    });
    if (currentUser.role !== 'volunteer') {
        const form = node('form', undefined, 'panel-form');
        form.innerHTML = '<label>Eligible volunteer<select name="volunteerId" required><option value="">Loading attendees…</option></select></label><label>Certificate file<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required></label><button class="button button-primary" type="submit">Issue certificate</button>';
        const eligibleVolunteers = (await request(`/events/${eventId}/applications`)).applications
            .filter(application => application.status === 'approved' && Number(application.attendance_count) > 0);
        const volunteerSelect = form.elements.volunteerId;
        volunteerSelect.replaceChildren(new Option('Choose an attendee', ''));
        eligibleVolunteers.forEach(application => {
            volunteerSelect.add(new Option(`${application.first_name} ${application.last_name}`, application.volunteer_user_id));
        });
        if (!eligibleVolunteers.length) {
            section.append(node('p', 'Certificates can be issued after an approved volunteer has attended at least one event date.', 'empty'));
        }
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const data = new FormData(form);
            try {
                await request(`/events/${eventId}/certificates`, { method: 'POST', body: data });
                await showCertificates(eventId);
                showMessage(pageMessage, 'Certificate issued.');
            } catch (error) {
                showMessage(pageMessage, error.message, 'error');
            }
        });
        if (eligibleVolunteers.length) section.append(form);
    }
    const existing = pageContent.querySelector('.certificate-panel');
    existing?.remove();
    section.classList.add('certificate-panel');
    pageContent.prepend(section);
}

async function showApplications(eventId) {
    const { applications } = await request(`/events/${eventId}/applications`);
    const section = panel('Volunteer applications');
    section.classList.add('applications-panel');
    if (!applications.length) section.append(node('div', 'No applications have been submitted.', 'empty'));
    applications.forEach(application => {
        const row = node('div', undefined, 'record');
        const info = node('div', undefined, 'record-main');
        info.append(
            node('strong', `${application.first_name} ${application.last_name}`),
            node('small', `${application.email} · ${application.affiliation || 'Volunteer'} · Applied ${dashboardDate(application.applied_at, { month: 'short', day: 'numeric', year: 'numeric' })} · ${Number(application.attendance_count || 0)} date(s) attended`)
        );
        row.append(info);
        row.append(node('span', application.status, `badge status-badge status-${application.status}`));
        if (application.status === 'pending') {
            const actions = node('div', undefined, 'record-actions');
            const approve = button('Approve', 'appreview', 'button button-primary button-small');
            approve.dataset.id = application.id;
            approve.dataset.eventId = eventId;
            approve.dataset.status = 'approved';
            const reject = button('Reject', 'appreview', 'button button-danger button-small');
            reject.dataset.id = application.id;
            reject.dataset.eventId = eventId;
            reject.dataset.status = 'rejected';
            actions.append(approve, reject);
            row.append(actions);
        }
        section.append(row);
    });
    const existing = pageContent.querySelector('.applications-panel');
    existing?.remove();
    section.classList.add('applications-panel');
    pageContent.prepend(section);
}

async function showInvitePartnerForm(proposalId) {
    const { partners } = await request('/directory');
    const section = panel('Invite a partner', 'The selected approved organization will receive a collaboration invitation.');
    const form = node('form', undefined, 'panel-form');
    form.innerHTML = '<label>Partner organization<select name="partnerId" required><option value="">Choose an organization</option></select></label><button class="button button-primary" type="submit">Send invitation</button>';
    partners.forEach(partner => form.elements.partnerId.add(new Option(partner.organization_name, partner.id)));
    form.addEventListener('submit', async event => {
        event.preventDefault();
        try {
            await request(`/proposals/${proposalId}/collaborators`, {
                method: 'POST',
                body: JSON.stringify({ partnerId: form.elements.partnerId.value })
            });
            section.remove();
            showMessage(pageMessage, 'Collaboration invitation sent.');
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    });
    const existing = pageContent.querySelector('.invite-partner-panel');
    existing?.remove();
    section.classList.add('invite-partner-panel');
    section.append(form);
    pageContent.prepend(section);
}

async function respondToCollaboration(proposalId, response) {
    await request(`/collaborations/${proposalId}/respond`, { method: 'POST', body: JSON.stringify({ response }) });
    await renderPage('proposals');
    showMessage(pageMessage, `Collaboration invitation ${response}.`);
}

async function exportReport(format) {
    const form = pageContent.querySelector('.panel-form');
    if (!form.reportValidity()) return;
    const query = new URLSearchParams(Object.fromEntries(new FormData(form)));
    query.set('format', format);
    const response = await fetch(`${API}/reports?${query}`, { credentials: 'same-origin' });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Report export failed.');
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ucc-ces-${form.elements.module.value}-report.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function showProjectDossier(projectId) {
    const data = await request(`/reports/projects/${projectId}`);
    document.querySelector('#project-dossier-modal')?.remove();
    const project = data.project;
    const dateRange = project.periodStart
        ? `${project.periodStart}${project.periodEnd ? ` to ${project.periodEnd}` : ''}`
        : 'Unscheduled';
    const dialog = node('dialog', undefined, 'project-dossier-modal');
    dialog.id = 'project-dossier-modal';
    dialog.setAttribute('aria-labelledby', 'project-dossier-title');
    const content = node('div', undefined, 'project-dossier-content');
    const header = node('header', undefined, 'project-dossier-header');
    const heading = node('div', undefined, 'project-dossier-heading');
    const eyebrow = node('p', 'PROJECT PROPOSAL', 'eyebrow');
    const title = node('h2', project.title);
    title.id = 'project-dossier-title';
    const status = node('span', project.status.replaceAll('_', ' '), `badge proposal-status status-${project.status}`);
    const headingMeta = node('div', undefined, 'project-dossier-meta');
    headingMeta.append(status, node('span', dateRange));
    heading.append(eyebrow, title, headingMeta);
    const closeButton = button('×', 'close-project-dossier', 'button button-quiet project-dossier-close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close proposal details');
    header.append(heading, closeButton);

    const body = node('div', undefined, 'project-dossier-body');
    const summary = node('section', undefined, 'project-dossier-section project-dossier-summary');
    summary.append(node('h3', 'Project Overview'), node('p', project.summary || 'No brief description provided.'));
    body.append(summary);

    const brief = node('section', undefined, 'project-dossier-section');
    brief.append(node('h3', 'Project Brief'));
    const briefGroups = [
        ['Co-Proponents / Partner Entities', (project.proponents || []).join(', ') || 'No co-proponents provided.'],
        ['Program Duration', project.duration || dateRange],
        ['Activity Components', (project.activityComponents || []).join('\n') || 'No activity components provided.'],
        ['Justification / Objectives', project.justification || 'Not provided'],
        ['Target Beneficiaries & Headcount', project.targetBeneficiaries || 'Not provided'],
        ['Target Outputs / Success Indicators', project.targetOutputs || 'Not provided'],
        ['Possible Risks & Mitigation Plan', project.possibleRisks || 'Not provided'],
        ['Expected Private / External Partnerships', project.expectedPrivatePartnerships || 'Not provided']
    ];
    const fields = node('div', undefined, 'project-dossier-fields');
    briefGroups.forEach(([label, value]) => {
        const detail = node('div', undefined, 'project-brief-field');
        detail.append(node('strong', label), node('p', value));
        fields.append(detail);
    });
    brief.append(fields);

    const budget = node('section', undefined, 'project-dossier-section project-dossier-budget');
    budget.append(node('h3', 'Estimated Cost Breakdown'));
    const budgetItems = data.project.estimatedCostItems || [];
    if (!budgetItems.length) {
        budget.append(node('p', 'No budget items provided.'));
    } else {
        const table = node('table', undefined, 'proposal-table');
        table.innerHTML = '<thead><tr><th>Item</th><th>Unit / Pax</th><th>Quantity</th><th>Unit Cost</th><th>Subtotal</th></tr></thead>';
        const tbody = node('tbody');
        budgetItems.forEach(item => {
            const row = node('tr');
            row.append(
                node('td', item.description),
                node('td', item.unit),
                node('td', item.quantity),
                node('td', `₱${Number(item.cost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`),
                node('td', `₱${Number(item.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`)
            );
            tbody.append(row);
        });
        table.append(tbody);
        const tableWrap = node('div', undefined, 'proposal-table-wrap');
        tableWrap.append(table);
        budget.append(tableWrap);
    }
    budget.append(node('p', `Total Estimated Cost: ₱${Number(project.totalEstimatedCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'project-brief-total'));
    brief.append(budget);
    body.append(brief);

    const groups = [
        ['Partners', data.partners.map(item => `${item.organization_name} (${item.relationship})`)],
        ['Schedule', data.schedules.map(item => `${item.event_date} · ${item.event_title} / ${item.activity_title} · ${item.start_time}–${item.end_time} · ${item.venue}`)],
        ['Attendance', data.attendance.map(item => `${item.event_date} · ${item.event_title}: ${item.present} present, ${item.absent} absent, ${item.excused} excused of ${item.approved_volunteers} approved`)],
        ['Volunteers', data.volunteers.map(item => `${item.first_name} ${item.last_name} · ${item.volunteer_type} · ${item.event_title} · ${item.application_status}`)],
        ['Participants', data.participants.map(item => `${item.event_date} · ${item.event_title} · ${item.participant_group}: ${item.participant_count}`)]
    ];
    const related = node('section', undefined, 'project-dossier-section project-dossier-related');
    related.append(node('h3', 'Related Activity'));
    const relatedGrid = node('div', undefined, 'project-dossier-related-grid');
    for (const [title, rows] of groups) {
        const subsection = node('div', undefined, 'project-dossier-related-card');
        subsection.append(node('h4', title));
        if (!rows.length) subsection.append(node('p', 'No records yet.'));
        rows.forEach(text => subsection.append(node('p', text)));
        relatedGrid.append(subsection);
    }
    related.append(relatedGrid);

    const documents = node('section', undefined, 'project-dossier-section project-dossier-documents');
    documents.append(node('h3', 'Documentation'));
    if (!data.documents.length) documents.append(node('p', 'No documents attached.'));
    data.documents.forEach(item => {
        const detail = item.description ? ` · ${item.description}` : '';
        const link = node('a', `${item.document_type.replaceAll('_', ' ')} · ${item.original_name}${Number(item.is_signed) ? ' · signed' : ''}${detail}`);
        link.href = `${API}/documents/${item.id}`;
        link.target = '_blank';
        link.rel = 'noopener';
        documents.append(link);
    });
    const evaluation = data.evaluation;
    const evaluationSection = node('section', undefined, 'project-dossier-section project-dossier-evaluation');
    evaluationSection.append(node('h3', 'Evaluation'), node('p', `${evaluation.evaluation_count} response(s) · average rating ${evaluation.average_rating ? Number(evaluation.average_rating).toFixed(1) : 'not rated'}/5`));
    body.append(related, documents, evaluationSection);

    const footer = node('footer', undefined, 'project-dossier-footer');
    const download = node('a', 'Download / Print PDF', 'button button-primary');
    download.href = `${API}/proposals/${projectId}/brief.pdf`;
    download.target = '_blank';
    download.rel = 'noopener';
    const footerClose = button('Close', 'close-project-dossier', 'button button-quiet');
    footerClose.type = 'button';
    footer.append(download, footerClose);

    content.append(header, body, footer);
    dialog.append(content);
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('click', event => {
        if (event.target.closest('[data-action="close-project-dossier"]')) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

async function startQrCamera(trigger) {
    const video = pageContent.querySelector('#qr-camera');
    const payloadInput = pageContent.querySelector('[name="payload"]');
    if (qrStream) {
        stopQrCamera();
        trigger.textContent = 'Use camera';
        return;
    }
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('QR camera scanning is not supported in this browser. Paste the QR payload instead.');
    }
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = qrStream;
    video.hidden = false;
    trigger.textContent = 'Stop camera';
    await video.play();
    let detector;
    try {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (error) {
        stopQrCamera();
        trigger.textContent = 'Use camera';
        throw new Error(`Camera scanner could not be initialized: ${error.message}`);
    }
    const scan = async () => {
        if (!qrStream) return;
        try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
                payloadInput.value = codes[0].rawValue;
                stopQrCamera();
                trigger.textContent = 'Use camera';
                pageContent.querySelector('.scan-form').requestSubmit();
                return;
            }
        } catch (error) {
            stopQrCamera();
            trigger.textContent = 'Use camera';
            showMessage(pageMessage, `QR scan failed: ${error.message}`, 'error');
            return;
        }
        qrTimer = window.setTimeout(scan, 400);
    };
    scan();
}

function stopQrCamera() {
    if (qrTimer) window.clearTimeout(qrTimer);
    qrTimer = 0;
    if (qrStream) qrStream.getTracks().forEach(track => track.stop());
    qrStream = null;
    const video = pageContent.querySelector('#qr-camera');
    if (video) {
        video.srcObject = null;
        video.hidden = true;
    }
}

loadSession();
