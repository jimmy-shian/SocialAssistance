import { response } from 'wix-http-functions';
import wixData from 'wix-data';
import { contacts, triggeredEmails } from 'wix-crm-backend';
import { getSecret } from 'wix-secrets-backend';
import { fetch as wixFetch } from 'wix-fetch';
import {
    findUserByUsername,
    createUser,
    hashPassword,
    checkPassword,
    saveResetCode,
    verifyResetCode,
    loadDataset,
    saveDataset,
    saveImage,
    DATASETS_COLL
} from 'backend/wix-data-helpers';

// SECRET KEY for JWT-like token signature
const TOKEN_SECRET = 'secretKEY2026'; // ★ IMPORTANT: Change this to a random string!
const EMAIL_TEMPLATE_ID = 'V73N0RS'; // ★ IMPORTANT: ID of Triggered Email template
const ADMIN_REGISTER_CODE = 'amin'; // ★ IMPORTANT: Code to register as Admin (per user)
const TEACHER_REGISTER_CODE = 'teacher'; // ★ IMPORTANT: Code to register as Teacher (per user)

// GitHub publishing settings (per user)
const GH_OWNER = 'jimmy-shian';
const GH_REPO = 'SocialAssistanceData';
const GH_BRANCH = 'main';
const GH_BASE = 'img'; // Datasets JSON folder in repo

// Token helpers without Node Buffer: URL-encode JSON parts, simple signature, and exp check
function signToken(payload) {
    const header = { alg: "HS256", typ: "JWT" };
    const h = encodeURIComponent(JSON.stringify(header));
    const p = encodeURIComponent(JSON.stringify(payload));
    const signature = simpleHash(h + "." + p + TOKEN_SECRET);
    return h + "." + p + "." + signature;
}

