function _handleConfirmResetGet(e){
  var code = (e && e.parameter && e.parameter.code) || '';
  if (!code) return HtmlService.createHtmlOutput('<html><body>缺少確認代碼</body></html>');
  var username = null;
  try { username = CacheService.getScriptCache().get('reset-code:'+ code) || null; } catch(err){}
  if (!username) return HtmlService.createHtmlOutput('<html><body>連結已失效，請重新申請重設密碼。</body></html>');
  var user = _getUser(username);
  if (!user) return HtmlService.createHtmlOutput('<html><body>帳號不存在。</body></html>');
  // 產生一組臨時密碼並更新
  var tmp = Math.random().toString(36).slice(2, 10);
  _upsertUser({ username: user.username, email: user.email, passHash: _hashPassword(tmp) });
  try { CacheService.getScriptCache().put('reset-code:'+ code, '', 1); } catch(e){}
  var subject = '臨時密碼已產生（核心生涯探索平台）';
  var bodyText = '您好，\n\n您的臨時密碼為：' + tmp + '\n\n請使用此密碼登入後，至個人頁「修改密碼」功能更改為新密碼。';
  var html = '<p>您好，</p><p>您的臨時密碼為：<b>' + tmp + '</b></p><p>請使用此密碼登入後，至個人頁「修改密碼」功能更改為新密碼。</p>';
  try { MailApp.sendEmail({ to: user.email, subject: subject, htmlBody: html, body: bodyText }); } catch(err){}
  return HtmlService.createHtmlOutput('<html><head><style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:Arial,sans-serif;background-color:#f8f8f8}.message-box{text-align:center;font-size:20px;padding:30px 40px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);line-height:1.6}.note{font-size:16px;color:#666;margin-top:20px}</style></head><body><div class="message-box">✅ 確認成功！<br><br>已寄送臨時密碼到您的 Email，請查收。<div class="note">登入後請至個人資料頁面修改密碼。</div></div></body></html>');
}

function _getUserByEmail(email){
  if (!email) return null;
  var sh = _ensureUserSheet();
  var data = sh.getDataRange().getValues();
  for (var r=1;r<data.length;r++){
    if (String(data[r][1]).toLowerCase() === String(email).toLowerCase()){
      return { username: data[r][0], email: data[r][1], passHash: data[r][2], createdAt: data[r][3] };
    }
  }
  return null;
}

function _handleMemberChangePassword(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message||'未授權');
  var cur = String(body.current||body.old||'');
  var nw = String(body.new||body.password||'');
  if (!cur || !nw) return _badRequest('缺少欄位');
  var u = _getUser(ver.user);
  if (!u) return _badRequest('帳號不存在');
  if (_hashPassword(cur) !== u.passHash) return _badRequest('當前密碼不正確');
  _upsertUser({ username: u.username, email: u.email, passHash: _hashPassword(nw) });
  return _jsonOutput({ ok:true });
}
// Utility: web app base URL for reset confirmation (configure in Script Properties RESET_CONFIRM_BASE if ScriptApp unavailable)
function _webAppBase(){
  try {
    var p = _props();
    var base = p.getProperty('RESET_CONFIRM_BASE');
    if (base) return base.replace(/\/$/, '');
  } catch(e){}
  try {
    // Might not be available in all contexts; best-effort
    var svc = ScriptApp.getService && ScriptApp.getService();
    var url = svc && svc.getUrl && svc.getUrl();
    if (url) return String(url).replace(/\/$/, '');
  } catch(e){}
  return '';
}
// Google Apps Script backend for SocialAssistance data management
// Exposes actions via Web App:
// GET  ?action=version                  -> { ok:true, versions:{ aboutContent: n, providers: n, siteContent: n } }

