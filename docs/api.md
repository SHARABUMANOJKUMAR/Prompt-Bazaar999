# PromptVerse API Documentation

This document lists and details all API endpoints provided by the PromptVerse backend.

---

## 1. Health and Status Endpoints

### Health Check
* **Endpoint:** `GET /health`
* **Authentication:** None
* **Description:** Simple endpoint for monitoring tools (like Render) to verify the service is active and running.
* **Request:** None
* **Response (JSON):**
  ```json
  {
    "status": "ok",
    "message": "Prompt Bazaar backend is running"
  }
  ```
* **Errors:** None

---

## 2. Authentication & Session Management

### Session Login
* **Endpoint:** `POST /api/sessionLogin`
* **Authentication:** None
* **Description:** Starts a server-side session for a logged-in user. Supports both manual logins (validated via GAS) and Google/Firebase authentication.
* **Request (JSON):**
  ```json
  {
    "isManual": true,
    "user": {
      "user_id": "USR10001",
      "email": "user@example.com",
      "username": "UserOne",
      "profile_picture": "https://example.com/avatar.jpg"
    }
  }
  ```
  *(or for Firebase)*
  ```json
  {
    "isManual": false,
    "idToken": "FIREBASE_ID_TOKEN",
    "user": {
      "uid": "FIREBASE_UID",
      "email": "user@example.com",
      "displayName": "User One",
      "photoURL": "https://example.com/avatar.jpg"
    }
  }
  ```
* **Response (JSON):**
  ```json
  {
    "status": "success"
  }
  ```
* **Errors:**
  * `400 Bad Request`: Missing user info or idToken when required.

### Session Logout
* **Endpoint:** `POST /api/sessionLogout`
* **Authentication:** None (Clears current session)
* **Description:** Standard endpoint to terminate the active user session.
* **Request:** None
* **Response (JSON):**
  ```json
  {
    "status": "success"
  }
  ```
* **Errors:** None

### Google Login Sync
* **Endpoint:** `POST /google-login`
* **Authentication:** None
* **Description:** Direct session provider mapper for Google OAuth flows.
* **Request (JSON):**
  ```json
  {
    "uid": "GOOGLE_UID",
    "name": "Google User",
    "email": "googleuser@gmail.com"
  }
  ```
* **Response (JSON):**
  ```json
  {
    "status": "success"
  }
  ```
* **Errors:**
  * `400 Bad Request`: Missing credentials (uid or email).

### Update Session Profile
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

---

## 3. User Management (Admin Only)

### Get All Users
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

### Edit User Details
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

### Delete User Account
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

---

## 4. Prompt Management Endpoints

### Get Public Prompts
* **Endpoint:** `GET /api/prompts`
* **Authentication:** None
* **Description:** Fetches and returns all public prompts from Google Apps Script. If Google Apps Script is offline, falls back to the in-memory prompts DB.
* **Request:** None
* **Response (JSON):**
  ```json
  [
    {
      "prompt_id": "PRM1001",
      "title": "Creative Writing Assistant",
      "category": "Writing",
      "platform": "ChatGPT",
      "price": 2,
      "image_url": "https://example.com/prompt.jpg",
      "prompt_text": "Write a compelling story about..."
    }
  ]
  ```
* **Errors:** None

### Add New Prompt
* **Endpoint:** `POST /api/admin/add-prompt`
* **Authentication:** None (or Admin Session validation optional)
* **Description:** Submits a new prompt to Google Apps Script and updates the server-side in-memory cache database.
* **Request (Form Data / Multipart):**
  * `title`: Title of the prompt.
  * `category`: E.g. "Coding", "Writing".
  * `platform`: E.g. "ChatGPT", "Midjourney".
  * `price`: Numeric price of the prompt.
  * `image_url`: Image representation URL.
  * `prompt_text`: The actual prompt content.
* **Response (JSON):**
  ```json
  {
    "success": true,
    "message": "Prompt added successfully",
    "prompt_id": "PRM1002"
  }
  ```
* **Errors:**
  * `400 Bad Request`: Image URL is required.
  * `500 Internal Server Error`: GAS sync or parsing failed.

### Get Local Cached Prompts
* **Endpoint:** `GET /api/admin/prompts`
* **Authentication:** Required (Admin Session)
* **Description:** Returns the local in-memory array database containing newly added and active prompts.
* **Request:** None
* **Response (JSON):**
  ```json
  {
    "prompts": [
      {
        "id": "76509dfe",
        "title": "Creative Writing Assistant",
        "category": "Writing",
        "platform": "ChatGPT",
        "price": 2,
        "image_url": "https://example.com/prompt.jpg",
        "prompt_text": "Write a compelling story about..."
      }
    ]
  }
  ```
