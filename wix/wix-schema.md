# Wix 資料庫架構 (Database Schema)

為了支援 SocialAssistance 後端遷移，您需要在 Wix 內容管理員 (CMS) 中建立以下 **資料集 (Collections)**。

## 1. 資料集名稱：`Members` (建議 ID: `SocialUsers`)
*描述：儲存使用者驗證資料。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 使用者名稱 (Username) | `username` | 文字 (Text) | **主要欄位**。唯一識別碼。 |
| Email | `email` | 文字 (Text) | |
| 密碼雜湊 (Password Hash) | `passHash` | 文字 (Text) | 密碼 + 密鑰的 SHA-256 雜湊值。 |
| 角色 (Role) | `role` | 文字 (Text) | 'member' (會員) 或 'admin' (管理員)。 |
| 建立時間 (Created At) | `createdAt` | 日期與時間 (Date) | |
| Token 密鑰 | `tokenSecret` | 文字 (Text) | (選填) 若每個使用者有獨立密鑰；目前系統使用全域密鑰。 |
| 重設代碼 | `resetCode` | 文字 (Text) | (新增) 忘記密碼時的驗證碼。 |
| 代碼過期時間 | `resetCodeExp` | 日期與時間 (Date) | (新增) 驗證碼的有效期限。 |

> **注意**：Wix 內建有 "Members" 資料集，但為了完全對應原 GAS 的邏輯 (自訂驗證系統) 且不與 Wix 原生會員系統衝突，我們使用自訂資料集 `SocialUsers`。
> **建議資料集 ID (Collection ID)**：**`SocialUsers`**

## 2. 資料集名稱：`Profiles`
*描述：儲存使用者個人資料的 JSON 字串。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 使用者名稱 (Username) | `username` | 文字 (Text) | 對應 `SocialUsers.username`。 |
| 個人資料 (Profile Data) | `json` | 文字 (Text) | stringified JSON 物件。 |
| 更新時間 (Updated At) | `updatedAt` | 日期與時間 (Date) | |

**建議資料集 ID (Collection ID)**：**`Profiles`**

## 3. 資料集名稱：`Datasets`
*描述：儲存網站內容 (關於我們、服務提供者等)。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 鍵值 (Key) | `key` | 文字 (Text) | 例如：'aboutContent', 'providers'。 |
| JSON 資料 | `json` | 文字 (Text) | stringified JSON 物件。 |
| 版本 (Version) | `version` | 數字 (Number) | 每次更新遞增。 |
| 更新時間 (Updated At) | `updatedAt` | 日期與時間 (Date) | |

**建議資料集 ID (Collection ID)**：**`Datasets`**

## 4. 資料集名稱：`Images`
*描述：儲存上傳圖片的 metadata 與 Base64 資料。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 圖片 ID (Image ID) | `imageId` | 文字 (Text) | UUID。 |
| 檔名 (Filename) | `filename` | 文字 (Text) | |
| Mime Type | `mimetype` | 文字 (Text) | |
| Base64 | `base64` | 文字 (Text) | **注意**：Wix 文字欄位有大小限制，若圖片過大建議改用 Wix Media Manager，但為求遷移方便先維持此欄位。 |

**建議資料集 ID (Collection ID)**：**`UploadedImages`**

## 5. 資料集名稱：`Questionnaires`
*描述：儲存問卷定義 (題目與設定)。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 問卷標題 (Title) | `title` | 文字 (Text) | |
| 狀態 (Status) | `status` | 文字 (Text) | 'active' (進行中) 或 'closed' (已關閉)。 |
| 題目定義 (Items) | `items` | 文字 (Text) | JSON 字串 array (例如 `[{id:1, type:'text', question:'...'}]`)。 |
| 建立時間 (Created At) | `createdAt` | 日期與時間 (Date) | |

**建議資料集 ID (Collection ID)**：**`Questionnaires`**

## 6. 資料集名稱：`QuestionnaireResponses`
*描述：儲存學員的問卷填寫結果。*

| 欄位名稱 (Field Name) | 欄位鍵值 (Field Key) | 欄位類型 (Field Type) | 備註 |
| :--- | :--- | :--- | :--- |
| 問卷 ID (Questionnaire ID) | `questionnaireId` | 文字 (Text) | 關聯到 `Questionnaires`。 |
| 學員帳號 (Username) | `username` | 文字 (Text) | |
| 回答內容 (Answers) | `answers` | 文字 (Text) | JSON 字串 (例如 `{"q1": "yes"}`)。 |
| 提交時間 (Submitted At) | `submittedAt` | 日期與時間 (Date) | |

**建議資料集 ID (Collection ID)**：**`QuestionnaireResponses`**
