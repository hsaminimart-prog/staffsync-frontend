/* ===================================================
   StaffSync — Frontend Application Logic
   Uses api.js for all backend communication
   =================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── Toast ──────────────────────────────────────────
    let toastTimer;
    function toast(msg, type = 'success') {
        const el = $('#toast');
        el.textContent = msg;
        el.className = 'toast ' + type;
        clearTimeout(toastTimer);
        requestAnimationFrame(() => el.classList.add('show'));
        toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }

    // ─── View Router ────────────────────────────────────
    function showView(id) {
        $$('section').forEach(s => s.classList.remove('active'));
        const target = $('#' + id);
        if (target) target.classList.add('active');
    }

    // ─── Tab Router ─────────────────────────────────────
    function initTabs(section) {
        const links = section.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                section.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                const targetTab = section.querySelector('#tab-' + tab);
                if (targetTab) targetTab.classList.add('active');
                const titleEl = section.querySelector('.dashboard-header h2');
                if (titleEl) titleEl.textContent = link.textContent.trim();

                // Refresh data when switching tabs
                if (tab === 'owner-requests') loadOwnerRequests();
                if (tab === 'owner-staff') loadOwnerStaffList();
                if (tab === 'owner-salary') loadSalaryReport();
                if (tab === 'staff-hours') loadStaffHours();
                if (tab === 'staff-earnings') loadStaffHours();
            });
        });
    }

    // ─── Live Clock ─────────────────────────────────────
    let clockInterval;
    function startLiveClock() {
        clearInterval(clockInterval);
        function tick() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const clockEl = $('#live-clock');
            const dateEl = $('#live-date');
            if (clockEl) clockEl.textContent = timeStr;
            if (dateEl) dateEl.textContent = dateStr;
        }
        tick();
        clockInterval = setInterval(tick, 1000);
    }

    // ─── Format helpers ─────────────────────────────────
    function formatHours(ms) {
        if (!ms || ms < 0) return '0h 0m';
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}h ${m}m`;
    }

    function formatTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    function formatCurrency(val) {
        return '£' + (val || 0).toFixed(2);
    }

    // ─── Loading state helper ──────────────────────────
    function setLoading(btn, loading) {
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = 'Loading…';
            btn.disabled = true;
        } else {
            btn.textContent = btn.dataset.originalText || btn.textContent;
            btn.disabled = false;
        }
    }

    // ═══════════════════════════════════════════════════
    // AUTH: Sign Up
    // ═══════════════════════════════════════════════════
    $('#form-signup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            const name = $('#signup-name').value.trim();
            const email = $('#signup-email').value.trim().toLowerCase();
            const password = $('#signup-password').value;

            const data = await api.signup(name, email, password);
            api.saveUser(data.user);
            toast('Account created! 🎉');
            showView('view-choose-role');
            $('#form-signup').reset();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    });

    // ═══════════════════════════════════════════════════
    // AUTH: Login
    // ═══════════════════════════════════════════════════
    $('#form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            const email = $('#login-email').value.trim().toLowerCase();
            const password = $('#login-password').value;

            const data = await api.login(email, password);
            api.saveUser(data.user);
            if (data.company) api.saveCompany(data.company);

            routeAfterLogin(data);
            $('#form-login').reset();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    });

    function routeAfterLogin(data) {
        const user = data.user;
        if (user.role === 'owner') {
            enterOwnerDashboard(user, data.company);
        } else if (user.role === 'staff') {
            if (data.joinRequest) {
                if (data.joinRequest.status === 'APPROVED') {
                    enterStaffDashboard(user);
                } else if (data.joinRequest.status === 'REJECTED') {
                    showView('view-rejected');
                } else {
                    showView('view-waiting');
                }
            } else if (user.status === 'APPROVED') {
                enterStaffDashboard(user);
            } else if (user.status === 'REJECTED') {
                showView('view-rejected');
            } else {
                showView('view-waiting');
            }
        } else {
            showView('view-choose-role');
        }
    }

    // ─── Navigation ─────────────────────────────────────
    $('#goto-signup').addEventListener('click', (e) => { e.preventDefault(); showView('view-signup'); });
    $('#goto-login').addEventListener('click', (e) => { e.preventDefault(); showView('view-login'); });
    $('#btn-create-company').addEventListener('click', () => showView('view-create-company'));
    $('#btn-join-company').addEventListener('click', () => showView('view-join-company'));
    $('#back-to-role-from-create').addEventListener('click', (e) => { e.preventDefault(); showView('view-choose-role'); });
    $('#back-to-role-from-join').addEventListener('click', (e) => { e.preventDefault(); showView('view-choose-role'); });

    // Logout
    function logout() { api.logout(); showView('view-login'); toast('Signed out'); }
    $('#btn-logout-owner').addEventListener('click', logout);
    $('#btn-logout-staff').addEventListener('click', logout);
    $('#btn-logout-waiting').addEventListener('click', (e) => { e.preventDefault(); logout(); });
    $('#btn-logout-rejected').addEventListener('click', logout);

    // Refresh status
    $('#btn-refresh-status').addEventListener('click', async () => {
        try {
            const data = await api.checkRequestStatus();
            if (data.status === 'APPROVED') {
                toast('You have been approved! 🎉');
                // Re-login to get fresh data
                const user = api.getUser();
                if (user) {
                    const loginData = await api.login(user.email, prompt('Enter your password to continue:'));
                    api.saveUser(loginData.user);
                    if (loginData.company) api.saveCompany(loginData.company);
                    routeAfterLogin(loginData);
                }
            } else if (data.status === 'REJECTED') {
                showView('view-rejected');
            } else {
                toast('Still waiting for approval…');
            }
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    // ═══════════════════════════════════════════════════
    // CREATE COMPANY
    // ═══════════════════════════════════════════════════
    $('#form-create-company').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            const name = $('#company-name').value.trim();
            const hourlyRate = parseFloat($('#company-hourly-rate').value) || 0;

            const data = await api.createCompany(name, hourlyRate);
            api.saveCompany(data.company);

            // Update local user record
            const user = api.getUser();
            user.role = 'owner';
            user.companyId = data.company.id;
            api.saveUser(user);

            toast(`Company created! Code: ${data.company.code}`);
            $('#form-create-company').reset();
            enterOwnerDashboard(user, data.company);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    });

    // ═══════════════════════════════════════════════════
    // JOIN COMPANY
    // ═══════════════════════════════════════════════════
    $('#form-join-company').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            const code = $('#join-code').value.trim();
            const data = await api.joinCompany(code);

            const user = api.getUser();
            user.role = 'staff';
            user.status = 'PENDING';
            api.saveUser(user);

            toast(`Join request sent to ${data.companyName}! ⏳`);
            $('#form-join-company').reset();
            showView('view-waiting');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    });

    // ═══════════════════════════════════════════════════
    // OWNER DASHBOARD
    // ═══════════════════════════════════════════════════
    let currentCompany = null;

    function enterOwnerDashboard(user, company) {
        showView('view-owner-dashboard');
        currentCompany = company || api.getCompany();

        $('#owner-name').textContent = user.name;
        $('#owner-avatar').textContent = user.name.charAt(0).toUpperCase();

        if (currentCompany) {
            $('#display-company-code').textContent = currentCompany.code;
            $('#setting-company-name').value = currentCompany.name;
            $('#setting-hourly-rate').value = currentCompany.hourlyRate;
        }

        initTabs($('#view-owner-dashboard'));
        loadOwnerRequests();
        loadOwnerStaffList();
        loadSalaryReport();

        $('#salary-period').onchange = () => loadSalaryReport();
    }

    async function loadOwnerRequests() {
        const container = $('#requests-container');
        try {
            const data = await api.listRequests();
            if (!data.requests || data.requests.length === 0) {
                container.innerHTML = '<p class="empty-state">No pending requests 🎉</p>';
                return;
            }
            container.innerHTML = data.requests.map(req => `
        <div class="request-item" data-request-id="${req.id}">
          <div class="request-info">
            <h4>${req.user?.name || 'Unknown'}</h4>
            <p>${req.user?.email || ''}</p>
          </div>
          <div class="request-actions">
            <button class="btn btn-approve" onclick="window.approveRequest('${req.id}')">✅ Approve</button>
            <button class="btn btn-reject" onclick="window.rejectRequest('${req.id}')">❌ Reject</button>
          </div>
        </div>`).join('');
        } catch (err) {
            container.innerHTML = `<p class="empty-state">${err.message}</p>`;
        }
    }

    window.approveRequest = async function (reqId) {
        try {
            await api.respondRequest(reqId, 'approve');
            toast('Staff approved ✅');
            loadOwnerRequests();
            loadOwnerStaffList();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    window.rejectRequest = async function (reqId) {
        try {
            await api.respondRequest(reqId, 'reject');
            toast('Staff rejected ❌');
            loadOwnerRequests();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    async function loadOwnerStaffList() {
        const container = $('#staff-list-container');
        try {
            const data = await api.getStaffList();
            if (!data.staff || data.staff.length === 0) {
                container.innerHTML = '<p class="empty-state">No approved staff yet</p>';
                return;
            }
            container.innerHTML = data.staff.map(s => {
                const badge = s.clockedIn
                    ? '<span class="staff-badge online">🟢 Clocked In</span>'
                    : '<span class="staff-badge offline">Offline</span>';
                return `
          <div class="staff-item">
            <div class="staff-details">
              <div class="avatar">${s.name.charAt(0).toUpperCase()}</div>
              <div>
                <div class="user-name">${s.name}</div>
                <div class="user-role">${s.email}</div>
              </div>
            </div>
            ${badge}
          </div>`;
            }).join('');
        } catch (err) {
            container.innerHTML = `<p class="empty-state">${err.message}</p>`;
        }
    }

    async function loadSalaryReport() {
        const container = $('#salary-report-container');
        const period = $('#salary-period').value;
        try {
            const data = await api.getSalaryReport(period);
            if (!data.report || data.report.length === 0) {
                container.innerHTML = '<p class="empty-state">No salary data yet</p>';
                return;
            }
            let html = `
        <div class="salary-row header">
          <div>Staff</div>
          <div>Hours</div>
          <div>Rate</div>
          <div>Earnings</div>
        </div>`;
            data.report.forEach(r => {
                html += `
          <div class="salary-row">
            <div>${r.name}</div>
            <div>${formatHours(r.hoursMs)}</div>
            <div>${formatCurrency(data.hourlyRate)}/hr</div>
            <div class="salary-amount">${formatCurrency(r.earnings)}</div>
          </div>`;
            });
            html += `
        <div class="salary-row" style="border-top: 2px solid var(--border-glass); margin-top: 8px; padding-top: 16px; font-weight: 700;">
          <div>Total</div><div></div><div></div>
          <div class="salary-amount">${formatCurrency(data.totalEarnings)}</div>
        </div>`;
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<p class="empty-state">${err.message}</p>`;
        }
    }

    // Company Settings
    $('#form-company-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const name = $('#setting-company-name').value.trim();
            const hourlyRate = parseFloat($('#setting-hourly-rate').value) || 0;
            await api.updateSettings(name, hourlyRate);
            if (currentCompany) {
                currentCompany.name = name;
                currentCompany.hourlyRate = hourlyRate;
                api.saveCompany(currentCompany);
            }
            toast('Settings saved ✅');
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    // ═══════════════════════════════════════════════════
    // STAFF DASHBOARD
    // ═══════════════════════════════════════════════════
    let elapsedInterval = null;
    let activeClockIn = null;

    async function enterStaffDashboard(user) {
        showView('view-staff-dashboard');

        $('#staff-name').textContent = user.name;
        $('#staff-avatar').textContent = user.name.charAt(0).toUpperCase();

        initTabs($('#view-staff-dashboard'));
        startLiveClock();

        // Load clock status from server
        try {
            const data = await api.clockStatus();
            if (data.company) {
                $('#staff-company-name').textContent = data.company.name;
                $('#staff-hourly-rate').textContent = formatCurrency(data.company.hourlyRate) + '/hr';
                api.saveCompany(data.company);
            }

            if (data.active) {
                activeClockIn = data.active;
                setClockedInState(true);
                startElapsedTimer(new Date(data.active.clockIn));
            } else {
                activeClockIn = null;
                setClockedInState(false);
            }

            renderTodayEntries(data.todayEntries || []);
        } catch (err) {
            toast(err.message, 'error');
        }

        loadStaffHours();
    }

    function setClockedInState(isClockedIn) {
        const btnIn = $('#btn-clock-in');
        const btnOut = $('#btn-clock-out');
        const status = $('#clock-status');

        if (isClockedIn) {
            btnIn.disabled = true;
            btnOut.disabled = false;
            status.textContent = '🟢 Currently clocked in';
            status.style.color = 'var(--green)';
        } else {
            btnIn.disabled = false;
            btnOut.disabled = true;
            status.textContent = 'Not clocked in';
            status.style.color = 'var(--text-muted)';
            $('#clock-elapsed').textContent = '';
        }
    }

    function startElapsedTimer(startTime) {
        clearInterval(elapsedInterval);
        function tick() {
            const diff = Date.now() - startTime.getTime();
            $('#clock-elapsed').textContent = formatHours(diff);
        }
        tick();
        elapsedInterval = setInterval(tick, 1000);
    }

    // Clock In
    $('#btn-clock-in').addEventListener('click', async () => {
        try {
            const data = await api.clockIn();
            activeClockIn = data.entry;
            setClockedInState(true);
            startElapsedTimer(new Date(data.entry.clockIn));
            toast('Clocked in! 🟢');

            // Refresh today's entries
            const statusData = await api.clockStatus();
            renderTodayEntries(statusData.todayEntries || []);
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    // Clock Out
    $('#btn-clock-out').addEventListener('click', async () => {
        try {
            await api.clockOut();
            clearInterval(elapsedInterval);
            activeClockIn = null;
            setClockedInState(false);
            toast('Clocked out! 🔴');

            // Refresh data
            const statusData = await api.clockStatus();
            renderTodayEntries(statusData.todayEntries || []);
            loadStaffHours();
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    function renderTodayEntries(entries) {
        const container = $('#today-entries-list');
        if (!entries || entries.length === 0) {
            container.innerHTML = '<p class="empty-state">No entries today</p>';
            return;
        }
        container.innerHTML = entries.map(e => {
            const dur = e.clockOut ? new Date(e.clockOut) - new Date(e.clockIn) : null;
            return `
        <div class="entry-row">
          <span class="entry-time">${formatTime(e.clockIn)} → ${e.clockOut ? formatTime(e.clockOut) : 'Active'}</span>
          <span class="entry-duration">${dur ? formatHours(dur) : '⏱️ Running…'}</span>
        </div>`;
        }).join('');
    }

    async function loadStaffHours() {
        try {
            const data = await api.getHours();

            $('#stat-today-hours').textContent = formatHours(data.today.ms);
            $('#stat-week-hours').textContent = formatHours(data.week.ms);
            $('#stat-month-hours').textContent = formatHours(data.month.ms);

            $('#stat-today-earnings').textContent = formatCurrency(data.today.earnings);
            $('#stat-week-earnings').textContent = formatCurrency(data.week.earnings);
            $('#stat-month-earnings').textContent = formatCurrency(data.month.earnings);
            $('#staff-hourly-rate').textContent = formatCurrency(data.hourlyRate) + '/hr';

            // History
            const histContainer = $('#hours-history-list');
            if (!data.history || data.history.length === 0) {
                histContainer.innerHTML = '<p class="empty-state">No history yet</p>';
            } else {
                histContainer.innerHTML = data.history.map(e => {
                    const dur = new Date(e.clockOut) - new Date(e.clockIn);
                    const day = new Date(e.clockIn).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    return `
            <div class="entry-row">
              <span class="entry-time">${day} — ${formatTime(e.clockIn)} → ${formatTime(e.clockOut)}</span>
              <span class="entry-duration">${formatHours(dur)}</span>
            </div>`;
                }).join('');
            }
        } catch (err) {
            console.error('Load hours error:', err);
        }
    }

    // ═══════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════
    async function init() {
        if (!api.hasToken()) {
            showView('view-login');
            return;
        }

        // Try to get clock status to verify session is still valid
        try {
            const data = await api.clockStatus();
            const user = data.user;
            api.saveUser(user);
            if (data.company) api.saveCompany(data.company);

            if (user.role === 'owner') {
                enterOwnerDashboard(user, data.company);
            } else if (user.role === 'staff' && user.status === 'APPROVED') {
                enterStaffDashboard(user);
            } else if (user.status === 'REJECTED') {
                showView('view-rejected');
            } else if (user.status === 'PENDING') {
                showView('view-waiting');
            } else {
                showView('view-choose-role');
            }
        } catch {
            // Token expired or invalid
            api.logout();
            showView('view-login');
        }
    }

    init();

})();
