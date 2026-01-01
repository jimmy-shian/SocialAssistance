
import { ok, badRequest, response } from 'wix-http-functions';
import * as db from 'backend/wix-data-helpers.js';
import wixCrm from 'wix-crm-backend'; // 引入 Wix CRM Backend
import crypto from 'crypto'; // Node standard library available in Wix Backend

// 設定
const TOKEN_SECRET = 'YOUR_SECRET_KEY_HERE'; // **重要**: 請修改此處!
const EMAIL_TEMPLATE_ID = 'ForgotPassword'; // **重要**: 這是您在 Wix 後台設定的 Triggered Email 代碼
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 小時

// 簡易頻率限制 (僅供示範，Serverless 環境下記憶體快取可能不會持久)
// 注意: 在無伺服器環境中，記憶體快取可能不會持久。
// 對於生產環境，請使用專用集合進行頻率限制。
const RATE_LIMITS = {};

// 回應 Helper
function jsonResponse(body, status = 200) {
    return response({
        status: status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // 允許 CORS
        },
        body: body
    });
}

function errorResponse(message) {
    return jsonResponse({ ok: false, message }, 400); // 維持 400 Bad Request
}

// 加密 Helpers
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + '|' + TOKEN_SECRET).digest('base64');
}

function signToken(username, timestamp) {
    const raw = username + '\n' + timestamp;
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(raw).digest('base64');
    return `${username}.${timestamp}.${sig}`;
}

function verifyToken(token) {
    if (!token) return { ok: false, message: '缺少 token' };
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, message: 'token 格式不正確' };

    const [user, tsStr, sig] = parts;
    const ts = Number(tsStr);
    const now = Date.now();

    if (Math.abs(now - ts) > TOKEN_TTL_MS) return { ok: false, message: 'token 已過期' };

    const expected = signToken(user, ts);
    if (expected !== token) return { ok: false, message: 'token 驗證失敗' };

    return { ok: true, user: user };
}

// Body 解析 Helper
async function getBody(request) {
    try {
        return await request.body.json();
    } catch (e) {
        return {};
    }
}

// ==========================================
// HTTP Functions
// ==========================================

// 1. 會員登入 (Login)
export async function post_memberLogin(request) {
    const body = await getBody(request);
    const u = (body.username || '').trim();
    const p = body.password || '';

    if (!u || !p) return errorResponse('缺少帳號或密碼');

    const user = await db.getUser(u);
    if (!user) return errorResponse('帳號或密碼錯誤');

    if (user.passHash !== hashPassword(p)) return errorResponse('帳號或密碼錯誤');

    const ts = Date.now();
    const token = signToken(u, ts);

    return jsonResponse({
        ok: true,
        token: token,
        exp: ts + TOKEN_TTL_MS,
        role: user.role || 'member'
    });
}

// 2. 會員註冊 (Register)
export async function post_memberRegister(request) {
    const body = await getBody(request);
    const u = (body.username || '').trim();
    const email = (body.email || '').trim();
    const p = body.password || '';

    if (!u || !email || !p) return errorResponse('缺少欄位');

    const exists = await db.getUser(u);
    if (exists) return errorResponse('帳號已存在');

    const newUser = {
        username: u,
        email: email,
        passHash: hashPassword(p),
        role: 'member'
    };

    await db.upsertUser(newUser);

    const ts = Date.now();
    const token = signToken(u, ts);

    return jsonResponse({ ok: true, token, role: 'member' });
}

// 3. 讀取個人資料 (Get Profile)
export async function post_profileRead(request) {
    const body = await getBody(request);
    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    const requester = ver.user;
    const targetUser = (body.username || '').trim() || requester;

    // 權限檢查 (除非是管理員，否則只能讀取自己的)
    if (targetUser !== requester) {
        const reqUserObj = await db.getUser(requester);
        if (reqUserObj?.role !== 'admin') {
            return errorResponse('不可讀取他人資料');
        }
    }

    const result = await db.getProfile(targetUser);

    // 自動補入 email (若 DB 中沒有，從 users表 讀取)
    if (result.profile && !result.profile.basic?.email) {
        const uObj = await db.getUser(targetUser);
        if (uObj?.email) {
            if (!result.profile.basic) result.profile.basic = {};
            result.profile.basic.email = uObj.email;
        }
    }

    return jsonResponse({ ok: true, username: targetUser, profile: result.profile });
}

// 4. 更新個人資料 (Update Profile)
export async function post_profileUpdate(request) {
    const body = await getBody(request);
    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    const targetUser = (body.username || '').trim() || ver.user;

    if (targetUser !== ver.user) return errorResponse('不可修改他人資料');

    if (!body.profile) return errorResponse('缺少 profile 資料');

    await db.setProfile(targetUser, body.profile);
    return jsonResponse({ ok: true });
}

// 5. 修改密碼 (Change Password)
export async function post_memberChangePassword(request) {
    const body = await getBody(request);
    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    const currentPass = String(body.current || body.old || '');
    const newPass = String(body.new || body.password || '');

    if (!currentPass || !newPass) return errorResponse('缺少欄位');

    const user = await db.getUser(ver.user);
    if (!user) return errorResponse('帳號不存在');

    if (user.passHash !== hashPassword(currentPass)) return errorResponse('當前密碼不正確');

    user.passHash = hashPassword(newPass);
    await db.upsertUser(user);

    return jsonResponse({ ok: true });
}