function _handleSavePublish(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var nonce = body.nonce || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message || '未授權');
  if (!_rateLimit('update:' + ver.user, RL.UPDATE_PER_MIN, 60)) return _badRequest('請求過於頻繁，稍後再試');
  var n = _useNonce(nonce); if (!n.ok) return _badRequest(n.message);

  var key = body.key || '';
  var updated = null;
  if (key) {
    if (!ALLOWED_KEYS[key]) return _badRequest('不允許的 key');
    var data = body.data;
    if (typeof data === 'undefined') return _badRequest('缺少 data');
    try { var sz = JSON.stringify(data).length; if (sz > 200000) return _badRequest('資料過大'); } catch(err){}
    updated = _setDataset(key, data);
  }

  // publish（若 GitHub 未設定，也回 ok:true 並附帶錯誤訊息）
  var keys = body && body.keys; if (!Array.isArray(keys) || !keys.length) keys = key ? [key] : Object.keys(ALLOWED_KEYS);
  var conf = _ghConf();
  var results = [];
  if (!conf.ok) {
    // 未設定 GitHub，也視為成功，但附上 publish 錯誤資訊
    results = keys.map(function(k){ return { ok:false, key:String(k), message: 'GitHub 未設定：' + (conf.message || '缺少設定') }; });
    return _jsonOutput({ ok: true, update: updated, results: results, publishOk: false });
  }
  // 有 GitHub 設定：對 providers 的圖片占位（gas://image/<id>/<filename>）進行處理後再發佈
  for (var i=0;i<keys.length;i++){
    var k = String(keys[i]);
    try {
      var dsObj;
      if (k === key && body && typeof body.data !== 'undefined') {
        dsObj = body.data; // 直接用這次傳入的最新版
      } else {
        var ds = _getDataset(k); dsObj = ds.data;
      }
      var processed = (k === 'providers') ? _processImagesForPublish(conf, dsObj) : { data: dsObj, files: [] };
      // 發佈資料集（使用處理後的資料）
      var pub = _publishOneWithData(conf, k, processed.data);
      // 發佈成功後清空暫存資料（datasets 表），以便下次預設為空
      if (pub && pub.ok) {
        try { _clearDataset(k); } catch(clearErr){}
      }
      results.push(pub);
    } catch(err){ results.push({ ok:false, key:k, message:String(err) }); }
  }
  var publishOk = results.every(function(r){ return r && r.ok; });
  return _jsonOutput({ ok: true, update: updated, results: results, publishOk: publishOk });
}
// GET  ?action=data&key=<dataset-key>   -> { ok:true, key, version, data }
// POST ?action=login    body: { username, password }       -> { ok:true, token, exp }
// POST ?action=update   body: { token, key, data }          -> { ok:true, key, version }
//
// Datasets are stored in a Google Sheet with schema: [key, json, version, updatedAt]
// First run will auto-create a Spreadsheet if DATA_SHEET_ID is not configured.

var CFG = Object.freeze({
  PROP_SHEET_ID: 'DATA_SHEET_ID',
  SHEET_NAME: 'datasets',
  HEADERS: ['key','json','version','updatedAt'],
  // Admin credentials and token secret from PropertiesService
  PROP_ADMIN_USER: 'ADMIN_USER',
  PROP_ADMIN_PASS: 'ADMIN_PASS',
  PROP_TOKEN_SECRET: 'TOKEN_SECRET',
  // GitHub publish configuration
  PROP_GH_TOKEN: 'GITHUB_TOKEN',
  PROP_GH_OWNER: 'GITHUB_OWNER',
  PROP_GH_REPO: 'GITHUB_REPO',
  PROP_GH_BRANCH: 'GITHUB_BRANCH', // e.g., main
  PROP_GH_PATH_PREFIX: 'GITHUB_PATH_PREFIX', // e.g., js/data/
  TOKEN_TTL_MS: 2 * 60 * 60 * 1000 // 2h
});

// Allowed dataset keys for update/read
var ALLOWED_KEYS = Object.freeze({
  'aboutContent': true,
  'providers': true,
  'siteContent': true
});

// Simple rate limits per minute (approx)
var RL = Object.freeze({
  LOGIN_PER_MIN: 5,
  READ_PER_MIN: 120,
  UPDATE_PER_MIN: 60,
  PUBLISH_PER_MIN: 20
});

function _props(){ return PropertiesService.getScriptProperties(); }

function _ensureSpreadsheet(){
  var id = _props().getProperty(CFG.PROP_SHEET_ID);
  var ss;
  if (!id) {
    ss = SpreadsheetApp.create('SocialAssistance_Data');
    id = ss.getId();
    _props().setProperty(CFG.PROP_SHEET_ID, id);
  } else {
    ss = SpreadsheetApp.openById(id);
  }
  var sh = ss.getSheetByName(CFG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CFG.SHEET_NAME);
    sh.getRange(1,1,1,CFG.HEADERS.length).setValues([CFG.HEADERS]);
  }
  return sh;
}

function _findRow(sh, key){
  var data = sh.getDataRange().getValues();
  for (var r=1; r<data.length; r++){
    if (data[r][0] === key) return r+1; // 1-based
  }
  return -1;
}

