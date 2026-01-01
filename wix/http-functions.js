import { ok, badRequest, created, serverError, forbidden, notFound } from 'wix-http-functions';
import wixData from 'wix-data';
import wixCrmBackend from 'wix-crm-backend';
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
const ADMIN_REGISTER_CODE = 'secretKEY2026'; // ★ IMPORTANT: Code to register as Admin

// ... (Helper functions from previous step: signToken, verifyToken, jsonResponse, etc.) ...
function signToken(payload) {
    const header = { alg: "HS256", typ: "JWT" };
    const strHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, "");
    const strPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, "");
    const signature = simpleHash(strHeader + "." + strPayload + TOKEN_SECRET);
    return strHeader + "." + strPayload + "." + signature;
}
function verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const calcSig = simpleHash(h + "." + p + TOKEN_SECRET);
    if (s !== calcSig) return null;
    try {
        const json = Buffer.from(p, 'base64').toString('utf-8');
        return JSON.parse(json);
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
    return {
        status: status,
        body: body,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // 允許外部存取，或指定您的 GitHub Pages 網址
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        }
    };
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

// 1. User Login
export async function post_memberLogin(request) {
    const ip = request.ip;
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
            role: user.role || 'member',
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24hr exp
        };
        const token = signToken(tokenPayload);
        return jsonResponse({ ok: true, token, role: user.role });
    } catch (e) {
        return jsonResponse({ ok: false, message: e.message }, 500);
    }
}

// 2. User Register
export async function post_memberRegister(request) {
    const body = await getJsonBody(request);
    const { username, email, password, isAdmin, adminCode } = body;

    if (!username || !email || !password) return jsonResponse({ ok: false, message: '資料不完整' }, 400);
    if (username.length < 3) return jsonResponse({ ok: false, message: '帳號太短' }, 400);

    // simple admin code check
    let role = 'member';
    if (isAdmin && adminCode === ADMIN_REGISTER_CODE) {
        role = 'admin';
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
    const body = await getJsonBody(request);
    const { username, email } = body;
    // Logic: find user -> generate code -> send triggered email
    // This requires wix-crm-backend and Triggered Emails setup
    try {
        // Mock success to prevent enumeration if not found
        // But if found:
        const user = await findUserByUsername(username || email); // Helper needs adjustment to search by email if username is empty
        if (user) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await saveResetCode(user.username, code);
            // await wixCrmBackend.emailUser(EMAIL_TEMPLATE_ID, user._id, { variables: { code } });
            // Note: 'emailUser' requires a Wix Member ID. Our 'SocialUsers' are custom. 
            // To enable emails, you must create a Contact for this email and use emailContact, or use 3rd party (SendGrid).
            console.log(`[Forgot] Code for ${user.username}: ${code}`);
        }
        return jsonResponse({ ok: true, message: '若帳號存在，我們已發送重設代碼至您的信箱。' });
    } catch (e) {
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
        await wixData.update('SocialUsers', user);
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
        const result = await wixData.query('Profiles').eq('username', username).find();
        if (result.items.length > 0) {
            const p = result.items[0];
            const profileData = JSON.parse(p.json || '{}');
            return jsonResponse({ ok: true, profile: profileData, updatedAt: p.updatedAt });
        } else {
            return jsonResponse({ ok: true, profile: null });
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
            const existingRes = await wixData.query('Profiles').eq('username', username).find();
            if (existingRes.items.length > 0) {
                const existingP = JSON.parse(existingRes.items[0].json || '{}');
                const existingComments = (existingP.selfEvaluation && existingP.selfEvaluation.teacherComments) || '';

                // Restore comments to the incoming profile
                if (!profile.selfEvaluation) profile.selfEvaluation = {};
                profile.selfEvaluation.teacherComments = existingComments;
            }
        }
        // If admin, they can edit everything (including teacherComments)

        const result = await wixData.query('Profiles').eq('username', username).find();
        let item;
        if (result.items.length > 0) {
            item = result.items[0];
            item.json = JSON.stringify(profile);
            item.updatedAt = new Date();
            await wixData.update('Profiles', item);
        } else {
            item = {
                username,
                json: JSON.stringify(profile),
                updatedAt: new Date()
            };
            await wixData.insert('Profiles', item);
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
        const res = await wixData.query('SocialUsers').limit(1000).find();
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
        // In real Wix app, use Media Manager. Here we store base64 in 'UploadedImages' collection
        // Note: Wix text field limit is ~500KB. Large images will fail.
        const id = Math.random().toString(36).slice(2);

        // Only store metadata + base64 (if small enough)
        // Ideally we would return a presigned URL, but for now we simulate
        // Only store metadata + base64 (if small enough)
        // Ideally we would return a presigned URL, but for now we simulate
        await saveImage({
            id: id,
            filename: filename || 'upload.png',
            mimetype: 'image/png', // simplified or extract from dataUrl
            base64: dataUrl, // careful with size
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
        return jsonResponse(d || { version: 0, data: {} });
    } catch (e) { return jsonResponse({ error: e.message }, 500); }
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
        await wixData.insert('Questionnaires', item);
        return jsonResponse({ ok: true });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}

// 12. List Questionnaires (Public/Member)
export async function post_questionnaireList(request) {
    try {
        // Active questionnaires
        const res = await wixData.query('Questionnaires').eq('status', 'active').find();
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
        await wixData.insert('QuestionnaireResponses', item);
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
        const res = await q.find();
        return jsonResponse({ ok: true, responses: res.items });
    } catch (e) { return jsonResponse({ ok: false, message: e.message }, 500); }
}
