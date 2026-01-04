
import wixData from 'wix-data';

// Collection Names (Must match Schema)
const COL_USERS = 'SocialUsers';
const COL_PROFILES = 'Profiles';
const COL_DATASETS = 'Datasets';
const COL_IMAGES = 'UploadedImages';

// ==========================================
// User / Auth Helpers
// ==========================================

export async function getUser(identifier) {
    try {
        const results = await wixData.query(COL_USERS)
            .eq('username', identifier)
            .or(wixData.query(COL_USERS).eq('email', identifier))
            .limit(1)
            .find({ suppressAuth: true });
        if (results.items.length > 0) return results.items[0];
        return null;
    } catch (error) {
        console.error('getUser Error:', error);
        return null;
    }
}

export async function getUserByEmail(email) {
    try {
        const results = await wixData.query(COL_USERS)
            .eq('email', email)
            .limit(1)
            .find({ suppressAuth: true });
        if (results.items.length > 0) return results.items[0];
        return null;
    } catch (error) {
        console.error('getUserByEmail Error:', error);
        return null;
    }
}

export async function upsertUser(userObj) {
    // userObj: { username, email, passHash, role }
    try {
        const existing = await getUser(userObj.username);
        let toSave = { ...userObj };

        if (existing) {
            toSave._id = existing._id; // Keep strict ID for update
            // Preserve creation date if not provided
            if (!toSave.createdAt) toSave.createdAt = existing.createdAt;
            // Preserve existing reset code info if not intentionally overwriting
            if (existing.resetCode && !toSave.resetCode) {
                toSave.resetCode = existing.resetCode;
                toSave.resetCodeExp = existing.resetCodeExp;
            }
        } else {
            toSave.createdAt = new Date();
        }

        // Ensure role
        if (!toSave.role) toSave.role = 'member';

        return await wixData.save(COL_USERS, toSave, { suppressAuth: true });
    } catch (error) {
        console.error('upsertUser Error:', error);
        throw error;
    }
}

export async function saveResetCode(username, code) {
    try {
        const user = await getUser(username);
        if (!user) return false;

        user.resetCode = code;
        // Expire in 30 minutes
        user.resetCodeExp = new Date(Date.now() + 30 * 60 * 1000);

        await wixData.save(COL_USERS, user, { suppressAuth: true });
        return true;
    } catch (e) {
        console.error('saveResetCode Error:', e);
        return false;
    }
}

export async function verifyAndClearResetCode(code) {
    try {
        // Query users with this code
        const results = await wixData.query(COL_USERS)
            .eq('resetCode', code)
            .limit(1)
            .find({ suppressAuth: true });

        if (results.items.length === 0) return null;

        const user = results.items[0];
        const now = new Date();

        if (!user.resetCodeExp || new Date(user.resetCodeExp) < now) {
            return null; // Expired
        }

        // Valid, return username
        // Optionally clear it here, or let caller handle password reset then clear
        // But usually "confirmReset" action just validates.
        // Let's return the user.
        return user;
    } catch (e) {
        return null;
    }
}

// ==========================================
// Profile Helpers
// ==========================================

export async function getProfile(username) {
    try {
        const results = await wixData.query(COL_PROFILES)
            .eq('username', username)
            .limit(1)
            .find({ suppressAuth: true });

        if (results.items.length > 0) {
            const item = results.items[0];
            let profileObj = {};
            try { profileObj = JSON.parse(item.json); } catch (e) { }
            return { username, profile: profileObj, updatedAt: item._updatedDate };
        }

        // Return default structure if not found
        return {
            username: username,
            profile: {
                username: username,
                basic: {},
                selfEvaluation: {},
                activities: [],
                learningRecords: []
            },
            updatedAt: null
        };
    } catch (error) {
        console.error('getProfile Error:', error);
        throw error;
    }
}

export async function setProfile(username, profileObj) {
    try {
        const results = await wixData.query(COL_PROFILES)
            .eq('username', username)
            .limit(1)
            .find({ suppressAuth: true });

        let toSave = {
            username: username,
            json: JSON.stringify(profileObj || {})
        };

        if (results.items.length > 0) {
            toSave._id = results.items[0]._id;
        }

        await wixData.save(COL_PROFILES, toSave, { suppressAuth: true });
        return true;
    } catch (error) {
        console.error('setProfile Error:', error);
        throw error;
    }
}

// ==========================================
// Dataset Helpers
// ==========================================

export async function getDataset(key) {
    try {
        const results = await wixData.query(COL_DATASETS)
            .eq('key', key)
            .limit(1)
            .find({ suppressAuth: true });

        if (results.items.length > 0) {
            const item = results.items[0];
            let data = {};
            try { data = JSON.parse(item.json); } catch (e) { }
            return { key, data, version: item.version, updatedAt: item._updatedDate };
        }

        return { key, data: {}, version: 0, updatedAt: new Date() };
    } catch (error) {
        console.error('getDataset Error:', error);
        throw error;
    }
}

export async function setDataset(key, dataObj) {
    try {
        const results = await wixData.query(COL_DATASETS)
            .eq('key', key)
            .limit(1)
            .find({ suppressAuth: true });

        let version = 1;
        let toSave = {
            key: key,
            json: JSON.stringify(dataObj || {}),
            version: 1
        };

        if (results.items.length > 0) {
            toSave._id = results.items[0]._id;
            version = (results.items[0].version || 0) + 1;
            toSave.version = version;
        }

        await wixData.save(COL_DATASETS, toSave, { suppressAuth: true });
        return { key, version };
    } catch (error) {
        console.error('setDataset Error:', error);
        throw error;
    }
}

// ==========================================
// Crypto / Auth Helpers (no Node 'crypto' in Velo)
// ==========================================

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function hashPassword(password) {
    if (!password) return '';
    // Lightweight non-crypto hash to stay compatible in Velo backend.
    // Consider migrating to wix-secrets + a stronger approach if needed.
    return simpleHash(password + '|THE_SALT_2024');
}

export function checkPassword(password, hash) {
    if (!password || !hash) return false;
    return hashPassword(password) === hash;
}

// Aliases for compatibility with http-functions
export const findUserByUsername = getUser;
export const createUser = upsertUser;
export const verifyResetCode = verifyAndClearResetCode;
export const loadDataset = getDataset;
export const saveDataset = setDataset;
export const DATASETS_COLL = COL_DATASETS;

// findUserByToken implies decoding token then finding. 
// http-functions handles decoding (verifyToken). 
// If it needs strict DB check by ID, valid usage differs, 
// but based on http-functions usage verifyToken returns payload, 
// then uses findUserByUsername. So verifyToken is sufficient usually.
// We can export a dummy or ignore if removed from imports.

// ==========================================
// Image Helpers
// ==========================================

export async function saveImage(imgData) {
    // imgData: { id, filename, mimetype, base64 }
    try {
        await wixData.insert(COL_IMAGES, {
            imageId: imgData.id,
            filename: imgData.filename,
            mimetype: imgData.mimetype,
            base64: imgData.base64,
            createdAt: new Date()
        }, { suppressAuth: true });
        return true;
    } catch (error) {
        console.error('saveImage Error:', error);
        throw error;
    }
}

export async function getImageById(id) {
    try {
        const results = await wixData.query(COL_IMAGES)
            .eq('imageId', id)
            .limit(1)
            .find({ suppressAuth: true });
        if (results.items.length > 0) return results.items[0];
        return null;
    } catch (error) {
        return null;
    }
}
