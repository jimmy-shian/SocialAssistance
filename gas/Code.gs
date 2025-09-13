// Google Apps Script backend for SocialAssistance data management
// Exposes actions via Web App:
// GET  ?action=version                  -> { ok:true, versions:{ aboutContent: n, providers: n, siteContent: n } }
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
  TOKEN_TTL_MS: 24 * 60 * 60 * 1000 // 24h
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

function _signToken(username, ts){
  var secret = _getPropOrDefault(CFG.PROP_TOKEN_SECRET, 'PLEASE_CHANGE');
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
  var adminU = _getPropOrDefault(CFG.PROP_ADMIN_USER, 'admin');
  var adminP = _getPropOrDefault(CFG.PROP_ADMIN_PASS, 'admin123');
  if (u !== adminU || p !== adminP) return _badRequest('帳號或密碼不正確');
  var ts = Date.now();
  var token = _signToken(u, ts);
  return _jsonOutput({ ok:true, token: token, exp: ts + CFG.TOKEN_TTL_MS });
}

function _handleData(e){
  var key = (e && e.parameter && e.parameter.key) || '';
  if (!key) return _badRequest('缺少 key');
  var ds = _getDataset(key);
  var v = (e && e.parameter && e.parameter.v);
  if (v != null && String(v) === String(ds.version)) {
    // Client already has this version, avoid sending payload
    return _jsonOutput({ ok:true, key: key, version: ds.version, notModified: true });
  }
  return _jsonOutput({ ok:true, key: key, version: ds.version, data: ds.data });
}

function _handleUpdate(e){
  var body = _getBodyObject(e);
  var token = body.token || '';
  var ver = _verifyToken(token);
  if (!ver.ok) return _badRequest(ver.message || '未授權');
  var key = body.key || '';
  if (!key) return _badRequest('缺少 key');
  var data = body.data;
  if (typeof data === 'undefined') return _badRequest('缺少 data');
  var r = _setDataset(key, data);
  return _jsonOutput({ ok:true, key: key, version: r.version });
}

function _handleVersion(){
  var map = _getAllVersions();
  return _jsonOutput({ ok:true, versions: map });
}

function doGet(e){
  var action = (e && e.parameter && e.parameter.action) || 'data';
  if (action === 'version') return _handleVersion(e);
  if (action === 'data') return _handleData(e);
  return _badRequest('未知 action');
}

function doPost(e){
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'login') return _handleLogin(e);
  if (action === 'update') return _handleUpdate(e);
  return _badRequest('未知 action');
}
