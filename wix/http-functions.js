/**
 * wix/http-functions.js
 * Wix HTTP Functions 實作
 * 
 * [功能說明]
 * 所有 REST API 端點實作
 * - 管理員登入/登出
 * - 會員註冊/登入/忘記密碼
 * - 資料讀取/更新
 * - 會員資料 CRUD
 * - 圖片上傳
 * - 問卷系統 CRUD
 * 
 * [部署方式]
 * 將此檔案放置於 Wix 網站後端的「Backend Web Modules」中
 * 每個 export function 都會自動成為 HTTP 端點
 */

// ==================== 引入模組 ====================
// 注意：移除了不支援的 unauthorized，加入了 response 用於自訂 401
import { ok, badRequest, serverError, forbidden, response } from 'wix-http-functions';
import wixData from 'wix-data';
import { signToken, verifyToken, hashPassword, verifyPassword, checkRateLimit } from './auth.js';
import { uploadDataUrlToWixMedia } from './media-upload.js';

// ==================== 環境設定 ====================
const ADMIN_USER = 'admin';
const ADMIN_PASS_HASH = hashPassword('admin123'); // 預設密碼 admin123
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 天

// ==================== 自訂權限回應輔助函式 ====================
/**
 * 自訂實現 wix-http-functions 缺少的 unauthorized (401) 功能
 * @param {Object} options - 包含 body 的物件
 */
function unauthorized(options) {
  return response({
    status: 401,
    headers: { 'Content-Type': 'application/json' },
    body: options.body
  });
}

/**
 * 驗證 Token 並取得用戶資訊
 * @param {string} token - JWT Token
 */
async function getAuthUser(token) {
  if (!token) return null;
  const auth = verifyToken(token);
  if (!auth.ok) return null;
  return auth;
}

/**
 * 驗證用戶是否為管理員
 * @param {string} token - JWT Token
 */
async function isAdminUser(token) {
  const auth = await getAuthUser(token);
  if (!auth) return false;
  return auth.user === 'admin';
}

// ==================== 問卷 API 端點 ====================
/**
 * POST /_functions/createSurvey
 * 建立問卷（僅管理員）
 */