function _getDataset(key){
  var sh = _ensureSpreadsheet();
  var r = _findRow(sh, key);
  if (r < 0) {
    // initialize empty row
    var now = new Date();
    sh.appendRow([key, '{}', 0, now]);
    return { key: key, data: {}, version: 0, updatedAt: now };
  }
  var row = sh.getRange(r, 1, 1, CFG.HEADERS.length).getValues()[0];
  var jsonStr = row[1] || '{}';
  var obj;
  try { obj = JSON.parse(jsonStr); } catch(e){ obj = {}; }
  return { key: row[0], data: obj, version: Number(row[2])||0, updatedAt: row[3] };
}

function _setDataset(key, obj){
  var sh = _ensureSpreadsheet();
  var r = _findRow(sh, key);
  var now = new Date();
  if (r < 0) {
    sh.appendRow([key, JSON.stringify(obj||{}), 1, now]);
    return { key: key, version: 1 };
  }
  var version = Number(sh.getRange(r, 3).getValue()) || 0;
  version++;
  sh.getRange(r, 2, 1, 3).setValues([[ JSON.stringify(obj||{}), version, now ]]);
  return { key: key, version: version };
}

// Clear dataset content (used after successful publish) — set json to '{}' and version to 0
function _clearDataset(key){
  var sh = _ensureSpreadsheet();
  var r = _findRow(sh, key);
  var now = new Date();
  if (r < 0) {
    sh.appendRow([key, '{}', 0, now]);
    return { key: key, cleared: true };
  }
  sh.getRange(r, 2, 1, 3).setValues([[ '{}', 0, now ]]);
  return { key: key, cleared: true };
}

function _getAllVersions(){
  var sh = _ensureSpreadsheet();
  var data = sh.getDataRange().getValues();
  var map = {};
  for (var r=1; r<data.length; r++){
    var key = data[r][0];
    var ver = Number(data[r][2]) || 0;
    map[key] = ver;
  }
  // Ensure the three common keys exist
  if (map['aboutContent'] === undefined) map['aboutContent'] = 0;
  if (map['providers'] === undefined) map['providers'] = 0;
  if (map['siteContent'] === undefined) map['siteContent'] = 0;
  return map;
}