* **Errors:** None

### Delete Prompt
* **Endpoint:** `DELETE /api/admin/prompts/<prompt_id>`
* **Authentication:** Required (Admin Session)
* **Description:** Triggers prompt deletion from Google Apps Script and filters it out of the local in-memory array database.
* **Request:** None
* **Response (JSON):**
  ```json
  {
    "status": "success"
  }
  ```
* **Errors:**
  * `400 Bad Request`: Google Apps Script API returned failure.
  * `500 Internal Server Error`: Network exception occurred.

### Report Prompt
* **Endpoint:** `POST /api/report-prompt`
* **Authentication:** None
* **Description:** Forwards user reports concerning specific prompts to Google Apps Script.
* **Request (JSON):**
  ```json
  {
    "prompt_id": "PRM1001",
    "user_name": "Reporter Name",
    "user_email": "reporter@example.com",
    "reason": "Inappropriate Content",
    "details": "The prompt contains offensive elements..."
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true,
    "message": "Report submitted successfully."
  }
  ```
* **Errors:**
  * `500 Internal Server Error`: Submission to GAS failed.

---

## 5. Payment & Purchase Endpoints

### Create Razorpay Order
* **Endpoint:** `POST /create-order`
* **Authentication:** None
* **Description:** Generates a secure, signed Razorpay Order ID for frontend checkout.
* **Request (JSON):**
  ```json
  {
    "prompt_id": "PRM1001",
    "title": "Creative Writing Assistant",
    "price": 2
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true,
    "order_id": "order_OkS7629ahsuH",
    "amount": 200,
    "currency": "INR",
    "key": "rzp_test_YOUR_KEY"
  }
  ```
* **Errors:**
  * `500 Internal Server Error`: Razorpay credentials missing or initialization/API failed.

### Verify Razorpay Payment
* **Endpoint:** `POST /verify-payment`
* **Authentication:** None (Session user mapping is performed if present)
* **Description:** Validates the signature sent from Razorpay upon successful checkout, logs the transaction in the Google Sheets database, and saves the purchase to the local JSON file.
* **Request (JSON):**
  ```json
  {
    "razorpay_payment_id": "pay_xyz123",
    "razorpay_order_id": "order_abc789",
    "razorpay_signature": "sha256_sig_here",
    "prompt_id": "PRM1001",
    "title": "Creative Writing Assistant",
    "price": 2,
    "prompt_text": "Write a compelling story about...",
    "image_url": "https://example.com/prompt.jpg",
    "user": {
      "uid": "USR10001",
      "email": "user@example.com"
    }
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true,
    "message": "Payment successful."
  }
  ```
* **Errors:**
  * `400 Bad Request`: Razorpay signature verification failed.
  * `500 Internal Server Error`: Saving to JSON or database logging exception occurred.

### Get User Purchases
* **Endpoint:** `GET /api/user/purchases`
* **Authentication:** None (Supports `uid` query parameter or active session)
* **Description:** Fetches all purchased prompt records associated with a specific user account.
* **Request (Query Params):**
* `uid`: Unique user identifier (e.g. `/api/user/purchases?uid=USR10001`).
* **Response (JSON):**
  ```json
  [
    {
      "prompt_id": "PRM1001",
      "title": "Creative Writing Assistant",
      "price": 2,
      "payment_id": "pay_xyz123",
      "order_id": "order_abc789",
      "date": "2026-05-17 18:30:00",
      "prompt_text": "Write a compelling story about...",
      "image_url": "https://example.com/prompt.jpg"
    }
  ]
  ```
* **Errors:** None

---

## 6. Real-Time Web Push Notification Endpoints

### Send Push Notification Alert
* **Endpoint:** `POST /send-notification`
* **Authentication:** None (Internal admin dashboard authorization suggested)
* **Description:** Fetches all subscribed browser FCM registration tokens from the Firestore `notification_tokens` collection, constructs a web-optimized multicast push message payload, and broadcasts it in real time using the Firebase Admin SDK. Automatically sweeps and purges any inactive or unregistered tokens from Firestore during execution.
* **Request (JSON):**
  ```json
  {
    "title": "Cinematic Hero Portrait",
    "price": "9",
    "image_url": "https://lh3.googleusercontent.com/d/1xX_YyY",
    "prompt_id": "PRM1002"
  }
  ```
* **Response (JSON):**
  ```json
  {
    "success": true,
    "message": "Successfully broadcasted to 4 active devices.",
    "sent_count": 4,
    "failure_count": 1,
    "cleaned_invalid_tokens": 1
  }
  ```
* **Errors:**
  * `500 Internal Server Error`: Firebase Admin SDK or Firestore database connection has not been initialized on the backend container, or connection/credentials verification failed.

