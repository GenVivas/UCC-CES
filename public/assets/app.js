const API = 'api';
const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const authMessage = document.querySelector('#auth-message');
const pageMessage = document.querySelector('#page-message');
const pageContent = document.querySelector('#page-content');
const pageHeading = document.querySelector('#page-heading');
const topActions = document.querySelector('#top-actions');
let csrfToken = '';
let currentUser = null;
let currentPage = 'overview';
let qrStream = null;
let qrTimer = 0;

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
    renderPage('overview');
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

document.querySelector('#register-form [name="role"]').addEventListener('change', event => {
    const isVolunteer = event.target.value === 'volunteer';
    document.querySelector('#partner-fields').hidden = isVolunteer;
    document.querySelector('#volunteer-fields').hidden = !isVolunteer;
    document.querySelector('#register-form [name="proof"]').required = isVolunteer;
});
document.querySelector('#register-form [name="role"]').dispatchEvent(new Event('change'));

document.querySelector('#register-form [name="studentNumber"]').addEventListener('input', event => {
    const campus = document.querySelector('#register-form [name="campus"]');
    if (event.target.value.endsWith('-S')) campus.value = 'Main Campus';
    if (event.target.value.endsWith('-N') && !campus.value) campus.value = 'Congressional / Bagong Silang / Camarin';
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

document.querySelector('#register-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    clearMessage(authMessage);
    setBusy(form, true);
    try {
        const values = Object.fromEntries(new FormData(form));
        const proof = values.proof;
        delete values.proof;
        let result;
        if (values.role === 'volunteer') {
            const payload = new FormData();
            payload.set('payload', JSON.stringify(values));
            payload.set('proof', proof);
            result = await request('/register', { method: 'POST', body: payload });
        } else {
            result = await request('/register', { method: 'POST', body: JSON.stringify(values) });
        }
        form.reset();
        showMessage(authMessage, result.message);
    } catch (error) {
        showMessage(authMessage, error.message, 'error');
    } finally {
        setBusy(form, false);
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
    const target = event.target.closest('[data-page]');
    if (!target) return;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('is-active', item === target));
    renderPage(target.dataset.page);
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
        accounts: ['admin'],
        reports: ['admin', 'partner']
    };
    if (pageRoles[page] && !pageRoles[page].includes(currentUser.role)) {
        page = 'overview';
    }
    stopQrCamera();
    currentPage = page;
    clearMessage(pageMessage);
    pageContent.replaceChildren();
    const pages = {
        overview: ['Overview', 'A quick view of your UCC-CES workspace.'],
        proposals: ['Proposals', 'Build, submit, and track community project proposals.'],
        directory: ['Partner directory', 'Find approved organizations across the community network.'],
        events: ['Events & attendance', 'Coordinate volunteer applications and event-day attendance.'],
        accounts: ['Account approvals', 'Review partner and volunteer account requests.'],
        reports: ['Project reports', 'Explore project activity with date-bounded, non-financial reporting.'],
        notifications: ['Notifications', 'Your latest system updates.']
    };
    const heading = pages[page] || pages.overview;
    setHeading(heading[0], heading[1]);
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
        const section = panel('Start a proposal', 'Create a draft, attach the required documents, then submit it for CES Admin review.');
        const form = node('form', undefined, 'panel-form');
        form.innerHTML = '<label>Project title<input name="title" required></label><label>Duration<input name="duration" placeholder="e.g. 1 month"></label><label>Start date<input name="periodStart" type="date"></label><label>End date<input name="periodEnd" type="date"></label><label class="wide">Project summary<textarea name="summary" rows="3" required></textarea></label><fieldset class="wide choice-group"><legend>Classification (choose at least one)</legend><label><input type="checkbox" name="classifications" value="CES"> CES</label><label><input type="checkbox" name="classifications" value="Student Development"> Student Development</label></fieldset><fieldset class="wide choice-group"><legend>CES category (choose at least one)</legend><div data-category-options>Loading categories…</div></fieldset><button class="button button-primary" type="submit">Save draft</button>';
        const { categories } = await request('/categories');
        const categoryOptions = form.querySelector('[data-category-options]');
        categoryOptions.replaceChildren();
        categories.forEach(category => {
            const label = node('label', category.name);
            const checkbox = node('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'categoryIds';
            checkbox.value = category.id;
            label.prepend(checkbox);
            categoryOptions.append(label);
        });
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
    const { proposal } = await request(`/proposals/${proposalId}/edit-data`);
    const section = panel('Edit draft proposal', 'Update your draft before submitting it for CES Admin review.');
    section.classList.add('proposal-edit-panel');
    const form = node('form', undefined, 'panel-form');
    form.innerHTML = '<label>Project title<input name="title" required></label><label>Duration<input name="duration" placeholder="e.g. 1 month"></label><label>Start date<input name="periodStart" type="date"></label><label>End date<input name="periodEnd" type="date"></label><label class="wide">Project summary<textarea name="summary" rows="3" required></textarea></label><div class="wide proposal-edit-actions"></div>';
    form.elements.title.value = proposal.title;
    form.elements.duration.value = proposal.duration || '';
    form.elements.periodStart.value = proposal.periodStart || '';
    form.elements.periodEnd.value = proposal.periodEnd || '';
    form.elements.summary.value = proposal.summary;
    const actions = form.querySelector('.proposal-edit-actions');
    const save = node('button', 'Save changes', 'button button-primary');
    save.type = 'submit';
    const cancel = node('button', 'Cancel', 'button button-quiet');
    cancel.type = 'button';
    cancel.addEventListener('click', () => section.remove());
    actions.append(save, cancel);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        setBusy(form, true);
        try {
            await request(`/proposals/${proposalId}`, {
                method: 'PUT',
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
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
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.classifications = formData.getAll('classifications');
    data.categoryIds = formData.getAll('categoryIds');
    if (!data.classifications.length || !data.categoryIds.length) {
        showMessage(pageMessage, 'Select at least one project classification and CES category.', 'error');
        return;
    }
    try {
        await request('/proposals', { method: 'POST', body: JSON.stringify(data) });
        await renderPage('proposals');
        showMessage(pageMessage, 'Draft saved.');
    } catch (error) {
        showMessage(pageMessage, error.message, 'error');
    }
}

async function renderDirectory() {
    const { partners, sectors = [] } = await request('/directory');
    if (currentUser.role === 'admin') {
        const management = panel('Manage partner directory', 'Create sector classifications, add subcategories, and assign organizations to one or more subcategories.');
        const sectorForm = node('form', undefined, 'panel-form directory-management-form');
        sectorForm.innerHTML = '<label>New sector<input name="name" maxlength="120" required></label><button class="button button-primary" type="submit">Add sector</button>';
        sectorForm.addEventListener('submit', async event => {
            event.preventDefault();
            try {
                await request('/directory', { method: 'POST', body: JSON.stringify({ type: 'sector', name: new FormData(sectorForm).get('name') }) });
                await renderPage('directory');
                showMessage(pageMessage, 'Sector added.');
            } catch (error) {
                showMessage(pageMessage, error.message, 'error');
            }
        });
        const subcategoryForm = node('form', undefined, 'panel-form directory-management-form');
        subcategoryForm.innerHTML = '<label>Sector<select name="sectorId" required></select></label><label>New subcategory<input name="name" maxlength="120" required></label><button class="button button-primary" type="submit">Add subcategory</button>';
        sectors.filter(item => item.subcategory_id === null).forEach(item => subcategoryForm.elements.sectorId.add(new Option(item.sector_name, item.sector_id)));
        sectors.filter(item => item.subcategory_id !== null).forEach(item => {
            if (!Array.from(subcategoryForm.elements.sectorId.options).some(option => option.value === String(item.sector_id))) {
                subcategoryForm.elements.sectorId.add(new Option(item.sector_name, item.sector_id));
            }
        });
        subcategoryForm.addEventListener('submit', async event => {
            event.preventDefault();
            try {
                await request('/directory', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'subcategory',
                        sectorId: subcategoryForm.elements.sectorId.value,
                        name: subcategoryForm.elements.name.value
                    })
                });
                await renderPage('directory');
                showMessage(pageMessage, 'Subcategory added.');
            } catch (error) {
                showMessage(pageMessage, error.message, 'error');
            }
        });
        management.append(sectorForm, subcategoryForm);
        pageContent.append(management);
    }
    if (!partners.length) {
        pageContent.append(node('div', 'No approved partners are listed yet.', 'empty'));
        return;
    }
    const filters = node('div', undefined, 'proposal-filters directory-filters');
    filters.innerHTML = '<label>Search organizations<input name="search" type="search" placeholder="Name, type, sector, or location"></label>';
    const list = node('div', undefined, 'record-list');
    partners.forEach(partner => {
        const record = node('article', undefined, 'record directory-record');
        record.dataset.search = `${partner.organization_name} ${partner.organization_type} ${partner.address || ''} ${partner.sectors || ''} ${partner.subcategories || ''}`.toLocaleLowerCase();
        const info = node('div', undefined, 'record-main');
        info.append(
            node('strong', partner.organization_name),
            node('small', `${partner.organization_type} · ${partner.email}`),
            node('small', partner.address || 'Address not provided'),
            node('small', partner.subcategories || 'No sector subcategories assigned')
        );
        record.append(info, node('span', partner.sectors || 'Unclassified', 'badge'));
        if (currentUser.role === 'admin') {
            const edit = node('form', undefined, 'directory-assignment-form');
            const nameLabel = node('label', 'Organization name');
            const nameInput = node('input');
            nameInput.name = 'organizationName';
            nameInput.maxLength = 190;
            nameInput.required = true;
            nameInput.value = partner.organization_name;
            nameLabel.append(nameInput);
            const typeLabel = node('label', 'Organization type');
            const typeSelect = node('select');
            typeSelect.name = 'organizationType';
            ['NGA', 'LGU', 'NGO', 'Private Sector', 'BPO', 'Church', 'UCC Department', 'College', 'Barangay', 'Other']
                .forEach(type => typeSelect.add(new Option(type, type)));
            typeSelect.value = partner.organization_type;
            typeLabel.append(typeSelect);
            const addressLabel = node('label', 'Address');
            const addressInput = node('input');
            addressInput.name = 'address';
            addressInput.maxLength = 500;
            addressInput.value = partner.address || '';
            addressLabel.append(addressInput);
            const label = node('label', 'Subcategories');
            const select = node('select');
            select.name = 'subcategoryIds';
            select.multiple = true;
            const assigned = new Set((partner.subcategory_ids || '').split(',').filter(Boolean));
            sectors.filter(item => item.subcategory_id !== null).forEach(item => {
                const option = new Option(`${item.sector_name} / ${item.subcategory_name}`, item.subcategory_id);
                option.selected = assigned.has(String(item.subcategory_id));
                select.add(option);
            });
            label.append(select);
            const save = node('button', 'Save organization profile', 'button button-quiet button-small');
            save.type = 'submit';
            edit.append(nameLabel, typeLabel, addressLabel, label, save);
            edit.addEventListener('submit', async event => {
                event.preventDefault();
                try {
                    await request(`/directory/${partner.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            organizationName: nameInput.value,
                            organizationType: typeSelect.value,
                            address: addressInput.value,
                            subcategoryIds: Array.from(select.selectedOptions, option => option.value)
                        })
                    });
                    await renderPage('directory');
                    showMessage(pageMessage, 'Partner organization profile and classifications updated.');
                } catch (error) {
                    showMessage(pageMessage, error.message, 'error');
                }
            });
            record.append(edit);
        }
        list.append(record);
    });
    filters.addEventListener('input', () => {
        const search = filters.querySelector('[name="search"]').value.trim().toLocaleLowerCase();
        let visible = 0;
        list.querySelectorAll('.directory-record').forEach(record => {
            record.hidden = Boolean(search) && !record.dataset.search.includes(search);
            if (!record.hidden) visible++;
        });
        empty.hidden = visible > 0;
    });
    const empty = node('div', 'No organizations match your search.', 'empty');
    empty.hidden = true;
    pageContent.append(filters, list, empty);
}

async function renderEvents() {
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
        } else {
            actions.append(button('Applications', `applications-${item.id}`), button('Dates / attendance', `dates-${item.id}`), button('Certificates', `certificates-${item.id}`));
        }
        record.append(info, actions);
        list.append(record);
    }
    pageContent.append(list);
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
    const { accounts } = await request(`/accounts${status ? `?status=${encodeURIComponent(status)}` : ''}`);
    const section = panel('Account register', 'Review pending accounts or filter the approved, rejected, and disabled account records.');
    const filters = node('div', undefined, 'proposal-filters account-filters');
    filters.innerHTML = '<label>Account status<select name="status"><option value="pending">Pending approval</option><option value="">All accounts</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="disabled">Disabled</option></select></label>';
    filters.querySelector('select').value = status;
    filters.querySelector('select').addEventListener('change', event => renderAccounts(event.target.value));
    const list = node('div', undefined, 'record-list');
    accounts.forEach(account => {
        const record = node('article', undefined, 'record');
        const info = node('div', undefined, 'record-main');
        info.append(
            node('strong', `${account.first_name} ${account.last_name}`),
            node('small', `${account.email} · ${account.role} · ${account.contact_number}`),
            node('small', account.role === 'partner'
                ? `${account.organization_name || 'Organization not provided'}${account.organization_type ? ` · ${account.organization_type}` : ''}`
                : account.role === 'volunteer'
                    ? `${account.volunteer_type || 'Volunteer'}${account.student_number ? ` · ${account.student_number}` : ''}${account.campus ? ` · ${account.campus}` : ''}`
                    : ''),
            node('small', `Registered ${dashboardDate(account.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}`)
        );
        const actions = node('div', undefined, 'record-actions');
        if (account.role === 'volunteer') {
            const proofLink = node('a', 'View proof', 'button button-quiet button-small');
            proofLink.href = `${API}/accounts/${account.id}/proof`;
            proofLink.target = '_blank';
            proofLink.rel = 'noopener';
            actions.append(proofLink);
        }
        if (account.account_status === 'pending') {
            actions.append(button('Approve', `account-${account.id}-approved`, 'button button-primary button-small'), button('Reject', `account-${account.id}-rejected`, 'button button-danger button-small'));
        } else if (account.account_status === 'approved') {
            actions.append(button('Disable account', `account-${account.id}-disabled`, 'button button-danger button-small'));
        } else if (account.account_status === 'disabled') {
            actions.append(button('Re-enable', `account-${account.id}-approved`, 'button button-primary button-small'));
        }
        record.append(info, node('span', account.account_status, `badge status-badge status-${account.account_status}`), actions);
        list.append(record);
    });
    const empty = node('div', status === 'pending' ? 'There are no accounts waiting for approval.' : 'No accounts match this status.', 'empty');
    empty.hidden = accounts.length > 0;
    section.append(filters, list, empty);
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
            await request(`/proposals/${id}/submit`, { method: 'POST', body: '{}' });
            showMessage(pageMessage, 'Proposal submitted for review.');
            await renderPage('proposals');
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
            openDocumentForm(Number(id));
        } else if (action === 'dates') {
            await showDates(Number(id));
        } else if (action === 'applications') {
            await showApplications(Number(id));
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

async function openDocumentForm(proposalId) {
    const section = panel('Upload proposal document', 'Signed proposal letter, project brief, and a signed MOA or MOU are required before submission.');
    const form = node('form', undefined, 'panel-form');
    form.innerHTML = '<label>Document type<select name="documentType" required><option value="signed_proposal_letter">Signed proposal letter</option><option value="project_brief">Project brief</option><option value="moa">MOA</option><option value="mou">MOU</option><option value="other">Other</option></select></label><label>File<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required></label><label><span>Signed document</span><select name="isSigned"><option value="1">Yes</option><option value="0">No</option></select></label><button class="button button-primary" type="submit">Upload</button>';
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const file = values.file;
        delete values.file;
        const payload = new FormData();
        payload.set('payload', JSON.stringify(values));
        payload.set('file', file);
        try {
            await request(`/proposals/${proposalId}/documents`, { method: 'POST', body: payload });
            showMessage(pageMessage, 'Document uploaded.');
            section.remove();
        } catch (error) {
            showMessage(pageMessage, error.message, 'error');
        }
    });
    pageContent.prepend(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        info.append(node('strong', `${item.first_name} ${item.last_name}`), node('small', item.email));
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
    if (!applications.length) section.append(node('div', 'No applications have been submitted.', 'empty'));
    applications.forEach(application => {
        const row = node('div', undefined, 'record');
        row.append(node('div', `${application.first_name} ${application.last_name} · ${application.email}`, 'record-main'));
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
    const section = panel(data.project.title, `${data.project.status.replaceAll('_', ' ')} · ${data.project.periodStart || 'Unscheduled'} to ${data.project.periodEnd || 'Unscheduled'}`);
    section.append(node('p', data.project.summary));
    const groups = [
        ['Partners', data.partners.map(item => `${item.organization_name} (${item.relationship})`)],
        ['Schedule', data.schedules.map(item => `${item.event_date} · ${item.event_title} / ${item.activity_title} · ${item.start_time}–${item.end_time} · ${item.venue}`)],
        ['Attendance', data.attendance.map(item => `${item.event_date} · ${item.event_title}: ${item.present} present, ${item.absent} absent, ${item.excused} excused of ${item.approved_volunteers} approved`)],
        ['Volunteers', data.volunteers.map(item => `${item.first_name} ${item.last_name} · ${item.volunteer_type} · ${item.event_title} · ${item.application_status}`)],
        ['Participants', data.participants.map(item => `${item.event_date} · ${item.event_title} · ${item.participant_group}: ${item.participant_count}`)]
    ];
    for (const [title, rows] of groups) {
        const subsection = node('section', undefined, 'dossier-section');
        subsection.append(node('h3', title));
        if (!rows.length) subsection.append(node('p', 'No records yet.'));
        rows.forEach(text => subsection.append(node('p', text)));
        section.append(subsection);
    }
    const documents = node('section', undefined, 'dossier-section');
    documents.append(node('h3', 'Documentation'));
    if (!data.documents.length) documents.append(node('p', 'No documents attached.'));
    data.documents.forEach(item => {
        const link = node('a', `${item.document_type.replaceAll('_', ' ')} · ${item.original_name}${Number(item.is_signed) ? ' · signed' : ''}`);
        link.href = `${API}/documents/${item.id}`;
        link.target = '_blank';
        link.rel = 'noopener';
        documents.append(link);
    });
    section.append(documents);
    const evaluation = data.evaluation;
    const evaluationSection = node('section', undefined, 'dossier-section');
    evaluationSection.append(node('h3', 'Evaluation'), node('p', `${evaluation.evaluation_count} response(s) · average rating ${evaluation.average_rating ? Number(evaluation.average_rating).toFixed(1) : 'not rated'}/5`));
    section.append(evaluationSection);
    const existing = pageContent.querySelector('.project-dossier');
    existing?.remove();
    section.classList.add('project-dossier');
    pageContent.prepend(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
