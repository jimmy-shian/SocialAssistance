/**
 * wix/media-upload.js
 * Wix Media 上傳模組
 * 
 * [功能說明]
 * - 圖片上傳到 Wix Media Manager
 * - 取得 Wix CDN URL
 * 
 * [部署方式]
 * 將此檔案放置於 Wix 網站後端的「Backend Web Modules」中
 */

import { mediaManager } from 'wix-media-manager';
import { Buffer } from 'buffer';

// ==================== 圖片上傳 ====================

/**
 * 上傳圖片到 Wix Media
 * @param {string} base64Data - base64 編碼的圖片資料（不含 data:image/xxx;base64, 前綴）
 * @param {string} filename - 檔案名稱
 * @param {object} options - 額外選項
 * @returns {Promise<object>} - { ok, id, filename, url, message }
 */
export async function uploadToWixMedia(base64Data, filename, options = {}) {
  try {
    // 解碼 base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 判斷 MIME type
    const mimeType = getMimeTypeFromFilename(filename);
    
    // 設定檔案路徑
    const mediaPath = `social-assistance/${Date.now()}_${filename}`;
    
    // 使用 Wix Media Manager 上傳
    const result = await mediaManager.upload(
      mediaPath,
      buffer,
      {
        mimeType: mimeType,
        metadata: {
          description: options.description || '',
          tags: options.tags || []
        }
      }
    );
    
    // 取得 CDN URL
    const fileUrl = result.fileUrl || result.url;
    
    return {
      ok: true,
      id: result.mediaId || result.id,
      filename: filename,
      url: fileUrl,
      message: '上傳成功'
    };
  } catch (error) {
    console.error('Wix Media upload error:', error);
    return {
      ok: false,
      message: '上傳失敗: ' + (error.message || '未知錯誤')
    };
  }
}

/**
 * 上傳 Data URL 格式的圖片
 * @param {string} dataUrl - 完整的 data URL（包含 data:image/xxx;base64, 前綴）
 * @param {string} filename - 檔案名稱
 * @returns {Promise<object>}
 */
export async function uploadDataUrlToWixMedia(dataUrl, filename) {
  try {
    // 解析 data URL
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return {
        ok: false,
        message: '無效的 Data URL 格式'
      };
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // 上傳到 Wix Media
    return await uploadToWixMedia(base64Data, filename, {
      mimeType: mimeType
    });
  } catch (error) {
    console.error('Wix Media dataUrl upload error:', error);
    return {
      ok: false,
      message: '上傳失敗: ' + (error.message || '未知錯誤')
    };
  }
}

// ==================== 圖片刪除 ====================

/**
 * 刪除 Wix Media 中的檔案
 * @param {string} mediaId - 檔案的 media ID
 * @returns {Promise<object>}
 */
export async function deleteFromWixMedia(mediaId) {
  try {
    await mediaManager.deleteFile(mediaId);
    return {
      ok: true,
      message: '刪除成功'
    };
  } catch (error) {
    console.error('Wix Media delete error:', error);
    return {
      ok: false,
      message: '刪除失敗: ' + (error.message || '未知錯誤')
    };
  }
}

// ==================== 輔助函數 ====================

function getMimeTypeFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function isValidWixUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('media.wixapps.net') || 
         url.includes('static.wixstatic.com') ||
         url.includes('siteassets.files.wix.com');
}

export default {
  uploadToWixMedia,
  uploadDataUrlToWixMedia,
  deleteFromWixMedia,
  isValidWixUrl
};