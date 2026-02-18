/* ===================================================
   StaffSync — API Client
   =================================================== */

// ⚠️ CHANGE THIS to your Vercel deployment URL after deploying
const API_BASE = 'https://staffclock-ten.vercel.app';

const api = {
    _token: localStorage.getItem('ss_token'),

    _headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this._token) h['Authorization'] = 'Bearer ' + this._token;
        return h;
    },

    _setToken(token) {
        this._token = token;
        if (token) localStorage.setItem('ss_token', token);
        else localStorage.removeItem('ss_token');
    },

    async _post(path, body) {
        const res = await fetch(API_BASE + path, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    async _get(path) {
        const res = await fetch(API_BASE + path, {
            headers: this._headers()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    async _put(path, body) {
        const res = await fetch(API_BASE + path, {
            method: 'PUT',
            headers: this._headers(),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    // ─── Auth ─────────────────────────────────
    async signup(name, email, password) {
        const data = await this._post('/api/auth/signup', { name, email, password });
        this._setToken(data.token);
        return data;
    },

    async login(email, password) {
        const data = await this._post('/api/auth/login', { email, password });
        this._setToken(data.token);
        return data;
    },

    logout() {
        this._setToken(null);
        localStorage.removeItem('ss_user');
        localStorage.removeItem('ss_company');
    },

    // ─── Company ──────────────────────────────
    async createCompany(name, hourlyRate) {
        return await this._post('/api/companies/create', { name, hourlyRate });
    },

    async updateSettings(name, hourlyRate) {
        return await this._put('/api/companies/settings', { name, hourlyRate });
    },

    // ─── Join Requests ────────────────────────
    async joinCompany(code) {
        return await this._post('/api/requests/join', { code });
    },

    async listRequests() {
        return await this._get('/api/requests/list');
    },

    async respondRequest(requestId, action) {
        return await this._post('/api/requests/respond', { requestId, action });
    },

    async checkRequestStatus() {
        return await this._get('/api/requests/status');
    },

    // ─── Clock ────────────────────────────────
    async clockIn() {
        return await this._post('/api/clock/in', {});
    },

    async clockOut() {
        return await this._post('/api/clock/out', {});
    },

    async clockStatus() {
        return await this._get('/api/clock/status');
    },

    // ─── Staff / Hours ────────────────────────
    async getHours() {
        return await this._get('/api/staff/hours');
    },

    async getStaffList() {
        return await this._get('/api/staff/list');
    },

    // ─── Salary ───────────────────────────────
    async getSalaryReport(period) {
        return await this._get('/api/salary/report?period=' + (period || 'weekly'));
    },

    // ─── Session helpers ──────────────────────
    hasToken() {
        return !!this._token;
    },

    saveUser(userData) {
        localStorage.setItem('ss_user', JSON.stringify(userData));
    },

    getUser() {
        try { return JSON.parse(localStorage.getItem('ss_user')); } catch { return null; }
    },

    saveCompany(companyData) {
        localStorage.setItem('ss_company', JSON.stringify(companyData));
    },

    getCompany() {
        try { return JSON.parse(localStorage.getItem('ss_company')); } catch { return null; }
    }
};
