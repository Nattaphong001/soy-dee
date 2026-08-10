/* ==============================================================================
   API CLIENT — fetch wrapper + session (JWT) storage ใช้ร่วมกันทุกหน้า
   ------------------------------------------------------------------------------
   โหลดไฟล์นี้ก่อน script อื่นๆ ที่เรียก API (ใน <head> เพื่อให้ guard ทำงาน
   ก่อน paint). ทุกฟังก์ชันสาธารณะอยู่ใต้ window.SoyDeeAPI
   ============================================================================== */
(function (global) {
    'use strict';

    var API_BASE_URL = 'http://localhost:8080/api/v1';
    var API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    /** ต่อ path ที่ backend คืนมา (เช่น "/uploads/avatars/12.jpg") ให้เป็น URL เต็มไปยัง API server */
    function assetUrl(path) {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return API_ORIGIN + (path.charAt(0) === '/' ? path : '/' + path);
    }

    var KEYS = {
        token: 'soydee_token',
        refreshToken: 'soydee_refresh_token',
        expiresAt: 'soydee_expires_at',
        role: 'soydee_role',
        user: 'soydee_user'
    };

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }
    function storageRemove(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }

    function getToken() { return storageGet(KEYS.token); }
    function getRefreshToken() { return storageGet(KEYS.refreshToken); }
    function getRole() { return storageGet(KEYS.role); }
    function isAdmin() { return getRole() === 'admin'; }
    function isLoggedIn() { return !!getToken(); }

    function getUser() {
        var raw = storageGet(KEYS.user);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }
    function getUserId() {
        var u = getUser();
        return u ? u.id : null;
    }

    function setSession(role, tokenPayload, userObj) {
        storageSet(KEYS.token, tokenPayload.token);
        storageSet(KEYS.refreshToken, tokenPayload.refresh_token || '');
        var expiresAt = Date.now() + (Number(tokenPayload.expires_in) || 3600) * 1000;
        storageSet(KEYS.expiresAt, String(expiresAt));
        storageSet(KEYS.role, role);
        storageSet(KEYS.user, JSON.stringify(userObj));
    }

    function updateAccessToken(tokenPayload) {
        storageSet(KEYS.token, tokenPayload.token);
        var expiresAt = Date.now() + (Number(tokenPayload.expires_in) || 3600) * 1000;
        storageSet(KEYS.expiresAt, String(expiresAt));
    }

    function updateStoredUser(patch) {
        var u = getUser() || {};
        Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });
        storageSet(KEYS.user, JSON.stringify(u));
    }

    function clearSession() {
        Object.keys(KEYS).forEach(function (k) { storageRemove(KEYS[k]); });
    }

    // ---------------------------------------------------------------- errors
    function ApiError(status, code, message) {
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.message = message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
    ApiError.prototype = Object.create(Error.prototype);
    ApiError.prototype.constructor = ApiError;

    // ---------------------------------------------------------------- refresh
    var refreshPromise = null;

    function doRefresh() {
        var token = getRefreshToken();
        if (!token) return Promise.reject(new ApiError(401, 'TOKEN_INVALID', 'session expired'));

        if (!refreshPromise) {
            refreshPromise = fetch(API_BASE_URL + '/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: token })
            })
                .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
                .then(function (r) {
                    if (!r.res.ok || !r.body.success) {
                        throw new ApiError(r.res.status, (r.body.error && r.body.error.code) || 'TOKEN_INVALID', (r.body.error && r.body.error.message));
                    }
                    updateAccessToken(r.body.data);
                    return r.body.data;
                })
                .finally(function () { refreshPromise = null; });
        }
        return refreshPromise;
    }

    // ---------------------------------------------------------------- fetch
    /**
     * @param {string} path       เช่น '/members/12/profile' (ต่อท้าย API_BASE_URL ให้เอง)
     * @param {object} [options]
     *   method, body (object -> JSON โดยอัตโนมัติ), auth (default true),
     *   isForm (true = ส่ง FormData ตรงๆ ไม่ตั้ง Content-Type เอง), query (object)
     */
    function request(path, options) {
        options = options || {};
        var method = options.method || 'GET';
        var auth = options.auth !== false;

        var url = API_BASE_URL + path;
        if (options.query) {
            var qs = Object.keys(options.query)
                .filter(function (k) { return options.query[k] !== undefined && options.query[k] !== null && options.query[k] !== ''; })
                .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(options.query[k]); })
                .join('&');
            if (qs) url += '?' + qs;
        }

        var headers = { 'Accept': 'application/json' };
        var body;
        if (options.isForm) {
            body = options.body; // FormData — ปล่อยให้ browser ตั้ง Content-Type + boundary เอง
        } else if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.body);
        }

        function run(retried) {
            var reqHeaders = Object.assign({}, headers);
            if (auth) {
                var token = getToken();
                if (token) reqHeaders['Authorization'] = 'Bearer ' + token;
            }

            return fetch(url, { method: method, headers: reqHeaders, body: body })
                .catch(function () {
                    throw new ApiError(0, 'NETWORK_ERROR', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่า API เปิดอยู่หรือไม่');
                })
                .then(function (res) {
                    if (res.status === 204) return { success: true, data: null };
                    return res.json().catch(function () {
                        throw new ApiError(res.status, 'INTERNAL_ERROR', 'ได้รับข้อมูลที่ไม่ถูกต้องจากเซิร์ฟเวอร์');
                    }).then(function (payload) { return { res: res, payload: payload }; });
                })
                .then(function (result) {
                    if (result.success) return result; // 204 short-circuit
                    var res = result.res, payload = result.payload;

                    if (res.ok && payload.success) return payload.data;

                    var code = payload.error && payload.error.code;
                    var message = payload.error && payload.error.message;

                    // TOKEN_EXPIRED ระหว่าง request ที่ auth: true -> ลอง refresh แล้ว retry ครั้งเดียว
                    if (res.status === 401 && code === 'TOKEN_EXPIRED' && auth && !retried) {
                        return doRefresh().then(function () { return run(true); }).catch(function () {
                            clearSession();
                            redirectToLogin();
                            throw new ApiError(401, 'TOKEN_EXPIRED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                        });
                    }

                    if (res.status === 401 && auth) {
                        clearSession();
                        redirectToLogin();
                    }

                    throw new ApiError(res.status, code || 'INTERNAL_ERROR', message);
                });
        }

        return run(false);
    }

    // ---------------------------------------------------------------- guards
    // path ไปหน้า login ขึ้นกับตำแหน่งไฟล์ที่เรียก guard (ดูคอมเมนต์ที่ใช้งานจริงแต่ละหน้า)
    function loginPathFromHere() {
        var path = global.location.pathname;
        if (path.indexOf('/views/admin/') !== -1) return '../auth/login.html';
        if (path.indexOf('/views/user/') !== -1) return '../auth/login.html';
        return 'login.html';
    }

    function redirectToLogin() {
        global.location.href = loginPathFromHere();
    }

    /** เรียกทันทีตอนต้นหน้า (ก่อน DOMContentLoaded) ในหน้าที่ต้อง login (member หรือ admin ก็ได้) */
    function guardAuthenticated() {
        if (!isLoggedIn()) { redirectToLogin(); return false; }
        return true;
    }

    /** เรียกในหน้าเฉพาะสมาชิก — เด้งออกถ้าไม่ได้ล็อกอิน หรือถ้าล็อกอินเป็น admin (ไม่ใช่ผู้ใช้ทั่วไป) */
    function guardMember() {
        if (!guardAuthenticated()) return false;
        if (isAdmin()) { global.location.href = '../admin/admin.html'; return false; }
        return true;
    }

    /** เรียกในหน้าเฉพาะแอดมิน */
    function guardAdmin() {
        if (!guardAuthenticated()) return false;
        if (!isAdmin()) { global.location.href = '../user/index.html'; return false; }
        return true;
    }

    /** หน้า welcome/login (อยู่ใน views/auth/) เรียกใช้: ถ้ามี session อยู่แล้วให้เด้งเข้าแอปตาม role ทันที ไม่ต้อง login ซ้ำ */
    function redirectIfLoggedIn() {
        if (!isLoggedIn()) return false;
        global.location.href = isAdmin() ? '../admin/admin.html' : '../user/index.html';
        return true;
    }

    async function logout() {
        try { await request('/auth/logout', { method: 'POST' }); } catch (e) { /* เพิกถอน token ฝั่ง client ต่อได้แม้ request ล้มเหลว */ }
        clearSession();
        global.location.href = loginPathFromHere();
    }

    // ตัวเลือกระดับกิจกรรมในฟอร์ม (low/mid/high) แปลงเป็นค่าตัวคูณ PAL มาตรฐาน
    // ใช้ทั้งหน้า register และหน้า profile (แท็บข้อมูลร่างกาย) ให้ตรงกัน
    var ACTIVITY_LEVEL_MAP = { low: 1.2, mid: 1.55, high: 1.9 };
    function activityLevelToOption(level) {
        if (level == null) return 'mid';
        var closest = 'mid', closestDiff = Infinity;
        Object.keys(ACTIVITY_LEVEL_MAP).forEach(function (key) {
            var diff = Math.abs(ACTIVITY_LEVEL_MAP[key] - level);
            if (diff < closestDiff) { closestDiff = diff; closest = key; }
        });
        return closest;
    }

    global.SoyDeeAPI = {
        BASE_URL: API_BASE_URL,
        assetUrl: assetUrl,
        request: request,
        ACTIVITY_LEVEL_MAP: ACTIVITY_LEVEL_MAP,
        activityLevelToOption: activityLevelToOption,
        ApiError: ApiError,
        session: {
            setSession: setSession,
            clearSession: clearSession,
            updateStoredUser: updateStoredUser,
            isLoggedIn: isLoggedIn,
            isAdmin: isAdmin,
            getUser: getUser,
            getUserId: getUserId,
            getRole: getRole
        },
        guardMember: guardMember,
        guardAdmin: guardAdmin,
        guardAuthenticated: guardAuthenticated,
        redirectIfLoggedIn: redirectIfLoggedIn,
        logout: logout
    };
})(window);