// 6. 忘記密碼 (Forgot Password)
export async function post_memberForgot(request) {
    const body = await getBody(request);
    const u = (body.username || '').trim();
    const email = (body.email || '').trim();

    const user = u ? await db.getUser(u) : await db.getUserByEmail(email);
    if (!user || !user.email) {
        // 反枚舉：返回虛假成功
        return jsonResponse({ ok: true, message: '若帳號存在，已寄出確認信' });
    }

    // 產生重設代碼
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars

    // 儲存代碼到資料庫 (30分鐘有效)
    await db.saveResetCode(user.username, code);

    // 發送 Triggered Email
    try {
        // 1. 建立或獲取 Contact ID (Wix CRM 需要 Contact ID 才能寄信)
        // createContact 會以 Email 為鍵，若存在則更新，並回傳 Contact ID
        const contactId = await wixCrm.createContact({
            "firstName": user.username,
            "emails": [user.email]
        });

        // 2. 發送郵件
        // 變數名稱 resetCode 必須與 Wix Triggered Email 設定中的變數一致
        // 變數名稱 resetLink 若有需要也可加入
        const resetLink = `https://${request.headers.host || 'yoursite'}/reset-password?code=${code}`;

        await wixCrm.emailContact(EMAIL_TEMPLATE_ID, contactId, {
            variables: {
                resetCode: code,
                username: user.username,
                resetLink: resetLink
            }
        });

        return jsonResponse({ ok: true, message: '已寄送確認信' });
    } catch (err) {
        console.error('Email send failed:', err);
        // 原則上不回傳錯誤給前端，以免暴露系統細節，但為了除錯可視情況調整
        return jsonResponse({ ok: false, message: '郵件發送系統異常' });
    }
}

// 7. 讀取網站資料 (Get Site Data)
export async function post_read(request) {
    const body = await getBody(request);

    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    const key = body.key;
    if (!['aboutContent', 'providers', 'siteContent', 'blogContent'].includes(key)) {
        return errorResponse('不允許的 key');
    }

    const ds = await db.getDataset(key);
    const hasData = ds.data && Object.keys(ds.data).length > 0;

    return jsonResponse({
        ok: true,
        key: key,
        version: ds.version,
        updatedAt: ds.updatedAt,
        data: ds.data,
        hasData: hasData
    });
}

// 8. 更新網站資料 (Update Site Data - Admin)
export async function post_update(request) {
    const body = await getBody(request);
    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    // 檢查管理員權限
    const u = await db.getUser(ver.user);
    if (u?.role !== 'admin' && ver.user !== ADMIN_USER) {
        return errorResponse('需要管理員權限');
    }

    const key = body.key;
    const data = body.data;

    if (!data) return errorResponse('缺少 data');

    const res = await db.setDataset(key, data);
    return jsonResponse({ ok: true, key, version: res.version });
}

// 9. 上傳圖片 (Upload Image)
export async function post_uploadImage(request) {
    const body = await getBody(request);
    const ver = verifyToken(body.token);
    if (!ver.ok) return errorResponse(ver.message || '未授權');

    const du = body.dataUrl || '';
    const m = du.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return errorResponse('資料格式錯誤 (Invalid dataUrl)');

    const id = crypto.randomUUID();
    const filename = (body.filename || `img_${Date.now()}`).replace(/[^\w\-.]+/g, '_');

    await db.saveImage({
        id: id,
        filename: filename,
        mimetype: m[1],
        base64: m[2]
    });

    return jsonResponse({ ok: true, id, filename, mimetype: m[1] });
}

// 10. 確認重設代碼 (GET) - 選擇性實作
// 若前端頁面是 /reset-password?code=XYZ，前端會拿 code 呼叫此 API 確認有效性
// 此處用 POST checkResetCode 比較安全
export async function post_checkResetCode(request) {
    const body = await getBody(request);
    const code = body.code || '';
    if (!code) return errorResponse('缺少代碼');

    const user = await db.verifyAndClearResetCode(code);
    if (!user) return errorResponse('代碼無效或已過期');

    // 代碼有效，回傳部分使用者資訊供前端顯示 (例如 "正在重設 user1 的密碼")
    return jsonResponse({ ok: true, username: user.username });
}

// 11. 執行密碼重設 (Reset Password with Code)
export async function post_confirmResetPassword(request) {
    const body = await getBody(request);
    const code = body.code || '';
    const newPass = body.newPassword || '';

    if (!code || !newPass) return errorResponse('缺少欄位');

    const user = await db.verifyAndClearResetCode(code);
    if (!user) return errorResponse('代碼無效或已過期');

    // 更新密碼
    user.passHash = hashPassword(newPass);
    // 清除代碼
    user.resetCode = null;
    user.resetCodeExp = null;

    await db.upsertUser(user);

    return jsonResponse({ ok: true });
}
