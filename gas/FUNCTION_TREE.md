# GAS Program Function Tree

## Admin Data Flow

- `doPost(e)`
  - `action=login` -> `_handleLogin(e)`
    - `_getBodyObject(e)`
    - `_requireConfigured()`
    - `_signToken(username, ts)`
  - `action=read` -> `_handleRead(e)`
    - `_getBodyObject(e)`
    - `_verifyToken(token)`
    - `_normalizeDatasetKey(key)`
    - `_getDataset(key)`
  - `action=update` -> `_handleUpdate(e)`
    - `_getBodyObject(e)`
    - `_verifyToken(token)`
    - `_normalizeDatasetKey(key)`
    - `_setDataset(key, data)`
  - `action=savePublish` -> `_handleSavePublish(e)`
    - `_getBodyObject(e)`
    - `_verifyToken(token)`
    - `_normalizeDatasetKey(key)`
    - `_setDataset(key, data)`
    - `_processImagesForPublish(conf, data)`
    - `_publishOneWithData(conf, key, data)`
    - `_clearDataset(key)` only after publish success
  - `action=publish` -> `_handlePublish(e)`
    - `_verifyToken(token)`
    - `_normalizeDatasetKeys(keys)`
    - `_getDataset(key)`
    - `_processImagesForPublish(conf, data)`
    - `_publishOneWithData(conf, key, data)`

## Dataset Keys

- Canonical keys:
  - `aboutContent`
  - `providers`
  - `siteContent`
  - `blogContent`
  - `servicesContent`
- Accepted aliases:
  - `about` -> `aboutContent`
  - `site` -> `siteContent`
  - `providersData` -> `providers`
  - `blog` -> `blogContent`
  - `services` -> `servicesContent`

## Storage And Publish

- Draft storage: Google Sheet `datasets`, columns `[key, json, version, updatedAt]`.
- Published files:
  - `aboutContent` -> `js/data/aboutContent.js` with `window.aboutContent`
  - `providers` -> `js/data/providers.js` with `window.providersData`
  - `siteContent` -> `js/data/siteContent.js` with `window.siteContent`
  - `blogContent` -> `js/data/blogContent.js` with `window.blogContent`
  - `servicesContent` -> `js/data/servicesContent.js` with `window.servicesContent`

## Common Failure Points

- `不允許的 key`: frontend sent an alias or unknown dataset key. Use `_normalizeDatasetKey` before validation.
- `缺少 token`: frontend did not store `admin_token`, token expired, or request body was not parsed.
- Wrong homepage display: `siteContent` was overwritten without preserving existing nested fields.