// 10.7 Serve uploaded image by ID (HTML wrapper with embedded data URL)
export async function get_image(request) {
    try {
        const url = new URL(request.url);
        // path like /_functions/image/<id>/<filename>
        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('image');
        const id = (idx >= 0 && parts[idx + 1]) ? parts[idx + 1] : '';
        if (!id) {
            return response({ status: 400, headers: { 'Content-Type': 'text/plain' }, body: 'Missing image id' });
        }
        const it = await wixData.query('UploadedImages').eq('imageId', id).limit(1).find({ suppressAuth: true });
        if (!it || !it.items || it.items.length === 0) {
            return response({ status: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Not found' });
        }
        const img = it.items[0];
        const mime = img.mimetype || 'image/png';
        const b64 = img.base64 || '';
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${(img.filename || 'image')}</title></head><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="data:${mime};base64,${b64}" alt="image" style="max-width:100%;max-height:100vh;display:block;"></body></html>`;
        return response({ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=31536000' }, body: html });
    } catch (e) {
        return response({ status: 500, headers: { 'Content-Type': 'text/plain' }, body: 'Server error' });
    }
}

// 10.5 Versions (Public GET)
async function collectVersions() {
    try {
        const res = await wixData.query(DATASETS_COLL).limit(1000).find({ suppressAuth: true });
        const map = {};
        for (const it of res.items) {
            map[it.key] = it.version || 0;
        }
        // Ensure common keys exist
        if (map['aboutContent'] === undefined) map['aboutContent'] = 0;
        if (map['providers'] === undefined) map['providers'] = 0;
        if (map['siteContent'] === undefined) map['siteContent'] = 0;
        if (map['blogContent'] === undefined) map['blogContent'] = 0;
        return map;
    } catch (e) { return { aboutContent: 0, providers: 0, siteContent: 0, blogContent: 0 }; }
}

export async function get_version(request) {
    const versions = await collectVersions();
    return jsonResponse({ versions });
}

// ---------- GitHub helpers ----------
function utf8ToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        let codePoint = str.charCodeAt(i);
        if (codePoint < 0x80) bytes.push(codePoint);
        else if (codePoint < 0x800) { bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)); }
        else if (codePoint < 0xd800 || codePoint >= 0xe000) {
            bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
        } else {
            // surrogate pair
            i++;
            const next = str.charCodeAt(i);
            const cp = 0x10000 + (((codePoint & 0x3ff) << 10) | (next & 0x3ff));
            bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        }
    }
    return bytes;
}
function base64FromBytes(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i] || 0;
        const b2 = bytes[i + 1] || 0;
        const b3 = bytes[i + 2] || 0;
        const triplet = (b1 << 16) | (b2 << 8) | b3;
        output += chars[(triplet >> 18) & 0x3f] + chars[(triplet >> 12) & 0x3f] +
                  chars[(triplet >> 6) & 0x3f] + chars[triplet & 0x3f];
    }
    const mod = bytes.length % 3;
    if (mod === 1) output = output.slice(0, -2) + '==';
    else if (mod === 2) output = output.slice(0, -1) + '=';
    return output;
}
function toBase64String(str) { return base64FromBytes(utf8ToBytes(str)); }

async function githubGetFileSha(path, token) {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(path.replace(/^\/+/, ''))}?ref=${encodeURIComponent(GH_BRANCH)}`;
    const resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'SocialAssistanceBot' } });
    if (resp.status === 404) return null;
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.sha ? data.sha : null;
}
async function githubUpsertJson(path, obj) {
    const token = await getSecret('GITHUB_TOKEN');
    if (!token) return { ok: false, message: 'Missing GITHUB_TOKEN secret' };
    const content = JSON.stringify(obj || {}, null, 2);
    const b64 = toBase64String(content);
    const sha = await githubGetFileSha(path, token);
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(path.replace(/^\/+/, ''))}`;
    const body = { message: `Update ${path} ${new Date().toISOString()}`, content: b64, branch: GH_BRANCH };
    if (sha) body.sha = sha;
    const resp = await wixFetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'SocialAssistanceBot', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) {
        let msg = 'GitHub commit failed';
        try { const er = await resp.json(); msg = (er && (er.message || msg)); } catch (e) {}
        return { ok: false, message: msg };
    }
    const data = await resp.json();
    return { ok: true, content: data && data.content };
}
async function buildImagesIndex(origin) {
    try {
        const res = await wixData.query('UploadedImages').limit(1000).find({ suppressAuth: true });
        const arr = (res && res.items) ? res.items : [];
        return arr.map(it => ({
            id: it.imageId,
            filename: it.filename,
            mimetype: it.mimetype,
            url: String(origin || '').replace(/\/$/, '') + '/_functions/image/' + encodeURIComponent(it.imageId) + '/' + encodeURIComponent(it.filename || 'image'),
            createdAt: it.createdAt || it._createdDate || new Date().toISOString()
        }));
    } catch (e) { return []; }
}
async function publishDatasets(keys) {
    const results = [];
    for (const key of keys) {
        try {
            const d = await loadDataset(key);
            const path = `${GH_BASE}/${encodeURIComponent(String(key))}.json`;
            const r = await githubUpsertJson(path, d && d.data ? d.data : {});
            results.push({ key, ok: !!(r && r.ok), message: r && r.message });
        } catch (e) { results.push({ key, ok: false, message: e.message }); }
    }
    return results;
}
async function publishImages(origin) {
    const index = await buildImagesIndex(origin);
    const r = await githubUpsertJson('images/images.json', index);
    return { ok: !!(r && r.ok), count: index.length, message: r && r.message };
}

// 10.6 Publish (commit to GitHub)
export async function post_publish(request) {
    const body = await getJsonBody(request);
    const { token, keys } = body || {};
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);
    const list = Array.isArray(keys) && keys.length ? keys : ['aboutContent', 'providers', 'siteContent', 'blogContent'];
    const origin = (() => { try { const u = new URL(request.url); return u.origin; } catch { return ''; } })();
    const results = await publishDatasets(list);
    const imgRes = await publishImages(origin);
    const publishOk = results.every(r => r.ok) && imgRes.ok;
    return jsonResponse({ ok: true, results, images: imgRes, publishOk });
}
function verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [hEnc, pEnc, s] = parts;
    const calcSig = simpleHash(hEnc + "." + pEnc + TOKEN_SECRET);
    if (s !== calcSig) return null;
    try {
        const payload = JSON.parse(decodeURIComponent(pEnc));
        if (payload && payload.exp && Date.now() > Number(payload.exp)) return null; // expired
        return payload;
    } catch (e) { return null; }
}
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
function jsonResponse(body, status = 200) {
    return response({
        status: status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
        },
        body: JSON.stringify(body)
    });
}

function optionsResponse() {
    return response({
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Max-Age": "86400"
        }
    });
}
function getJsonBody(request) {
    return request.body.text().then(text => {
        try { return JSON.parse(text); } catch (e) { return {}; }
    });
}
// Rate limit helper
const _rateLimitCache = {};
function checkRateLimit(ip, limit = 50, windowMs = 60000) {
    const now = Date.now();
    if (!_rateLimitCache[ip]) _rateLimitCache[ip] = [];
    _rateLimitCache[ip] = _rateLimitCache[ip].filter(t => now - t < windowMs);
    if (_rateLimitCache[ip].length >= limit) return false;
    _rateLimitCache[ip].push(now);
    return true;
}

// CORS OPTIONS handlers
export function options_memberLogin(request) { return optionsResponse(); }
export function options_memberRegister(request) { return optionsResponse(); }
export function options_memberForgot(request) { return optionsResponse(); }
export function options_memberChangePassword(request) { return optionsResponse(); }
export function options_profileRead(request) { return optionsResponse(); }
export function options_profileUpdate(request) { return optionsResponse(); }
export function options_membersList(request) { return optionsResponse(); }
export function options_uploadImage(request) { return optionsResponse(); }
export function options_read(request) { return optionsResponse(); }
export function options_update(request) { return optionsResponse(); }
export function options_login(request) { return optionsResponse(); }
export function options_publish(request) { return optionsResponse(); }
export function options_savePublish(request) { return optionsResponse(); }
export function options_version(request) { return optionsResponse(); }
export function options_questionnaireCreate(request) { return optionsResponse(); }
export function options_questionnaireList(request) { return optionsResponse(); }
export function options_questionnaireResponseSubmit(request) { return optionsResponse(); }
export function options_questionnaireResponseList(request) { return optionsResponse(); }

// 0. Admin Login (for DataAPI)
export async function post_login(request) {
    const body = await getJsonBody(request);
    const { username, password } = body || {};
    if (!username || !password) return jsonResponse({ ok: false, message: '請輸入帳號密碼' }, 400);

    try {
        const user = await findUserByUsername(username);
        if (!user) return jsonResponse({ ok: false, message: '帳號或密碼錯誤' }, 400);
        if (!checkPassword(password, user.passHash)) return jsonResponse({ ok: false, message: '帳號或密碼錯誤' }, 400);
        if ((user.role || 'member') !== 'admin') return jsonResponse({ ok: false, message: '需要管理員權限' }, 403);

        const token = signToken({ username: user.username, role: 'admin', exp: Date.now() + 2 * 60 * 60 * 1000 });
        return jsonResponse({ ok: true, token, role: 'admin' });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 1. User Login
export async function post_memberLogin(request) {
    const ip = (request && request.headers && (request.headers['x-forwarded-for'] || request.headers['X-Forwarded-For'])) || request.ip || 'anon';
    if (!checkRateLimit(ip, 20)) return jsonResponse({ ok: false, message: '請求過於頻繁' }, 429);

    const body = await getJsonBody(request);
    const { username, password } = body;
    if (!username || !password) return jsonResponse({ ok: false, message: '請輸入帳號密碼' }, 400);

    try {
        const user = await findUserByUsername(username);
        if (!user) return jsonResponse({ ok: false, message: '帳號或密碼錯誤' }, 400);

        const match = checkPassword(password, user.passHash);
        if (!match) return jsonResponse({ ok: false, message: '帳號或密碼錯誤' }, 400);

        const tokenPayload = {
            username: user.username,
            role: user.role || 'student',
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24hr exp
        };
        const token = signToken(tokenPayload);
        return jsonResponse({ ok: true, token, role: tokenPayload.role });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 2. User Register
export async function post_memberRegister(request) {
    const body = await getJsonBody(request);
    const { username, email, password, isAdmin, adminCode, isTeacher, teacherCode } = body;

    if (!username || !email || !password) return jsonResponse({ ok: false, message: '資料不完整' }, 400);
    if (username.length < 3) return jsonResponse({ ok: false, message: '帳號太短' }, 400);

    // roles: admin / teacher / student (default)
    let role = 'student';
    if (isAdmin && adminCode === ADMIN_REGISTER_CODE) {
        role = 'admin';
    } else if (isTeacher && teacherCode === TEACHER_REGISTER_CODE) {
        role = 'teacher';
    }

    try {
        const existing = await findUserByUsername(username);
        if (existing) return jsonResponse({ ok: false, message: '此帳號已被註冊' }, 400);

        const passHash = hashPassword(password);
        const newUser = await createUser({ username, email, passHash, role });

        const token = signToken({ username: newUser.username, role: newUser.role, exp: Date.now() + 86400000 });
        return jsonResponse({ ok: true, token, role: newUser.role });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 3. Forgot Password
export async function post_memberForgot(request) {
    console.log('[API] post_memberForgot called');
    const body = await getJsonBody(request);
    const { username, email } = body;
    console.log('[API] Forgot requested for:', username || email);

    try {
        const user = await findUserByUsername(username || email);
        if (user) {
            console.log('[API] User found:', user.username);
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await saveResetCode(user.username, code);

            try {
                // Create contact and send triggered email using named modules
                const createRes = await contacts.createContact({
                    info: { emails: [{ email: user.email }] }
                });
                const contactId = (createRes && createRes.contact && createRes.contact.id) || createRes._id || createRes.id || createRes;

                await triggeredEmails.emailContact(EMAIL_TEMPLATE_ID, contactId, {
                    variables: { code, resetCode: code, username: user.username }
                });
                console.log('[API] Email sent successfully');
            } catch (err) {
                console.error(`[API] triggered email failed:`, err.message);
            }
            console.log(`[Forgot] Code for ${user.username}: ${code}`);
        } else {
            console.log('[API] User not found');
        }
        return jsonResponse({ ok: true, message: '若帳號存在，我們已發送重設代碼至您的信箱。' });
    } catch (e) {
        console.error('[API] Forgot Error:', e.message);
        return jsonResponse({ ok: false, message: '處理失敗' }, 500);
    }
}

// 4. Change Password
export async function post_memberChangePassword(request) {
    const body = await getJsonBody(request);
    const { token, current, new: newPass } = body;
    const userPayload = verifyToken(token);
    if (!userPayload) return jsonResponse({ ok: false, message: '無效的憑證' }, 401);

    try {
        const user = await findUserByUsername(userPayload.username);
        if (!user) return jsonResponse({ ok: false, message: '用戶不存在' }, 404);

        if (!checkPassword(current, user.passHash)) {
            return jsonResponse({ ok: false, message: '舊密碼錯誤' }, 400);
        }

        user.passHash = hashPassword(newPass);
        await wixData.update('SocialUsers', user, { suppressAuth: true });
        return jsonResponse({ ok: true });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 5. Read Profile
export async function post_profileRead(request) {
    const body = await getJsonBody(request);
    const { token, username } = body;

    // Auth check
    const requester = verifyToken(token);
    if (!requester) return jsonResponse({ ok: false, message: '未登入' }, 401);

    // Access control: only self or admin can read
    if (requester.username !== username && requester.role !== 'admin') {
        return jsonResponse({ ok: false, message: '無權限' }, 403);
    }

    try {
        const result = await wixData.query('Profiles').eq('username', username).find({ suppressAuth: true });
        if (result.items.length > 0) {
            const p = result.items[0];
            const profileData = JSON.parse(p.json || '{}');
            return jsonResponse({ ok: true, profile: profileData, updatedAt: p.updatedAt });
        } else {
            // Return a default empty profile instead of null to prevent frontend crash
            const defaultP = {
                username,
                basic: { name: '', email: '', phone: '', birthday: '', address: '' },
                selfEvaluation: { interests: '', strengths: '', goals: '', teacherComments: '' },
                activities: [],
                learningRecords: []
            };
            return jsonResponse({ ok: true, profile: defaultP });
        }
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 6. Update Profile
export async function post_profileUpdate(request) {
    const body = await getJsonBody(request);
    const { token, username, profile } = body;

    const requester = verifyToken(token);
    if (!requester) return jsonResponse({ ok: false, message: '未登入' }, 401);

    if (requester.username !== username && requester.role !== 'admin') {
        return jsonResponse({ ok: false, message: '無權限' }, 403);
    }

    try {
        // If not admin, prevent overwriting teacher comments
        if (requester.role !== 'admin') {
            // Fetch existing to preserve teacherComments
            const existingRes = await wixData.query('Profiles').eq('username', username).find({ suppressAuth: true });
            if (existingRes.items.length > 0) {
                const existingP = JSON.parse(existingRes.items[0].json || '{}');
                const existingComments = (existingP.selfEvaluation && existingP.selfEvaluation.teacherComments) || '';

                // Restore comments to the incoming profile
                if (!profile.selfEvaluation) profile.selfEvaluation = {};
                profile.selfEvaluation.teacherComments = existingComments;
            }
        }
        // If admin, they can edit everything (including teacherComments)

        const result = await wixData.query('Profiles').eq('username', username).find({ suppressAuth: true });
        let item;
        if (result.items.length > 0) {
            item = result.items[0];
            item.json = JSON.stringify(profile);
            item.updatedAt = new Date();
            await wixData.update('Profiles', item, { suppressAuth: true });
        } else {
            item = {
                username,
                json: JSON.stringify(profile),
                updatedAt: new Date()
            };
            await wixData.insert('Profiles', item, { suppressAuth: true });
        }
        return jsonResponse({ ok: true });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 7. List Members (Admin Only)
export async function post_membersList(request) {
    const body = await getJsonBody(request);
    const { token } = body;
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);

    try {
        const res = await wixData.query('SocialUsers').limit(1000).find({ suppressAuth: true });
        const users = res.items.map(u => ({
            username: u.username,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt
        }));
        return jsonResponse({ ok: true, users });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 8. Upload Image (Generic, returns mock app:// URL or stores base64)
export async function post_uploadImage(request) {
    const body = await getJsonBody(request);
    const { token, dataUrl, filename } = body;
    const requester = verifyToken(token);
    if (!requester) return jsonResponse({ ok: false, message: '未登入' }, 401);

    try {
        // Parse data URL
        const id = Math.random().toString(36).slice(2);
        let mime = 'image/png';
        let b64 = '';
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (m) { mime = m[1] || mime; b64 = m[2] || ''; }
        } else if (typeof dataUrl === 'string') {
            // Assume pure base64 string
            b64 = dataUrl;
        }
        if (!b64) return jsonResponse({ ok: false, message: '無效的影像資料' }, 400);

        // Basic size guard (~800KB)
        if (b64.length > 800 * 1024) {
            return jsonResponse({ ok: false, message: '圖片過大，請壓縮後再上傳' }, 400);
        }

        await saveImage({
            id: id,
            filename: filename || 'upload.png',
            mimetype: mime,
            base64: b64,
            owner: requester.username
        });

        return jsonResponse({ ok: true, id, filename });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 9. Read/Update General Data (About, Providers, Site) - Admin Only
export async function post_read(request) {
    const body = await getJsonBody(request);
    const { key } = body; // e.g. 'aboutContent'
    try {
        const d = await loadDataset(key); // helper
        return jsonResponse({ ok: true, key: d.key, version: d.version, data: d.data, updatedAt: d.updatedAt });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

export async function post_update(request) {
    const body = await getJsonBody(request);
    const { token, key, data } = body;
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);

    try {
        const ver = await saveDataset(key, data);
        return jsonResponse({ ok: true, version: ver });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

// 9.5 Save + Publish (commit to GitHub)
export async function post_savePublish(request) {
    const body = await getJsonBody(request);
    const { token, key, data, keys } = body || {};
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);

    if (!key) return jsonResponse({ ok: false, message: '缺少 key' }, 400);
    try {
        const upd = await saveDataset(key, data);
        const list = Array.isArray(keys) && keys.length ? keys : [key];
        const origin = (() => { try { const u = new URL(request.url); return u.origin; } catch { return ''; } })();
        const results = await publishDatasets(list);
        const imgRes = await publishImages(origin);
        const publishOk = results.every(r => r.ok) && imgRes.ok;
        return jsonResponse({ ok: true, update: upd, results, images: imgRes, publishOk });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 10. Data (Public read)
export async function get_data(request) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) return jsonResponse({ error: 'Missing key' }, 400);

    try {
        const d = await loadDataset(key);
        // Supports ?v=... check for notModified? (simplified)
        return jsonResponse({ ok: true, data: d.data, version: d.version });
    } catch (e) { return jsonResponse({ error: e.message }, 500); }
}

// --- Questionnaire Endpoints ---

// 11. Create Questionnaire (Admin)
export async function post_questionnaireCreate(request) {
    const body = await getJsonBody(request);
    const { token, title, items, status } = body;
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);

    try {
        const item = {
            title,
            items: typeof items === 'string' ? items : JSON.stringify(items),
            status: status || 'active',
            createdAt: new Date()
        };
        await wixData.insert('Questionnaires', item, { suppressAuth: true });
        return jsonResponse({ ok: true });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

// 12. List Questionnaires (Public/Member)
export async function post_questionnaireList(request) {
    try {
        // Active questionnaires
        const res = await wixData.query('Questionnaires').eq('status', 'active').find({ suppressAuth: true });
        return jsonResponse({ ok: true, list: res.items });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

// 13. Submit Response (Member)
export async function post_questionnaireResponseSubmit(request) {
    const body = await getJsonBody(request);
    const { token, questionnaireId, answers } = body;
    const requester = verifyToken(token);
    if (!requester) return jsonResponse({ ok: false, message: '未登入' }, 401);

    try {
        // Check if already submitted? (Optional)
        const item = {
            questionnaireId,
            username: requester.username,
            answers: typeof answers === 'string' ? answers : JSON.stringify(answers),
            submittedAt: new Date()
        };
        await wixData.insert('QuestionnaireResponses', item, { suppressAuth: true });
        return jsonResponse({ ok: true });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

// 14. List Responses (Admin)
export async function post_questionnaireResponseList(request) {
    const body = await getJsonBody(request);
    const { token, questionnaireId } = body;
    const requester = verifyToken(token);
    if (!requester || requester.role !== 'admin') return jsonResponse({ ok: false, message: '無權限' }, 403);

    try {
        let q = wixData.query('QuestionnaireResponses');
        if (questionnaireId) q = q.eq('questionnaireId', questionnaireId);
        const res = await q.find({ suppressAuth: true });
        return jsonResponse({ ok: true, responses: res.items });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}