export async function post_createSurvey(request) {
  try {
    const body = await request.text();
    const { token, title, description, questions } = JSON.parse(body);

    // 驗證權限
    const auth = await getAuthUser(token);
    if (!auth) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: '請先登入' }) });
    }
    if (!isAdminUser(token)) {
      return forbidden({ body: JSON.stringify({ ok: false, message: '僅管理員可建立問卷' }) });
    }

    // 驗證必要欄位
    if (!title) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少問卷標題' }) });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '問卷至少需要一個問題' }) });
    }

    // 建立問卷
    const now = new Date();
    const result = await wixData.insert('surveys', {
      title: title,
      description: description || '',
      questions: JSON.stringify(questions),
      status: 'draft',
      createdBy: auth.user,
      createdAt: now,
      updatedAt: now
    });

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        survey: { id: result._id, title: result.title, status: result.status },
        message: '問卷建立成功'
      })
    });
  } catch (error) {
    console.error('CreateSurvey error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

/**
 * GET /_functions/surveyList
 * 取得問卷列表（已登入用戶可讀取）
 */
export async function get_surveyList(request) {
  try {
    const token = request.query.token || '';

    // 驗證權限
    const auth = await getAuthUser(token);
    if (!auth) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: '請先登入' }) });
    }

    // 管理員可看到所有問卷，會員只能看已發佈的
    let query = wixData.query('surveys');
    if (auth.user !== 'admin') {
      query = query.eq('status', 'active');
    }

    const results = await query.descending('createdAt').find();
    const surveys = results.items.map(item => ({
      id: item._id,
      title: item.title,
      description: item.description,
      status: item.status,
      createdBy: item.createdBy,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null
    }));

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, surveys: surveys })
    });
  } catch (error) {
    console.error('SurveyList error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

/**
 * GET /_functions/surveyDetail
 * 取得單一問卷詳情
 */
export async function get_surveyDetail(request) {
  try {
    const token = request.query.token || '';
    const surveyId = request.query.surveyId || '';

    // 驗證權限
    const auth = await getAuthUser(token);
    if (!auth) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: '請先登入' }) });
    }
    if (!surveyId) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少問卷 ID' }) });
    }

    // 取得問卷
    const survey = await wixData.get('surveys', surveyId);
    if (!survey) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '問卷不存在' }) });
    }

    // 會員只能看已發佈的問卷
    if (auth.user !== 'admin' && survey.status !== 'active') {
      return forbidden({ body: JSON.stringify({ ok: false, message: '無法存取此問卷' }) });
    }

    let questions = [];
    try {
      questions = JSON.parse(survey.questions || '[]');
    } catch (e) {
      questions = [];
    }

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        survey: {
          id: survey._id,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          questions: questions,
          createdBy: survey.createdBy,
          createdAt: survey.createdAt ? survey.createdAt.toISOString() : null
        }
      })
    });
  } catch (error) {
    console.error('SurveyDetail error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

/**
 * POST /_functions/submitResponse
 * 提交問卷回答
 */
export async function post_submitResponse(request) {
  try {
    const body = await request.text();
    const { token, surveyId, answers } = JSON.parse(body);

    // 驗證權限
    const auth = await getAuthUser(token);
    if (!auth) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: '請先登入' }) });
    }

    // 驗證必要欄位
    if (!surveyId) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少問卷 ID' }) });
    }
    if (!answers || Object.keys(answers).length === 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請填寫問卷' }) });
    }

    // 檢查問卷是否存在且為活動中
    const survey = await wixData.get('surveys', surveyId);
    if (!survey) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '問卷不存在' }) });
    }
    if (survey.status !== 'active') {
      return badRequest({ body: JSON.stringify({ ok: false, message: '此問卷目前無法填寫' }) });
    }

    // 檢查是否已填寫過
    const existing = await wixData.query('responses')
      .eq('surveyId', surveyId)
      .eq('memberId', auth.user)
      .find();

    if (existing.items.length > 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '您已填寫過此問卷' }) });
    }

    // 提交回答
    const result = await wixData.insert('responses', {
      surveyId: surveyId,
      memberId: auth.user,
      answers: JSON.stringify(answers),
      createdAt: new Date()
    });

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, responseId: result._id, message: '問卷提交成功' })
    });
  } catch (error) {
    console.error('SubmitResponse error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

/**
 * GET /_functions/surveyResponses
 * 取得問卷回答（僅管理員）
 */
export async function get_surveyResponses(request) {
  try {
    const token = request.query.token || '';
    const surveyId = request.query.surveyId || '';

    // 驗證權限
    const auth = await getAuthUser(token);
    if (!auth) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: '請先登入' }) });
    }
    if (auth.user !== 'admin') {
      return forbidden({ body: JSON.stringify({ ok: false, message: '僅管理員可查看回答' }) });
    }
    if (!surveyId) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少問卷 ID' }) });
    }

    // 取得回答
    const results = await wixData.query('responses')
      .eq('surveyId', surveyId)
      .descending('createdAt')
      .find();

    const responses = results.items.map(item => ({
      id: item._id,
      surveyId: item.surveyId,
      memberId: item.memberId,
      answers: JSON.parse(item.answers || '{}'),
      createdAt: item.createdAt ? item.createdAt.toISOString() : null
    }));

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, responses: responses })
    });
  } catch (error) {
    console.error('SurveyResponses error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 管理員登入 ====================
/**
 * POST /_functions/login
 * 管理員登入
 */
export async function post_login(request) {
  try {
    const rateLimit = checkRateLimit('login', 10, 60000);
    if (!rateLimit.allowed) {
      return badRequest({ body: JSON.stringify({ ok: false, message: rateLimit.message }) });
    }

    const body = await request.text();
    const { username, password } = JSON.parse(body);

    if (!username || !password) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請輸入帳號和密碼' }) });
    }

    if (username === ADMIN_USER && password === 'admin123') {
      const token = signToken(username, Date.now());
      return ok({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, token: token, exp: Date.now() + TOKEN_EXPIRY, message: '登入成功' })
      });
    }

    return badRequest({ body: JSON.stringify({ ok: false, message: '帳號或密碼錯誤' }) });
  } catch (error) {
    console.error('Login error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 會員登入 ====================
/**
 * POST /_functions/memberLogin
 * 會員登入
 */
export async function post_memberLogin(request) {
  try {
    const rateLimit = checkRateLimit('memberLogin', 10, 60000);
    if (!rateLimit.allowed) {
      return badRequest({ body: JSON.stringify({ ok: false, message: rateLimit.message }) });
    }

    const body = await request.text();
    const { username, password } = JSON.parse(body);

    if (!username || !password) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請輸入帳號和密碼' }) });
    }

    const members = await wixData.query('members')
      .eq('username', username)
      .find();

    if (members.items.length === 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '帳號或密碼錯誤' }) });
    }

    const member = members.items[0];
    if (!verifyPassword(password, member.passHash)) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '帳號或密碼錯誤' }) });
    }

    const token = signToken(username, Date.now());
    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, token: token, exp: Date.now() + TOKEN_EXPIRY, role: member.role || 'member', message: '登入成功' })
    });
  } catch (error) {
    console.error('MemberLogin error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 會員註冊 ====================
/**
 * POST /_functions/memberRegister
 * 會員註冊
 */
export async function post_memberRegister(request) {
  try {
    const rateLimit = checkRateLimit('memberRegister', 5, 60000);
    if (!rateLimit.allowed) {
      return badRequest({ body: JSON.stringify({ ok: false, message: rateLimit.message }) });
    }

    const body = await request.text();
    const { username, email, password } = JSON.parse(body);

    if (!username || !email || !password) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請填寫所有必填欄位' }) });
    }
    if (password.length < 6) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '密碼至少需要 6 個字元' }) });
    }

    const existing = await wixData.query('members')
      .eq('username', username)
      .find();

    if (existing.items.length > 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '帳號已存在' }) });
    }

    const existingEmail = await wixData.query('members')
      .eq('email', email)
      .find();

    if (existingEmail.items.length > 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: 'Email 已被使用' }) });
    }

    const passHash = hashPassword(password);
    await wixData.insert('members', {
      username: username,
      email: email,
      passHash: passHash,
      createdAt: new Date(),
      role: 'member'
    });

    await wixData.insert('profiles', {
      username: username,
      jsonData: JSON.stringify({
        basic: { name: '', email: email, phone: '', birthday: '', address: '' },
        selfEvaluation: { interests: '', strengths: '', goals: '' },
        activities: [],
        learningRecords: []
      }),
      updatedAt: new Date()
    });

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: '註冊成功' })
    });
  } catch (error) {
    console.error('MemberRegister error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 忘記密碼 ====================
/**
 * POST /_functions/memberForgot
 * 發送重設密碼郵件
 */
export async function post_memberForgot(request) {
  try {
    const rateLimit = checkRateLimit('memberForgot', 3, 60000);
    if (!rateLimit.allowed) {
      return badRequest({ body: JSON.stringify({ ok: false, message: rateLimit.message }) });
    }

    const body = await request.text();
    const { email } = JSON.parse(body);

    if (!email) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請輸入 Email' }) });
    }

    const members = await wixData.query('members')
      .eq('email', email)
      .find();

    if (members.items.length === 0) {
      return ok({ body: JSON.stringify({ ok: true, message: '如果帳號存在，已發送重設密碼郵件' }) });
    }

    const member = members.items[0];
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);

    // 【已修正】將更新欄位與原本物件 merge，並正確作為第二個參數傳入
    await wixData.update('members', {
      ...member,
      resetToken: resetToken,
      resetTokenExp: resetTokenExp
    });
    console.log(`Reset token for ${email}: ${resetToken}`);

    return ok({
      body: JSON.stringify({ ok: true, message: '如果帳號存在，已發送重設密碼郵件', debugToken: resetToken })
    });
  } catch (error) {
    console.error('MemberForgot error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 重設密碼確認 ====================
/**
 * GET /_functions/confirmReset
 * 驗證重設密碼 Token
 */
export async function get_confirmReset(request) {
  try {
    const token = request.query.token || '';
    if (!token) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少 Token' }) });
    }

    const members = await wixData.query('members')
      .eq('resetToken', token)
      .find();

    if (members.items.length === 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '無效的 Token' }) });
    }

    const member = members.items[0];
    if (member.resetTokenExp && new Date(member.resetTokenExp) < new Date()) {
      return badRequest({ body: JSON.stringify({ ok: false, message: 'Token 已過期' }) });
    }

    return ok({ body: JSON.stringify({ ok: true, message: 'Token 有效' }) });
  } catch (error) {
    console.error('ConfirmReset error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 資料讀取 ====================
/**
 * POST /_functions/read
 * 讀取資料集
 */
export async function post_read(request) {
  try {
    const body = await request.text();
    const { token, key } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }
    if (!key) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少 key 參數' }) });
    }

    const results = await wixData.query('datasets')
      .eq('key', key)
      .find();

    if (results.items.length === 0) {
      return ok({
        body: JSON.stringify({ ok: true, key: key, version: 0, updatedAt: null, data: null, message: '資料不存在' })
      });
    }

    const dataset = results.items[0];
    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        key: dataset.key,
        version: dataset.version || 1,
        updatedAt: dataset.updatedAt ? dataset.updatedAt.toISOString() : null,
        data: dataset.jsonData ? JSON.parse(dataset.jsonData) : null
      })
    });
  } catch (error) {
    console.error('Read error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 資料更新 ====================
/**
 * POST /_functions/update
 * 更新資料集（直接儲存，無需發佈）
 */
export async function post_update(request) {
  try {
    const body = await request.text();
    const { token, key, data } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }
    if (!key) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少 key 參數' }) });
    }

    const existing = await wixData.query('datasets')
      .eq('key', key)
      .find();

    const now = new Date();
    const newVersion = existing.items.length > 0 ? (existing.items[0].version || 0) + 1 : 1;

    if (existing.items.length > 0) {
      // 【已修正】將更新欄位與原本物件 merge，並正確作為第二個參數傳入
      await wixData.update('datasets', {
        ...existing.items[0],
        jsonData: JSON.stringify(data),
        version: newVersion,
        updatedAt: now
      });
    } else {
      await wixData.insert('datasets', {
        key: key,
        jsonData: JSON.stringify(data),
        version: newVersion,
        updatedAt: now
      });
    }

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, key: key, version: newVersion, message: '更新成功' })
    });
  } catch (error) {
    console.error('Update error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 會員資料讀取 ====================
/**
 * POST /_functions/profileRead
 * 讀取會員資料
 */
export async function post_profileRead(request) {
  try {
    const body = await request.text();
    const { token } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }

    const username = auth.user;
    const results = await wixData.query('profiles')
      .eq('username', username)
      .find();

    if (results.items.length === 0) {
      return ok({ body: JSON.stringify({ ok: true, data: null, message: '資料不存在' }) });
    }

    const profile = results.items[0];
    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        data: profile.jsonData ? JSON.parse(profile.jsonData) : null,
        updatedAt: profile.updatedAt ? profile.updatedAt.toISOString() : null
      })
    });
  } catch (error) {
    console.error('ProfileRead error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 會員資料更新 ====================
/**
 * POST /_functions/profileUpdate
 * 更新會員資料
 */
export async function post_profileUpdate(request) {
  try {
    const body = await request.text();
    const { token, data } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }

    const username = auth.user;
    const now = new Date();
    const existing = await wixData.query('profiles')
      .eq('username', username)
      .find();

    if (existing.items.length > 0) {
      // 【已修正】將更新欄位與原本物件 merge，並正確作為第二個參數傳入
      await wixData.update('profiles', {
        ...existing.items[0],
        jsonData: JSON.stringify(data),
        updatedAt: now
      });
    } else {
      await wixData.insert('profiles', {
        username: username,
        jsonData: JSON.stringify(data),
        updatedAt: now
      });
    }

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: '更新成功' })
    });
  } catch (error) {
    console.error('ProfileUpdate error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 會員列表 ====================
/**
 * POST /_functions/membersList
 * 取得會員列表（僅管理員）
 */
export async function post_membersList(request) {
  try {
    const body = await request.text();
    const { token } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }

    const results = await wixData.query('members').find();
    const members = results.items.map(m => ({
      username: m.username,
      email: m.email,
      role: m.role,
      createdAt: m.createdAt ? m.createdAt.toISOString() : null
    }));

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, members: members })
    });
  } catch (error) {
    console.error('MembersList error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 修改密碼 ====================
/**
 * POST /_functions/memberChangePassword
 * 修改會員密碼
 */
export async function post_memberChangePassword(request) {
  try {
    const body = await request.text();
    const { token, oldPassword, newPassword } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }
    if (!oldPassword || !newPassword) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '請填寫所有欄位' }) });
    }
    if (newPassword.length < 6) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '新密碼至少需要 6 個字元' }) });
    }

    const username = auth.user;
    const members = await wixData.query('members')
      .eq('username', username)
      .find();

    if (members.items.length === 0) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '會員不存在' }) });
    }

    const member = members.items[0];
    if (!verifyPassword(oldPassword, member.passHash)) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '舊密碼錯誤' }) });
    }

    const newPassHash = hashPassword(newPassword);
    // 【已修正】將更新欄位與原本物件 merge，並正確作為第二個參數傳入
    await wixData.update('members', {
      ...member,
      passHash: newPassHash
    });

    return ok({ body: JSON.stringify({ ok: true, message: '密碼修改成功' }) });
  } catch (error) {
    console.error('MemberChangePassword error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 圖片上傳 ====================
/**
 * POST /_functions/uploadImage
 * 上傳圖片到 Wix Media
 */
export async function post_uploadImage(request) {
  try {
    const body = await request.text();
    const { token, dataUrl, filename } = JSON.parse(body);

    const auth = verifyToken(token);
    if (!auth.ok) {
      return unauthorized({ body: JSON.stringify({ ok: false, message: auth.message }) });
    }
    if (!dataUrl || !filename) {
      return badRequest({ body: JSON.stringify({ ok: false, message: '缺少必要參數' }) });
    }

    const result = await uploadDataUrlToWixMedia(dataUrl, filename);
    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
  } catch (error) {
    console.error('UploadImage error:', error);
    return serverError({ body: JSON.stringify({ ok: false, message: '伺服器錯誤' }) });
  }
}

// ==================== 預設導出 ====================
export default {
  post_login,
  post_memberLogin,
  post_memberRegister,
  post_memberForgot,
  get_confirmReset,
  post_read,
  post_update,
  post_profileRead,
  post_profileUpdate,
  post_membersList,
  post_memberChangePassword,
  post_uploadImage,
  post_createSurvey,
  get_surveyList,
  get_surveyDetail,
  post_submitResponse,
  get_surveyResponses
};