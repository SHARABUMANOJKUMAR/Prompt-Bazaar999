# PromptVerse API Documentation

## User Management Endpoints

### 1. Get All Users
* **Endpoint:** `GET /api/admin/users`
* **Authentication:** Required (Admin Session)
* **Description:** Downloads the user master database from Google Sheets CSV, parses it dynamically on the server, applies any locally edited properties, filters out deleted users, and returns the sanitized list.
* **Request:** None
* **Response (JSON):**
  ```json
  [
    {
      "user_id": "USR1778924737412",
      "full_name": "Sharabu Manoj Kumar",
      "email": "sharabumanojachari@gmail.com",
      "mobile_number": "N/A",
      "login_provider": "Google",
      "created_at": "2026-05-16T15:15:00Z",
      "last_login": "2026-05-16T15:15:00Z",
      "account_status": "Active"
    }
  ]
  ```
* **Errors:**
  * `500 Internal Server Error`: Returned if fetching or parsing the database CSV fails.

### 2. Edit User Details
* **Endpoint:** `POST /api/admin/users/edit`
* **Authentication:** Required (Admin Session)
* **Description:** Persists updated properties for a specific user to local server storage and fires a background sheet synchronization payload to update Google Sheets.
* **Request (JSON):**
  ```json
  {
    "user_id": "USR1778924737412",
    "full_name": "Sharabu Manoj Kumar - Admin",
    "email": "sharabumanojachari@gmail.com",
    "mobile_number": "+91 9999999999",
    "login_provider": "Google",
    "account_status": "Suspended"
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true
  }
  ```
* **Errors:**
  * `400 Bad Request`: Returned if `user_id` is missing in the payload.
  * `500 Internal Server Error`: Returned if server file-write fails.

### 3. Delete User Account
* **Endpoint:** `DELETE /api/admin/users/delete/<user_id>`
* **Authentication:** Required (Admin Session)
* **Description:** Adds a user's ID to the persistent server-side deletion index, permanently excluding them from the returned directory lists.
* **Request:** None
* **Response (JSON):**
  ```json
  {
    "success": true
  }
  ```
* **Errors:**
  * `500 Internal Server Error`: Returned if server file-write fails.

### 4. Update Profile Session context
* **Endpoint:** `POST /api/session/update`
* **Authentication:** Required (User/Admin Session)
* **Description:** Updates the session-stored user details (display name and avatar photoURL) dynamically on the backend. This ensures the header/navbar and other templates show the correct updated details instantly.
* **Request (JSON):**
  ```json
  {
    "displayName": "Sharabu Manoj Kumar",
    "photoURL": "https://drive.google.com/uc?export=view&id=1xX_YyY"
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true
  }
  ```
* **Errors:**
  * `401 Unauthorized`: Session not initialized.