function _jsonOutput(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function _badRequest(msg){ return _jsonOutput({ ok:false, message: msg || 'Bad Request' }); }

function _getBodyObject(e){
  if (!e || !e.postData || !e.postData.contents) return {};
  var text = e.postData.contents;
  try { return JSON.parse(text); } catch(err) { return {}; }
}

function _getPropOrDefault(key, fallback){
  var v = _props().getProperty(key);
  return (v != null && v !== '') ? v : fallback;
}

function _requireConfigured(){
  var p = _props();
  var u = p.getProperty(CFG.PROP_ADMIN_USER);
  var pw = p.getProperty(CFG.PROP_ADMIN_PASS);
  var sec = p.getProperty(CFG.PROP_TOKEN_SECRET);
  if (!u || !pw || !sec || sec === 'PLEASE_CHANGE') return { ok:false, message: '伺服器尚未設定管理者帳密或密鑰' };
  return { ok:true };
}

function _rateLimit(key, limit, windowSec){
  try {
    var c = CacheService.getScriptCache();
    var k = 'rl:' + key;
    var cur = Number(c.get(k) || '0');
    if (cur >= limit) return false;
    c.put(k, String(cur + 1), windowSec);
    return true;
  } catch(e){ return true; }
}

function _nonceKey(n){ return 'nonce:' + n; }
function _useNonce(n){
  if (!n) return { ok:false, message:'缺少 nonce' };
  try {
    var c = CacheService.getScriptCache();
    var k = _nonceKey(n);
    if (c.get(k)) return { ok:false, message:'nonce 已使用' };
    c.put(k, '1', 60 * 60); // 1h
    return { ok:true };
  } catch(e){ return { ok:true }; }
}

// ===== GitHub helpers =====
function _ghConf(){
  var p = _props();
  var tok = p.getProperty(CFG.PROP_GH_TOKEN);
  var owner = p.getProperty(CFG.PROP_GH_OWNER);
  var repo = p.getProperty(CFG.PROP_GH_REPO);
  var branch = p.getProperty(CFG.PROP_GH_BRANCH) || 'main';
  var prefix = p.getProperty(CFG.PROP_GH_PATH_PREFIX) || 'js/data/';
  if (!tok || !owner || !repo) return { ok:false, message:'未設定 GitHub 相關屬性（TOKEN/OWNER/REPO）' };
  return { ok:true, token: tok, owner: owner, repo: repo, branch: branch, prefix: prefix };
}
function _ghHeaders(tok){
  return { 'Authorization': 'token ' + tok, 'Accept': 'application/vnd.github+json' };
}
function _ghApi(path){ return 'https://api.github.com' + path; }
function _ghGetContent(conf, filepath){
  var url = _ghApi('/repos/' + conf.owner + '/' + conf.repo + '/contents/' + encodeURI(filepath)) + '?ref=' + encodeURIComponent(conf.branch);
  try {
    var resp = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: _ghHeaders(conf.token) });
    var code = resp.getResponseCode();
    if (code === 200) return JSON.parse(resp.getContentText());
    return null; // not found or error, we'll create on put
  } catch(e){ return null; }
}
function _ghPutContent(conf, filepath, contentStr, message, prevSha){
  var url = _ghApi('/repos/' + conf.owner + '/' + conf.repo + '/contents/' + encodeURI(filepath));
  var payload = {
    message: message || ('update ' + filepath),
    // 以 UTF-8 bytes 進行 base64，避免中文亂碼
    content: Utilities.base64Encode(Utilities.newBlob(contentStr, 'application/javascript').getBytes()),
    branch: conf.branch
  };
  if (prevSha) payload.sha = prevSha;
  var resp = UrlFetchApp.fetch(url, {
    method: 'put',
    muteHttpExceptions: true,
    headers: _ghHeaders(conf.token),
    payload: JSON.stringify(payload),
    contentType: 'application/json'
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  if (code >= 200 && code < 300) return { ok:true, data: JSON.parse(text) };
  return { ok:false, message: 'GitHub PUT 失敗: ' + code + ' ' + text };
}
function _datasetFilename(key){
  if (key === 'aboutContent') return 'aboutContent.js';
  if (key === 'providers') return 'providers.js';
  if (key === 'siteContent') return 'siteContent.js';
  return key + '.js';
}
function _datasetGlobalVar(key){
  if (key === 'aboutContent') return 'window.aboutContent';
  if (key === 'providers') return 'window.providersData';
  if (key === 'siteContent') return 'window.siteContent';
  return 'window.' + key;
}
function _formatDatasetContent(key, obj){
  var header = '// This file is auto-generated by GAS publish at ' + (new Date()).toISOString() + '\n';
  var body = _datasetGlobalVar(key) + ' = ' + JSON.stringify(obj || {}, null, 2) + ';\n';
  return header + body;
}
function _publishOne(conf, key){
  if (!ALLOWED_KEYS[key]) return { ok:false, key:key, message:'不允許的 key' };
  var ds = _getDataset(key);
  var filename = _datasetFilename(key);
  var path = conf.prefix.replace(/\/*$/, '/') + filename;
  var cur = _ghGetContent(conf, path);
  var sha = cur && cur.sha;
  var content = _formatDatasetContent(key, ds.data);
  var msg = 'chore(data): update ' + key + ' v' + ds.version + ' via GAS';
  var put = _ghPutContent(conf, path, content, msg, sha);
  if (!put.ok) return { ok:false, key:key, message: put.message };
  return { ok:true, key:key, path:path, sha:(put.data && put.data.content && put.data.content.sha) };
}

function _signToken(username, ts){
  var secret = _props().getProperty(CFG.PROP_TOKEN_SECRET);
  if (!secret || secret === 'PLEASE_CHANGE') return null;
  var raw = username + '\n' + ts;
  var sig = Utilities.computeHmacSha256Signature(raw, secret);
  var b64 = Utilities.base64Encode(sig);
  return username + '.' + ts + '.' + b64;
}

function _verifyToken(token){
  if (!token) return { ok:false, message: '缺少 token' };
  var parts = String(token).split('.');
  if (parts.length !== 3) return { ok:false, message: 'token 格式不正確' };
  var user = parts[0];
  var ts = Number(parts[1]) || 0;
  var now = Date.now();
  if (Math.abs(now - ts) > CFG.TOKEN_TTL_MS) return { ok:false, message: 'token 已過期' };
  var expect = _signToken(user, ts);
  if (expect !== token) return { ok:false, message: 'token 驗證失敗' };
  return { ok:true, user: user };
}

function _handleLogin(e){
  var body = _getBodyObject(e);
  var u = body.username || '';
  var p = body.password || '';
  var conf = _requireConfigured();
  if (!conf.ok) return _badRequest(conf.message);
  if (!_rateLimit('login:' + u, RL.LOGIN_PER_MIN, 60)) return _badRequest('嘗試次數過多，請稍後再試');
  var adminU = _props().getProperty(CFG.PROP_ADMIN_USER);
  var adminP = _props().getProperty(CFG.PROP_ADMIN_PASS);
  if (u !== adminU || p !== adminP) return _badRequest('帳號或密碼不正確');
  var ts = Date.now();
  var token = _signToken(u, ts);
  if (!token) return _badRequest('伺服器尚未設定密鑰');
  return _jsonOutput({ ok:true, token: token, exp: ts + CFG.TOKEN_TTL_MS });
}

function _handleData(e){
  // Disable GET data to降低外部讀取風險
  return _badRequest('READ_DISABLED: 請改用 POST action=read');
}

function _handleRead(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var nonce = body.nonce || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message || '未授權');
  if (!_rateLimit('read:' + ver.user, RL.READ_PER_MIN, 60)) return _badRequest('請求過於頻繁，稍後再試');
  var n = _useNonce(nonce); if (!n.ok) return _badRequest(n.message);
  var key = body.key || '';
  if (!key || !ALLOWED_KEYS[key]) return _badRequest('不允許的 key');
  var ds = _getDataset(key);
  var hasData = false; try { hasData = ds && ds.data && typeof ds.data === 'object' && Object.keys(ds.data).length > 0; } catch(err) { hasData = false; }
  return _jsonOutput({ ok:true, key: key, version: ds.version, updatedAt: ds.updatedAt, data: ds.data, hasData: hasData });
}

function _handleUpdate(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message || '未授權');
  if (!_rateLimit('update:' + ver.user, RL.UPDATE_PER_MIN, 60)) return _badRequest('請求過於頻繁，稍後再試');
  var n = _useNonce(body.nonce || ''); if (!n.ok) return _badRequest(n.message);
  var key = body.key || '';
  if (!key || !ALLOWED_KEYS[key]) return _badRequest('不允許的 key');
  var data = body.data;
  if (typeof data === 'undefined') return _badRequest('缺少 data');
  try { var sz = JSON.stringify(data).length; if (sz > 200000) return _badRequest('資料過大'); } catch(err){}
  var r = _setDataset(key, data);
  return _jsonOutput({ ok:true, key: key, version: r.version });
}

function _handleVersion(){
  // Disable GET version to降低外部掃描
  return _badRequest('VERSION_DISABLED');
}

function _handlePublish(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var nonce = body.nonce || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message || '未授權');
  if (!_rateLimit('publish:' + ver.user, RL.PUBLISH_PER_MIN, 60)) return _badRequest('請求過於頻繁，稍後再試');
  var n = _useNonce(nonce); if (!n.ok) return _badRequest(n.message);
  var conf = _ghConf(); if (!conf.ok) return _badRequest(conf.message);
  var keys = body && body.keys; if (!Array.isArray(keys) || !keys.length) keys = Object.keys(ALLOWED_KEYS);
  var results = [];
  for (var i=0;i<keys.length;i++){
    try {
      var k = String(keys[i]);
      var r = _publishOne(conf, k);
      if (r && r.ok) { try { _clearDataset(k); } catch(clearErr){} }
      results.push(r);
    } catch(err){ results.push({ ok:false, key: String(keys[i]), message: String(err) }); }
  }
  var ok = results.every(function(r){ return r && r.ok; });
  return _jsonOutput({ ok: ok, results: results });
}

function doGet(e){
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'confirmReset') return _handleConfirmResetGet(e);
  return _badRequest('GET 已停用');
}

function doPost(e){
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'login') return _handleLogin(e);
  if (action === 'read') return _handleRead(e);
  if (action === 'update') return _handleUpdate(e);
  if (action === 'publish') return _handlePublish(e);
  if (action === 'savePublish') return _handleSavePublish(e);
  if (action === 'memberRegister') return _handleMemberRegister(e);
  if (action === 'memberLogin') return _handleMemberLogin(e);
  if (action === 'memberForgot') return _handleMemberForgot(e);
  if (action === 'profileRead') return _handleProfileRead(e);
  if (action === 'profileUpdate') return _handleProfileUpdate(e);
  if (action === 'uploadImage') return _handleUploadImage(e);
  if (action === 'memberChangePassword') return _handleMemberChangePassword(e);
  return _badRequest('未知 action');
}

// ==============================
// Member system: users + profiles
// ==============================
var MEMBER = Object.freeze({
  SHEET_USERS: 'members',
  SHEET_PROFILES: 'profiles',
  HEAD_USERS: ['username','email','passHash','createdAt'],
  HEAD_PROFILES: ['username','json','updatedAt']
});

function _ensureUserSheet(){
  var ss = SpreadsheetApp.openById(_ensureSpreadsheet().getParent().getId()); // Open same spreadsheet
  // _ensureSpreadsheet already ensures datasets sheet; reuse spreadsheet id
  var id = _props().getProperty(CFG.PROP_SHEET_ID);
  ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(MEMBER.SHEET_USERS);
  if (!sh){ sh = ss.insertSheet(MEMBER.SHEET_USERS); sh.getRange(1,1,1,MEMBER.HEAD_USERS.length).setValues([MEMBER.HEAD_USERS]); }
  return sh;
}
function _ensureProfileSheet(){
  var id = _props().getProperty(CFG.PROP_SHEET_ID);
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(MEMBER.SHEET_PROFILES);
  if (!sh){ sh = ss.insertSheet(MEMBER.SHEET_PROFILES); sh.getRange(1,1,1,MEMBER.HEAD_PROFILES.length).setValues([MEMBER.HEAD_PROFILES]); }
  return sh;
}
function _hashPassword(p){
  var sec = _props().getProperty(CFG.PROP_TOKEN_SECRET) || 'PLEASE_CHANGE';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (p||'') + '|' + sec);
  return Utilities.base64Encode(raw);
}
function _findUserRow(username){
  var sh = _ensureUserSheet();
  var data = sh.getDataRange().getValues();
  for (var r=1;r<data.length;r++){ if (data[r][0] === username) return r+1; }
  return -1;
}
function _getUser(username){
  var r = _findUserRow(username);
  if (r<0) return null;
  var sh = _ensureUserSheet();
  var row = sh.getRange(r,1,1,MEMBER.HEAD_USERS.length).getValues()[0];
  return { username: row[0], email: row[1], passHash: row[2], createdAt: row[3] };
}
function _upsertUser(u){
  var sh = _ensureUserSheet();
  var r = _findUserRow(u.username);
  var now = new Date();
  if (r<0){ sh.appendRow([u.username, u.email, u.passHash, now]); return true; }
  sh.getRange(r,1,1,MEMBER.HEAD_USERS.length).setValues([[u.username, u.email, u.passHash, now]]);
  return true;
}
function _getProfile(username){
  var sh = _ensureProfileSheet();
  var data = sh.getDataRange().getValues();
  // 自底向上找，若有重複則取最後一筆
  for (var r=data.length-1; r>=1; r--){
    if (data[r][0] === username){
      var obj; try{ obj = JSON.parse(data[r][1]||'{}'); }catch(e){ obj = {}; }
      return { username: username, profile: obj, updatedAt: data[r][2] };
    }
  }
  return { username: username, profile: { username: username, basic:{}, selfEvaluation:{}, activities:[], learningRecords:[] }, updatedAt: null };
}
function _setProfile(username, obj){
  var sh = _ensureProfileSheet();
  var data = sh.getDataRange().getValues();
  var now = new Date();
  // 找出所有符合 username 的資料列（轉為實際工作表行號）
  var rows = [];
  for (var i=1; i<data.length; i++){
    if (data[i][0] === username) rows.push(i+1); // i=1 對應工作表第2列
  }
  if (rows.length){
    // 保留最後一筆，刪除其餘重複
    var keep = rows[rows.length-1];
    sh.getRange(keep, 1, 1, 3).setValues([[username, JSON.stringify(obj||{}), now]]);
    // 由下而上刪除，避免索引位移
    rows.sort(function(a,b){ return b-a; });
    for (var j=0; j<rows.length; j++){
      var rr = rows[j];
      if (rr !== keep) sh.deleteRow(rr);
    }
    return true;
  } else {
    sh.appendRow([username, JSON.stringify(obj||{}), now]);
    return true;
  }
}

function _handleMemberRegister(e){
  var body = _getBodyObject(e);
  var u = String(body.username||'').trim();
  var email = String(body.email||'').trim();
  var p = String(body.password||'');
  if (!u || !email || !p) return _badRequest('缺少欄位');
  if (!_rateLimit('mreg:'+u, 20, 60)) return _badRequest('請求過於頻繁');
  var exist = _getUser(u);
  if (exist) return _badRequest('帳號已存在');
  _upsertUser({ username:u, email: email, passHash: _hashPassword(p) });
  var ts = Date.now();
  var token = _signToken(u, ts);
  return _jsonOutput({ ok:true, token: token });
}
function _handleMemberLogin(e){
  var body = _getBodyObject(e);
  var u = String(body.username||'').trim();
  var p = String(body.password||'');
  if (!u || !p) return _badRequest('缺少帳號或密碼');
  if (!_rateLimit('mlogin:'+u, 60, 60)) return _badRequest('請求過於頻繁');
  var user = _getUser(u); if (!user) return _badRequest('帳號或密碼錯誤');
  if (user.passHash !== _hashPassword(p)) return _badRequest('帳號或密碼錯誤');
  var ts = Date.now();
  var token = _signToken(u, ts);
  return _jsonOutput({ ok:true, token: token, exp: ts + CFG.TOKEN_TTL_MS });
}
function _handleMemberForgot(e){
  var body = _getBodyObject(e);
  var u = String(body.username||'').trim();
  var email = String(body.email||'').trim();
  if (!u && !email) return _badRequest('請提供帳號或 Email');
  // 找到使用者，以帳號或 email
  var user = u ? _getUser(u) : _getUserByEmail(email);
  if (!user) {
    // 避免帳號枚舉：回傳成功，但不透露是否存在
    return _jsonOutput({ ok:true, message: '若帳號存在，已寄出確認信' });
  }
  var code = Math.random().toString(36).slice(2,10).toUpperCase();
  try { CacheService.getScriptCache().put('reset-code:'+ code, user.username, 30*60); } catch(err){}
  var base = _webAppBase();
  var link = base ? (base + '?action=confirmReset&code=' + encodeURIComponent(code)) : '';
  var subject = '重設密碼確認（請求來自核心生涯探索平台）';
  var bodyText = '您好，\n\n我們收到了您的密碼重設請求。\n\n請在 30 分鐘內點擊以下連結確認此次操作：\n' + (link || ('確認代碼：' + code)) + '\n\n若您未發出此請求，請忽略本信。';
  var html = '<p>您好，</p><p>我們收到了您的密碼重設請求。</p>' + (link?('<p><a href="'+link+'" target="_blank">點此確認重設</a>（30 分鐘內有效）</p>'):("<p>確認代碼：<b>"+code+"</b></p>")) + '<p>若您未發出此請求，請忽略本信。</p>';
  try { MailApp.sendEmail({ to: user.email, subject: subject, htmlBody: html, body: bodyText }); } catch(err){}
  return _jsonOutput({ ok:true, message: '已寄送確認信（30 分鐘內有效）' });
}
function _handleProfileRead(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var u = String(body.username||'').trim();
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message||'未授權');
  if (u && u !== ver.user) return _badRequest('不可讀取他人資料');
  var username = u || ver.user;
  var p = _getProfile(username);
  // 若基本資料未含 email，且 members 表有 email，則自動補入並保存
  try {
    var user = _getUser(username);
    if (user && user.email){
      if (!p.profile) p.profile = {};
      if (!p.profile.basic) p.profile.basic = {};
      if (!p.profile.basic.email){
        p.profile.basic.email = user.email;
        _setProfile(username, p.profile);
      }
    }
  } catch(err){}
  return _jsonOutput({ ok:true, username: username, profile: p.profile });
}
function _handleProfileUpdate(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var u = String(body.username||'').trim();
  var profile = body.profile;
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message||'未授權');
  var username = u || ver.user;
  if (username !== ver.user) return _badRequest('不可修改他人資料');
  if (typeof profile === 'undefined') return _badRequest('缺少 profile');
  _setProfile(username, profile);
  return _jsonOutput({ ok:true });
}

// ==============================
// Images: upload to Sheet and publish to GitHub img/
// ==============================
var IMAGES = Object.freeze({
  SHEET: 'images',
  HEAD: ['id','filename','mimetype','base64','createdAt','committed','path','sha']
});
function _ensureImageSheet(){
  var id = _props().getProperty(CFG.PROP_SHEET_ID);
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(IMAGES.SHEET);
  if (!sh){ sh = ss.insertSheet(IMAGES.SHEET); sh.getRange(1,1,1,IMAGES.HEAD.length).setValues([IMAGES.HEAD]); }
  return sh;
}
function _putImageRow(img){
  var sh = _ensureImageSheet();
  sh.appendRow([img.id, img.filename, img.mimetype, img.base64, new Date(), '', '', '']);
}
function _getImageById(id){
  var sh = _ensureImageSheet();
  var data = sh.getDataRange().getValues();
  for (var r=1;r<data.length;r++){
    if (data[r][0] === id){
      return { row: r+1, id: data[r][0], filename: data[r][1], mimetype: data[r][2], base64: data[r][3], committed: data[r][5], path: data[r][6], sha: data[r][7] };
    }
  }
  return null;
}
function _markImageCommitted(row, path, sha){
  try { _ensureImageSheet().getRange(row,6,1,3).setValues([[true, path||'', sha||'']]); } catch(err){}
}
function _parseDataUrl(dataUrl){
  var m = String(dataUrl||'').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimetype: m[1], base64: m[2] };
}
function _safeFilename(name){
  name = String(name||'').trim() || ('img_'+Date.now());
  name = name.replace(/[^\w\-.]+/g, '_');
  if (!/\.[A-Za-z0-9]+$/.test(name)) name += '.png';
  return name;
}
function _uniqueImagePath(conf, filename){
  var base = 'img/';
  var name = _safeFilename(filename);
  var path = base + name;
  // 檢查是否存在，存在則加時間戳
  var cur = _ghGetContent(conf, path);
  if (cur) {
    var ts = Utilities.formatDate(new Date(), 'Asia/Taipei', "yyyyMMdd_HHmmss");
    var parts = name.split('.'); var ext = parts.pop(); var stem = parts.join('.');
    name = stem + '_' + ts + '.' + ext; path = base + name;
  }
  return path;
}
function _ghPutBinary(conf, filepath, bytes, message, prevSha){
  var url = _ghApi('/repos/' + conf.owner + '/' + conf.repo + '/contents/' + encodeURI(filepath));
  var payload = {
    message: message || ('upload ' + filepath),
    content: Utilities.base64Encode(bytes),
    branch: conf.branch
  };
  if (prevSha) payload.sha = prevSha;
  var resp = UrlFetchApp.fetch(url, {
    method: 'put', muteHttpExceptions: true,
    headers: _ghHeaders(conf.token),
    payload: JSON.stringify(payload), contentType: 'application/json'
  });
  var code = resp.getResponseCode(); var text = resp.getContentText();
  if (code >= 200 && code < 300) return { ok:true, data: JSON.parse(text) };
  return { ok:false, message: 'GitHub PUT(binary) 失敗: ' + code + ' ' + text };
}
function _handleUploadImage(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message||'未授權');
  if (!_rateLimit('upload:'+ver.user, 20, 60)) return _badRequest('上傳過於頻繁');
  var du = body.dataUrl || '';
  var parsed = _parseDataUrl(du);
  if (!parsed) return _badRequest('資料格式錯誤');
  try { var sz = parsed.base64.length * 0.75; if (sz > 2*1024*1024) return _badRequest('檔案過大（>2MB）'); } catch(err){}
  var id = Utilities.getUuid();
  var filename = _safeFilename(body.filename || ('img_'+id+'.png'));
  _putImageRow({ id: id, filename: filename, mimetype: parsed.mimetype, base64: parsed.base64 });
  return _jsonOutput({ ok:true, id: id, filename: filename, mimetype: parsed.mimetype });
}
function _processImagesForPublish(conf, obj){
  // 深拷貝
  var data = JSON.parse(JSON.stringify(obj || {}));
  function replaceInProvider(p){
    // cases[].images
    if (Array.isArray(p.cases)){
      for (var i=0;i<p.cases.length;i++){
        var c = p.cases[i];
        if (Array.isArray(c.images)){
          for (var j=0;j<c.images.length;j++){
            var url = String(c.images[j]||'');
            var m = url.match(/^gas:\/\/image\/([A-Za-z0-9\-]+)\/(.+)$/);
            if (m){
              var img = _getImageById(m[1]);
              if (img && img.base64){
                var bytes = Utilities.base64Decode(img.base64);
                var path = _uniqueImagePath(conf, img.filename);
                var put = _ghPutBinary(conf, path, bytes, 'feat(image): upload '+img.filename);
                if (put && put.ok){
                  c.images[j] = path; _markImageCommitted(img.row, path, (put.data && put.data.content && put.data.content.sha) || '');
                }
              }
            }
          }
        }
      }
    }
    return p;
  }
  if (data && typeof data === 'object'){
    Object.keys(data).forEach(function(id){ data[id] = replaceInProvider(data[id]||{}); });
  }
  return { data: data, files: [] };
}
function _publishOneWithData(conf, key, dataObj){
  if (!ALLOWED_KEYS[key]) return { ok:false, key:key, message:'不允許的 key' };
  var filename = _datasetFilename(key);
  var path = conf.prefix.replace(/\/*$/, '/') + filename;
  var cur = _ghGetContent(conf, path);
  var sha = cur && cur.sha;
  var content = _formatDatasetContent(key, dataObj);
  var msg = 'chore(data): update ' + key + ' via GAS(savePublish)';
  var put = _ghPutContent(conf, path, content, msg, sha);
  if (!put.ok) return { ok:false, key:key, message: put.message };
  return { ok:true, key:key, path:path, sha:(put.data && put.data.content && put.data.content.sha) };
}
