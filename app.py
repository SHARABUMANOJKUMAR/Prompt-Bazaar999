import os
from flask import Flask, render_template, request, session, redirect, url_for, jsonify, send_from_directory
from functools import wraps
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from utils.drive import upload_file_to_drive

load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore, messaging
import json
import uuid

# Global Firestore DB reference & local portfolio cache
firebase_db = None
PORTFOLIO_CACHE = {}

# Resilient Firebase Admin Initialization
try:
    if not firebase_admin._apps:
        # 1. Try to load custom service account JSON file from environment path
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized with service account file")
        elif os.path.exists("firebase-adminsdk.json"):
            cred = credentials.Certificate("firebase-adminsdk.json")
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized with local firebase-adminsdk.json")
        else:
            # 2. Try to parse service account JSON from direct env string
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS") or os.getenv("FIREBASE_ADMIN_SDK_JSON")
            if sa_json:
                cred_dict = json.loads(sa_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin initialized with environment JSON credentials")
            else:
                # 3. Fallback to default application credentials
                firebase_admin.initialize_app()
                print("Firebase Admin initialized with default credentials")
    
    # Initialize Firestore client
    firebase_db = firestore.client()
    print("Firestore DB client connected successfully!")
except Exception as e:
    print(f"WARNING: Firebase Admin SDK initialization failed: {e}. The app will continue, but push notifications will run in mock/no-op mode until credentials are set.")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev_key')

# ── Enterprise Security & Performance Layer ─────────────────────────────
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB payload limit

import logging
logging.basicConfig(level=logging.INFO)

# Security Shield — input scanning + hardened headers
try:
    from services.security.shield import SecurityShieldMiddleware
    security_shield = SecurityShieldMiddleware(app)
    logging.info("SecurityShieldMiddleware ACTIVE")
except Exception as e:
    security_shield = None
    logging.warning("SecurityShieldMiddleware could not be loaded: %s", e)

# High-Concurrency Cache — 100K keys, 5-min TTL
try:
    from services.security.cache_manager import HighConcurrencyCache
    app_cache = HighConcurrencyCache(max_keys=100_000, default_ttl=300.0)
    logging.info("HighConcurrencyCache ACTIVE (100K keys, 300s TTL)")
except Exception as e:
    app_cache = None
    logging.warning("HighConcurrencyCache could not be loaded: %s", e)

# Rate Limiter — 60 burst/IP, 5000 global RPS, auto-ban after 500 violations
try:
    from services.security.rate_limiter import RateLimiter
    rate_limiter = RateLimiter(
        per_ip_capacity=60.0,
        per_ip_refill_rate=10.0,
        global_rps_limit=5000.0,
        ban_threshold=500,
        ban_duration=300.0,
    )
    logging.info("RateLimiter ACTIVE (60 burst/IP, 5000 global RPS)")
except Exception as e:
    rate_limiter = None
    logging.warning("RateLimiter could not be loaded: %s", e)


@app.before_request
def handle_options_preflight():
    # Rate-limit check (skip OPTIONS preflight)
    if request.method != 'OPTIONS' and rate_limiter is not None:
        allowed, retry_after = rate_limiter.check(request.remote_addr or '127.0.0.1')
        if not allowed:
            resp = jsonify({"error": "Rate limit exceeded. Please slow down.", "retry_after": round(retry_after, 1)})
            resp.status_code = 429
            resp.headers['Retry-After'] = str(int(retry_after) + 1)
            return resp

    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        origin = request.headers.get('Origin')
        allowed_origins = [
            "https://promptbazzar.netlify.app",
            "http://localhost:5000", 
            "http://127.0.0.1:5000"
        ]
        if not origin or origin not in allowed_origins:
            origin = "https://promptbazzar.netlify.app"
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "https://promptbazzar.netlify.app",
        "http://localhost:5000", 
        "http://127.0.0.1:5000"
    ]
    if not origin or origin not in allowed_origins:
        origin = "https://promptbazzar.netlify.app"
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

UPLOAD_FOLDER = 'static/uploads'
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
except Exception as e:
    print(f"WARNING: Could not create upload folder {UPLOAD_FOLDER}: {e}")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Configuration ---
GAS_URL = "https://script.google.com/macros/s/AKfycbx17A9cGKQk70Uf1ysoYqBjjBxfDcyMywNtA7-PaAflmff_hFp9C3mQjS4K7qZk_Wsb/exec"

# --- Middleware / Decorators ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_firebase_config():
    return dict(firebase_config={
        'apiKey': os.getenv('FIREBASE_API_KEY', ''),
        'authDomain': os.getenv('FIREBASE_AUTH_DOMAIN', ''),
        'projectId': os.getenv('FIREBASE_PROJECT_ID', ''),
        'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', ''),
        'messagingSenderId': os.getenv('FIREBASE_MESSAGING_SENDER_ID', ''),
        'appId': os.getenv('FIREBASE_APP_ID', '')
    })

# --- Routes ---
@app.route('/')
def landing():
    if 'user' in session:
        return redirect(url_for('index'))
    return render_template('landing.html')

@app.route('/gallery')
def index():
    user = session.get('user')
    return render_template('index.html', user=user)

@app.route('/academy')
def academy():
    user = session.get('user')
    return render_template('academy.html', user=user)

@app.route('/academy/module1')
def academy_module1():
    user = session.get('user')
    return render_template('module1.html', user=user)

@app.route('/academy/module2')
def academy_module2():
    user = session.get('user')
    return render_template('module2.html', user=user)

@app.route('/academy/module3')
def academy_module3():
    user = session.get('user')
    return render_template('module3.html', user=user)

@app.route('/academy/module4')
def academy_module4():
    user = session.get('user')
    return render_template('module4.html', user=user)

@app.route('/academy/module5')
def academy_module5():
    user = session.get('user')
    return render_template('module5.html', user=user)

@app.route('/academy/module6')
def academy_module6():
    user = session.get('user')
    return render_template('module6.html', user=user)

@app.route('/academy/module7')
def academy_module7():
    user = session.get('user')
    return render_template('module7.html', user=user)

@app.route('/academy/module8')
def academy_module8():
    user = session.get('user')
    return render_template('module8.html', user=user)

@app.route('/academy/module9')
def academy_module9():
    user = session.get('user')
    return render_template('module9.html', user=user)

@app.route('/academy/module10')
def academy_module10():
    user = session.get('user')
    return render_template('module10.html', user=user)

@app.route('/academy/module11')
def academy_module11():
    user = session.get('user')
    return render_template('module11.html', user=user)

@app.route('/academy/module12')
def academy_module12():
    user = session.get('user')
    return render_template('module12.html', user=user)

@app.route('/academy/module13')
def academy_module13():
    user = session.get('user')
    return render_template('module13.html', user=user)

@app.route('/academy/module14')
def academy_module14():
    user = session.get('user')
    return render_template('module14.html', user=user)

@app.route('/academy/module15')
def academy_module15():
    user = session.get('user')
    return render_template('module15.html', user=user)

@app.route('/academy/module16')
def academy_module16():
    user = session.get('user')
    return render_template('module16.html', user=user)

@app.route('/academy/module17')
def academy_module17():
    user = session.get('user')
    return render_template('module17.html', user=user)

@app.route('/signup')
def signup():
    if 'user' in session:
        return redirect(url_for('index'))
    return render_template('signup.html')

@app.route("/health")
def health():
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    gas_url = os.getenv("PAYMENT_GAS_URL", "")
    
    return jsonify({
        "status": "ok",
        "message": "Prompt Bazaar backend is running",
        "razorpay_initialized": razorpay_client is not None,
        "key_id_preview": f"{key_id[:8]}...{key_id[-4:]}" if len(key_id) > 12 else "INVALID",
        "key_secret_preview": f"{key_secret[:4]}...{key_secret[-3:]}" if len(key_secret) > 8 else "INVALID",
        "gas_url_preview": f"{gas_url[:20]}...{gas_url[-10:]}" if len(gas_url) > 30 else "INVALID"
    }), 200

@app.route('/login')
def login():
    if 'user' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/success')
def success_page():
    return render_template('success.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

@app.route('/tools')
def tools():
    user = session.get('user')
    return render_template('tools.html', user=user)

@app.route('/profile')
def profile():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='account')

@app.route('/wishlist')
def wishlist():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='wishlist')

@app.route('/payments')
def payments():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='payments')

@app.route('/portfolio-viewer')
@app.route('/portfolio-viewer.html')
@app.route('/p/<path:username>')
@app.route('/u/<path:username>')
@app.route('/portfolio/<path:username>')
def portfolio_viewer(username=None):
    template_path = os.path.join(app.root_path, 'templates', 'portfolio-viewer.html')
    if os.path.exists(template_path):
        return render_template('portfolio-viewer.html')
    return send_from_directory(app.root_path, 'portfolio-viewer.html')



# --- API Routes for Authentication Session Management ---
@app.route('/api/sessionLogin', methods=['POST'])
def session_login():
    data = request.get_json()
    is_manual = data.get('isManual', False)
    user_info = data.get('user')
    
    if not user_info:
        return jsonify({'error': 'Missing user info'}), 400
        
    if is_manual:
        # Manual Login - Trust the client (GAS already validated)
        session['user'] = {
            'uid': user_info.get('user_id') or user_info.get('uid'),
            'email': user_info.get('email'),
            'displayName': user_info.get('username') or user_info.get('displayName'),
            'photoURL': user_info.get('profile_picture') or user_info.get('photoURL'),
            'login_method': 'manual'
        }
    else:
        # Firebase Login
        token = data.get('idToken')
        if not token:
            return jsonify({'error': 'Missing idToken'}), 400
            
        session['user'] = {
            'uid': user_info.get('uid'),
            'email': user_info.get('email'),
            'displayName': user_info.get('displayName') or user_info.get('email').split('@')[0],
            'photoURL': user_info.get('photoURL'),
            'login_method': 'google'
        }
    
    return jsonify({'status': 'success'})

@app.route('/api/sessionLogout', methods=['POST'])
def session_logout():
    session.pop('user', None)
    return jsonify({'status': 'success'})

@app.route('/google-login', methods=['POST'])
def google_login():
    data = request.get_json()
    uid = data.get('uid')
    name = data.get('name')
    email = data.get('email')
    
    if not uid or not email:
        return jsonify({'error': 'Missing credentials'}), 400
        
    session['user'] = {
        'uid': uid,
        'email': email,
        'displayName': name,
    }
    
    return jsonify({'status': 'success'})

@app.route('/api/session/update', methods=['POST'])
def api_update_session():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    displayName = data.get('displayName')
    photoURL = data.get('photoURL')
    mobileNumber = data.get('mobileNumber') or data.get('mobile_number')
    
    session_user = session['user']
    if displayName is not None:
        session_user['displayName'] = displayName
    if photoURL is not None:
        session_user['photoURL'] = photoURL
    if mobileNumber is not None:
        session_user['mobileNumber'] = mobileNumber
        session_user['mobile_number'] = mobileNumber
        
    session['user'] = session_user
    session.modified = True
    return jsonify({'success': True})

import json
import uuid
import requests
import csv
import io
import razorpay
import hmac
import hashlib

razorpay_client = None
try:
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if key_id and key_secret:
        razorpay_client = razorpay.Client(auth=(key_id, key_secret))
        print("Razorpay client initialized successfully.")
    else:
        print("WARNING: Razorpay credentials missing or incomplete. Razorpay client not initialized.")
except Exception as e:
    print(f"ERROR: Failed to initialize Razorpay client: {e}")

PAYMENT_GAS_URL = "https://script.google.com/macros/s/AKfycbyifHkwPbUjkptWjhWT--FmcKBivrsJEGarfEALgf6GLY_S-8y8VvtehVSlSjy7DWs_/exec"

def post_to_gas(url, payload, timeout=30):
    """Robust helper to send POST request to Google Apps Script.
    Google Apps Script responds to POSTs with a 302 redirect to a GET endpoint
    that contains the actual JSON response. The requests library handles this correctly
    by default when allow_redirects=True.
    """
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
            allow_redirects=True
        )
        return response
    except Exception as e:
        print(f"Error in post_to_gas: {e}")
        raise e

PROMPTS_DB = []

DATA_DIR = 'data'
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception as e:
    print(f"WARNING: Could not create data directory {DATA_DIR}: {e}")
EDITED_USERS_FILE = os.path.join(DATA_DIR, 'edited_users.json')
DELETED_USERS_FILE = os.path.join(DATA_DIR, 'deleted_users.json')
PURCHASES_FILE = os.path.join(DATA_DIR, 'purchases.json')

def load_purchases():
    if os.path.exists(PURCHASES_FILE):
        try:
            with open(PURCHASES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_purchases(data):
    with open(PURCHASES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def load_edited_users():
    if os.path.exists(EDITED_USERS_FILE):
        try:
            with open(EDITED_USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_edited_users(data):
    with open(EDITED_USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def load_deleted_users():
    if os.path.exists(DELETED_USERS_FILE):
        try:
            with open(DELETED_USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_deleted_users(data):
    with open(DELETED_USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

@app.route('/api/admin/users', methods=['GET'])
def api_get_users():
    try:
        users_csv_url = "https://docs.google.com/spreadsheets/d/1JsulLVYcmUrH3MwAV5l0nr4fwXRXVqHcjsz_b8IrQqI/export?format=csv"
        response = requests.get(f"{users_csv_url}&cache_bust={uuid.uuid4().hex}", timeout=30)
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch users from Google Sheets'}), 500
        
        # Parse CSV
        csv_text = response.text
        f = io.StringIO(csv_text)
        reader = csv.reader(f)
        try:
            headers = [h.strip().replace('"', '') for h in next(reader)]
        except StopIteration:
            return jsonify([])
        
        users = []
        for row in reader:
            if not row:
                continue
            obj = {}
            for index, header in enumerate(headers):
                val = row[index].strip().replace('"', '') if index < len(row) else ''
                key = header.lower().replace(' ', '_')
                obj[key] = val
            users.append(obj)
            
        # Apply local edits and deletions
        edited = load_edited_users()
        deleted = load_deleted_users()
        
        filtered_users = []
        for user in users:
            uid = user.get('user_id')
            if not uid or uid in deleted:
                continue
            if uid in edited:
                user.update(edited[uid])
            filtered_users.append(user)
            
        return jsonify(filtered_users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/edit', methods=['POST'])
def api_edit_user():
    try:
        data = request.get_json()
        uid = data.get('user_id')
        if not uid:
            return jsonify({'success': False, 'message': 'Missing user_id'}), 400
            
        # Update local edits json
        edited = load_edited_users()
        edited[uid] = {
            'full_name': data.get('full_name'),
            'email': data.get('email'),
            'mobile_number': data.get('mobile_number'),
            'login_provider': data.get('login_provider'),
            'account_status': data.get('account_status')
        }
        save_edited_users(edited)
        
        # Also sync with USERS_API_URL (Google Sheets) via update_profile
        try:
            users_api_url = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec"
            payload = {
                'action': 'update_profile',
                'user_id': uid,
                'full_name': data.get('full_name'),
                'mobile_number': data.get('mobile_number'),
                'account_status': data.get('account_status')
            }
            post_to_gas(users_api_url, payload, timeout=15)
        except Exception as e:
            print(f"Error syncing with Google Sheets: {e}")
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/delete/<user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    try:
        deleted = load_deleted_users()
        if user_id not in deleted:
            deleted.append(user_id)
            save_deleted_users(deleted)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin')
@app.route('/admin/')
@login_required
def admin_redirect():
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    # Verify admin here if needed in production
    return render_template('admin/dashboard.html')

import requests

@app.route('/api/admin/add-prompt', methods=['POST'])
def add_prompt():
    try:
        # Get text fields from request.form
        title = request.form.get("title", "")
        category = request.form.get("category", "")
        platform = request.form.get("platform", "")
        raw_price = request.form.get("price")
        price = raw_price if raw_price is not None and str(raw_price).strip() != "" else 2
        prompt_text = request.form.get("prompt_text", "")

        # Get image URL from request.form
        image_url = request.form.get("image_url", "").strip()
        if not image_url:
            return jsonify({"success": False, "message": "Image URL is required"}), 400

        # Payload sent to Google Apps Script
        payload = {
            "action": "add_prompt",
            "title": title,
            "category": category,
            "platform": platform,
            "price": price,
            "image_url": image_url,
            "prompt_text": prompt_text
        }

        # Keep in memory for instant local UI update if needed
        import uuid
        import threading
        new_prompt = payload.copy()
        new_prompt['id'] = str(uuid.uuid4())[:8]
        PROMPTS_DB.append(new_prompt)

        def bg_task(p_load, p_id):
            try:
                response = post_to_gas(GAS_URL, p_load, timeout=30)
                result = response.json() if response.text.strip() else {}
                prompt_id_final = result.get("prompt_id", p_id)
                
                # Real-time Firestore Sync for Notifications & Gallery Updates
                if firebase_db:
                    firebase_db.collection("notifications").add({
                        "prompt_id": prompt_id_final,
                        "title": title,
                        "category": category,
                        "platform": platform,
                        "price": price,
                        "image_url": image_url,
                        "prompt_text": prompt_text,
                        "timestamp": firestore.SERVER_TIMESTAMP,
                        "type": "new_prompt"
                    })
                    print(f"Firestore notification created for prompt {prompt_id_final}")
            except Exception as e:
                print("Async GAS or Firestore upload failed:", e)

        # Run background task
        threading.Thread(target=bg_task, args=(payload, new_prompt['id'])).start()

        # Return success response immediately!
        return jsonify({
            "success": True,
            "message": "Prompt added successfully (processing in background)",
            "prompt_id": new_prompt['id']
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/save-token', methods=['POST', 'OPTIONS'])
def save_token():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    if not firebase_db:
        return jsonify({"success": False, "message": "Firebase DB not initialized."}), 500

    try:
        data = request.get_json() or {}
        token = data.get("token")
        email = data.get("email", "guest")
        name = data.get("name", "Anonymous")

        if not token:
            return jsonify({"success": False, "message": "No token provided."}), 400

        # Save to Firestore bypassing rules
        firebase_db.collection("notification_tokens").document(token).set({
            "token": token,
            "user_email": email,
            "user_name": name,
            "created_at": firestore.SERVER_TIMESTAMP
        }, merge=True)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/send-notification', methods=['POST'])
def send_notification():
    """Fetches all stored FCM tokens from Firestore and broadcasts a push notification."""
    if not firebase_db:
        return jsonify({
            "success": False,
            "message": "Firebase Admin SDK / Firestore is not initialized on this server instance."
        }), 500

    try:
        data = request.get_json() or {}
        title = data.get("title", "New Prompt Added!")
        price = data.get("price", "9")
        image_url = data.get("image_url", "https://promptbazzar.netlify.app/static/images/logo.png")
        prompt_id = data.get("prompt_id", "")

        # 1. Fetch all tokens from collection 'notification_tokens'
        tokens_ref = firebase_db.collection("notification_tokens")
        docs = tokens_ref.stream()

        tokens = []
        token_to_doc_id = {} # Map to easily delete invalid tokens
        for doc in docs:
            tdata = doc.to_dict()
            token = tdata.get("token")
            if token:
                tokens.append(token)
                token_to_doc_id[token] = doc.id

        if not tokens:
            return jsonify({
                "success": True,
                "message": "No subscribed users/tokens found. Broadcast skipped.",
                "sent_count": 0
            })

        # 2. Build FCM multicast message
        body_text = f"{title} is now available for just ₹{price}"
        
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title="🔥 New Prompt Added!",
                body=body_text,
                image=image_url
            ),
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(
                    link="https://promptbazzar.netlify.app/prompt-gallery"
                ),
                headers={
                    "TTL": "86400" # 24 hours
                }
            ),
            data={
                "click_action": "https://prompt-bazaar.web.app/prompt-gallery",
                "prompt_id": str(prompt_id)
            },
            tokens=tokens
        )

        # 3. Send notification to all tokens
        response = messaging.send_multicast(message)
        print(f"Successfully sent {response.success_count} notifications out of {len(tokens)}")

        # 4. Clean up invalid/unregistered tokens automatically
        invalid_tokens_count = 0
        if response.failure_count > 0:
            batch = firebase_db.batch()
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    exc = resp.exception
                    if exc and (exc.code == 'messaging/invalid-registration-token' or exc.code == 'messaging/registration-token-not-registered'):
                        bad_token = tokens[idx]
                        doc_id = token_to_doc_id[bad_token]
                        doc_ref = tokens_ref.document(doc_id)
                        batch.delete(doc_ref)
                        invalid_tokens_count += 1
            
            if invalid_tokens_count > 0:
                batch.commit()
                print(f"Cleaned up {invalid_tokens_count} invalid/unregistered tokens from Firestore.")

        return jsonify({
            "success": True,
            "message": f"Successfully broadcasted to {response.success_count} active devices.",
            "sent_count": response.success_count,
            "failure_count": response.failure_count,
            "cleaned_invalid_tokens": invalid_tokens_count
        })

    except Exception as e:
        print(f"Error sending multicast push notifications: {e}")
        return jsonify({
            "success": False,
            "message": f"Push notification broadcasting failed: {str(e)}"
        }), 500

@app.route('/api/admin/prompts', methods=['GET'])
def api_get_prompts():
    return jsonify({'prompts': PROMPTS_DB})

@app.route('/api/admin/prompts/<prompt_id>', methods=['DELETE'])
def api_delete_prompt(prompt_id):
    try:
        pid = int(prompt_id) if prompt_id.isdigit() else prompt_id
        
        payload = {
            "action": "delete_prompt",
            "prompt_id": pid
        }
        
        print(f"[DEBUG] Attempting to delete prompt {pid} at URL: {GAS_URL}")
        response = post_to_gas(GAS_URL, payload, timeout=30)
        
        result = response.json()
        print(f"[DEBUG] Delete prompt {pid} result: {result}")
        if result.get("success", False):
            global PROMPTS_DB
            PROMPTS_DB = [p for p in PROMPTS_DB if str(p.get('prompt_id') or p.get('id')) != str(prompt_id)]
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': result.get("message", "Failed to delete from database")}), 400
            
    except Exception as e:
        print(f"[DEBUG] Exception deleting prompt {prompt_id}: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/prompts', methods=['GET'])
def api_get_public_prompts():
    try:
        # Fetching prompts from GAS via GET request
        response = requests.get(f"{GAS_URL}?action=get_prompts&cache_bust={uuid.uuid4().hex}", timeout=30)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    return jsonify(data)
                elif isinstance(data, dict) and 'prompts' in data:
                    return jsonify(data['prompts'])
            except:
                pass
        
        # Fallback to in-memory DB if GAS fails or returns invalid format
        return jsonify(PROMPTS_DB)
    except Exception as e:
        print(f"Error fetching prompts from GAS: {e}")
        return jsonify(PROMPTS_DB)

@app.route('/api/report-prompt', methods=['POST'])
def report_prompt():
    try:
        data = request.get_json()
        
        # Prepare payload for GAS
        payload = {
            "action": "submit_report",
            "prompt_id": data.get("prompt_id"),
            "user_name": data.get("user_name"),
            "user_email": data.get("user_email"),
            "reason": data.get("reason"),
            "details": data.get("details")
        }

        # Send to GAS
        response = post_to_gas(GAS_URL, payload, timeout=30)
        
        return jsonify({
            "success": True,
            "message": "Report submitted successfully."
        })
    except Exception as e:
        print(f"Error submitting report to GAS: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to submit report. Please try again later."
        }), 500

@app.route('/create-order', methods=['POST'])
def create_order():
    if not razorpay_client:
        return jsonify({"success": False, "message": "Razorpay client is not initialized due to missing credentials."}), 500
    try:
        data = request.get_json()
        prompt_id = data.get("prompt_id")
        title = data.get("title")
        price = data.get("price", 99)
        
        amount = int(float(price) * 100)
        
        order_data = {
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "prompt_id": str(prompt_id),
                "title": title
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return jsonify({
            "success": True,
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key": os.getenv("RAZORPAY_KEY_ID")
        })
    except Exception as e:
        print(f"Error creating Razorpay order: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    if not razorpay_client:
        return jsonify({"success": False, "message": "Razorpay client is not initialized due to missing credentials."}), 500
    try:
        data = request.get_json()
        razorpay_payment_id = data.get("razorpay_payment_id")
        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_signature = data.get("razorpay_signature")
        prompt_id = data.get("prompt_id")
        title = data.get("title")
        price = data.get("price")
        prompt_text = data.get("prompt_text", "")
        image_url = data.get("image_url", "")
        user_info = data.get("user") or session.get("user") or {}

        # Verify Razorpay signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)

        # Signature verified — extract ALL possible user identifiers
        # ROOT CAUSE FIX: Firebase UID (e.g. "abc123") != GAS USR ID (e.g. "USR123456")
        # We save under BOTH uid AND email so whichever ID is used at lookup time, we always find the record.
        user_id    = user_info.get("uid") or user_info.get("user_id") or "guest"
        user_email = user_info.get("email") or ""

        import datetime
        now = datetime.datetime.now()
        created_at = now.isoformat()
        date_str = now.strftime("%Y-%m-%d %H:%M:%S")

        purchase_record = {
            "prompt_id": str(prompt_id),
            "title": title,
            "price": price,
            "payment_id": razorpay_payment_id,
            "order_id": razorpay_order_id,
            "user_id": str(user_id),
            "user_email": user_email,
            "date": date_str,
            "created_at": created_at,
            "prompt_text": prompt_text,
            "image_url": image_url,
            "payment_status": "Success",
            "payment_method": "Razorpay"
        }

        # 1. Persist to Google Sheets via GAS (primary persistent store — survives Render restarts)
        payment_payload = {
            "action": "save_payment",
            "payment_id": razorpay_payment_id,
            "order_id": razorpay_order_id,
            "user_id": str(user_id),
            "user_email": user_email,
            "prompt_id": str(prompt_id),
            "prompt_title": title,
            "prompt_text": prompt_text,
            "image_url": image_url,
            "amount": price,
            "currency": "INR",
            "payment_status": "Success",
            "payment_method": "Razorpay",
            "created_at": created_at
        }
        try:
            gas_resp = post_to_gas(PAYMENT_GAS_URL, payment_payload, timeout=25)
            print(f"GAS payment save response: {gas_resp.status_code} {gas_resp.text[:200]}")
        except Exception as e:
            print(f"WARNING: GAS payment save failed (non-fatal): {e}")

        # 2. Persist to local JSON with DUAL-INDEX (uid key + email key).
        #    This is the core fix: even if UID changes between sessions, email always matches.
        try:
            purchases = load_purchases()

            def _add_to_bucket(key):
                if not key or key == "guest":
                    return
                if key not in purchases:
                    purchases[key] = []
                # Deduplicate by payment_id
                existing_payment_ids = {p.get("payment_id") for p in purchases[key]}
                if razorpay_payment_id not in existing_payment_ids:
                    purchases[key].append(purchase_record)

            _add_to_bucket(str(user_id))           # primary uid key
            _add_to_bucket(f"email:{user_email}")  # stable email key (never changes)

            save_purchases(purchases)
            print(f"Purchase dual-indexed: uid_key={user_id}, email_key=email:{user_email}")
        except Exception as e:
            print(f"WARNING: Local purchases.json dual-index save failed (non-fatal): {e}")

        # 3. Return the full purchase record so the frontend can cache it in localStorage
        #    This guarantees prompts unlock instantly even if Render restarts between calls.
        return jsonify({
            "success": True,
            "message": "Payment successful.",
            "purchase": purchase_record
        })

    except razorpay.errors.SignatureVerificationError:
        return jsonify({"success": False, "message": "Payment verification failed."}), 400
    except Exception as e:
        print(f"Error verifying payment: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/user/purchases', methods=['GET'])
def get_user_purchases():
    """Fetch user purchase history.
    Merges results from uid-key, email-key (dual-indexed at payment time),
    so Firebase UID vs GAS USR ID mismatches never cause lost purchase records.
    Primary source: GAS (Google Sheets). Fallback: local purchases.json.
    """
    uid   = request.args.get('uid')
    email = request.args.get('email', '')

    if not uid and 'user' in session:
        uid   = session['user'].get('uid', '')
        email = email or session['user'].get('email', '')

    if not uid and not email:
        return jsonify([])

    # --- Helper: deduplicate purchase list by payment_id ---
    def _dedup(lst):
        seen = set()
        result = []
        for p in lst:
            pid = p.get('payment_id') or p.get('order_id')
            if pid and pid not in seen:
                seen.add(pid)
                result.append(p)
            elif not pid:
                result.append(p)  # keep records without payment_id (older format)
        return result

    # --- Primary: Fetch from GAS (try uid first, then email) ---
    gas_purchases = []
    try:
        gas_url = os.getenv("PAYMENT_GAS_URL", PAYMENT_GAS_URL)

        # Try by uid
        if uid:
            r = requests.get(f"{gas_url}?action=get_user_purchases&user_id={uid}", timeout=15)
            if r.status_code == 200:
                d = r.json()
                if isinstance(d, list):
                    gas_purchases.extend(d)
                elif isinstance(d, dict):
                    gas_purchases.extend(d.get('purchases') or d.get('data') or [])

        # Try by email as well (catches purchases made under a different uid)
        if email and not gas_purchases:
            r2 = requests.get(f"{gas_url}?action=get_user_purchases&user_email={email}", timeout=15)
            if r2.status_code == 200:
                d2 = r2.json()
                if isinstance(d2, list):
                    gas_purchases.extend(d2)
                elif isinstance(d2, dict):
                    gas_purchases.extend(d2.get('purchases') or d2.get('data') or [])
    except Exception as e:
        print(f"GAS purchases fetch failed, falling back to local JSON: {e}")

    if gas_purchases:
        result = _dedup(gas_purchases)
        # Backfill local cache
        try:
            local_purchases = load_purchases()
            if uid:
                local_purchases[str(uid)] = result
            if email:
                local_purchases[f"email:{email}"] = result
            save_purchases(local_purchases)
        except Exception:
            pass
        return jsonify(result)

    # --- Fallback: local purchases.json (dual-index merge) ---
    local_purchases = load_purchases()
    merged = []
    if uid:
        merged.extend(local_purchases.get(str(uid), []))
    if email:
        merged.extend(local_purchases.get(f"email:{email}", []))
    return jsonify(_dedup(merged))

# --- Admin: Fetch live payments from Google Sheets ---
PAYMENTS_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1Ixf1ZqxCBKm8Q1Aq5pO3lO-0PJUQ8SKJ3KyBOQ_KXCE/export?format=csv&sheet=Payments"

@app.route('/api/admin/payments', methods=['GET'])
def api_get_payments():
    """Fetch payment records from Google Sheets Payments tab via Apps Script."""
    try:
        gas_url = os.getenv("PAYMENT_GAS_URL", PAYMENT_GAS_URL)
        response = requests.get(f"{gas_url}?action=get_payments", timeout=30)
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    return jsonify(data)
                elif isinstance(data, dict) and 'payments' in data:
                    return jsonify(data['payments'])
                elif isinstance(data, dict) and 'data' in data:
                    return jsonify(data['data'])
            except Exception:
                pass

        # Fallback: read purchases.json and return all
        purchases = load_purchases()
        all_payments = []
        import datetime
        for uid, items in purchases.items():
            for item in items:
                all_payments.append({
                    "payment_id": item.get("payment_id", ""),
                    "order_id": item.get("order_id", ""),
                    "user_id": uid,
                    "user_email": item.get("user_email", ""),
                    "prompt_id": item.get("prompt_id", ""),
                    "prompt_title": item.get("title", ""),
                    "amount": item.get("price", ""),
                    "currency": "INR",
                    "payment_status": "Success",
                    "payment_method": "Razorpay",
                    "created_at": item.get("date", "")
                })
        return jsonify(all_payments)
    except Exception as e:
        print(f"Error fetching admin payments: {e}")
        # Fallback to local purchases.json
        purchases = load_purchases()
        all_payments = []
        for uid, items in purchases.items():
            for item in items:
                all_payments.append({
                    "payment_id": item.get("payment_id", ""),
                    "order_id": item.get("order_id", ""),
                    "user_id": uid,
                    "user_email": item.get("user_email", ""),
                    "prompt_id": item.get("prompt_id", ""),
                    "prompt_title": item.get("title", ""),
                    "amount": item.get("price", ""),
                    "currency": "INR",
                    "payment_status": "Success",
                    "payment_method": "Razorpay",
                    "created_at": item.get("date", "")
                })
        return jsonify(all_payments)



# ==========================================
# SHARED PROMPTS API
# ==========================================
import uuid

@app.route('/api/share_prompt', methods=['POST'])
def api_share_prompt():
    if not firebase_db:
        return jsonify({"success": False, "error": "Firebase DB not initialized"}), 500
        
    data = request.json
    if not data or 'enhanced' not in data:
        return jsonify({"success": False, "error": "Missing prompt data"}), 400
        
    share_id = str(uuid.uuid4())[:8] # short id
    
    doc_data = {
        "share_id": share_id,
        "original": data.get("original", ""),
        "enhanced": data.get("enhanced", ""),
        "intent": data.get("intent", ""),
        "score": data.get("score", {}),
        "created_at": firestore.SERVER_TIMESTAMP
    }
    
    try:
        firebase_db.collection("shared_prompts").document(share_id).set(doc_data)
        # Use production domain for QR scanning
        share_url = f"https://promptbazaar.in/share/{share_id}"
        return jsonify({"success": True, "shareId": share_id, "shareUrl": share_url})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/share/<share_id>')
def share_viewer(share_id):
    if not firebase_db:
        return "Database error", 500
        
    doc = firebase_db.collection("shared_prompts").document(share_id).get()
    if not doc.exists:
        return "Prompt not found or link expired.", 404
        
    data = doc.to_dict()
    return render_template('share_viewer.html', prompt_data=data)


# =============================================================================
# V7 MULTI-AGENT PROMPT INTELLIGENCE API
# =============================================================================

@app.route('/api/v7/enhance', methods=['POST'])
def enhance_prompt_v7():
    """
    V7 Multi-Agent Prompt Intelligence endpoint.
    Runs the full 7-agent pipeline to transform user input
    into a production-ready prompt.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON."}), 400

        user_input = data.get("input", "").strip()
        if not user_input:
            return jsonify({"error": "Input text is required."}), 400

        if len(user_input) > 10000:
            return jsonify({"error": "Input too long. Maximum 10,000 characters."}), 400

        from services.agents.orchestrator import get_orchestrator
        orchestrator = get_orchestrator()
        result = orchestrator.run(user_input)

        return jsonify(result), 200

    except Exception as e:
        logging.error(f"V7 Enhance API error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error during prompt enhancement."}), 500



# =============================================================================
# PORTFOLIO BUILDER PRO API & PREVIEWS
# =============================================================================

@app.route('/portfolio-viewer')
def serve_user_portfolio():
    viewer_path = os.path.join(os.path.dirname(__file__), 'portfolio-viewer.html')
    if os.path.exists(viewer_path):
        with open(viewer_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Portfolio Viewer not found", 404

@app.route('/preview_portfolio')
@app.route('/portfolio/preview')
def preview_portfolio_page():
    preview_path = os.path.join(os.path.dirname(__file__), 'preview_portfolio.html')
    if os.path.exists(preview_path):
        with open(preview_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Preview not found", 404

@app.route('/preview_portfolio_v2')
def preview_portfolio_v2_page():
    preview_path = os.path.join(os.path.dirname(__file__), 'preview_portfolio_v2.html')
    if os.path.exists(preview_path):
        with open(preview_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Preview v2 not found", 404

@app.route('/api/tools/portfolio/generate', methods=['POST'])
def generate_portfolio():
    data = request.json
    if not data or 'data' not in data:
        return jsonify({"success": False, "message": "Missing portfolio data"}), 400
        
    user_id = data.get('user_id', 'guest')
    username = data.get('username') or f'user_{uuid.uuid4().hex[:6]}'
    portfolio_state = data.get('data')
    
    from services.portfolio_agents.orchestrator import PortfolioOrchestrator
    orchestrator = PortfolioOrchestrator()
    result = orchestrator.generate(user_id, username, portfolio_state)
    
    if result.get("success") and result.get("html"):
        html_content = result["html"]
        # 1. Save in memory cache
        PORTFOLIO_CACHE[username] = html_content
        
        # 2. Save to local disk fallback
        try:
            portfolios_dir = os.path.join(os.path.dirname(__file__), "static", "portfolios")
            os.makedirs(portfolios_dir, exist_ok=True)
            with open(os.path.join(portfolios_dir, f"{username}.html"), "w", encoding="utf-8") as f:
                f.write(html_content)
        except Exception as e:
            logging.error(f"Error saving portfolio locally to disk: {e}")

        # 3. Store in Firebase for serving dynamically
        try:
            if firebase_db:
                firebase_db.collection("portfolios").document(username).set({
                    "user_id": user_id,
                    "username": username,
                    "html": html_content,
                    "created_at": firestore.SERVER_TIMESTAMP
                })
        except Exception as e:
            logging.error(f"Error saving portfolio to Firebase: {e}")
            
    return jsonify(result)

@app.route('/api/portfolio/<username>')
def get_portfolio_api(username):
    # Fast memory cache check
    if username in PORTFOLIO_CACHE:
        return jsonify({"success": True, "username": username, "html": PORTFOLIO_CACHE[username]})
    local_path = os.path.join(os.path.dirname(__file__), "static", "portfolios", f"{username}.html")
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                PORTFOLIO_CACHE[username] = html_content
                return jsonify({"success": True, "username": username, "html": html_content})
        except Exception:
            pass
    return jsonify({"success": False, "message": "Not found"}), 404

@app.route('/p/<username>')
def serve_portfolio(username):
    # 1. Check in-memory cache first
    if username in PORTFOLIO_CACHE:
        return PORTFOLIO_CACHE[username]

    # 2. Check local filesystem cache
    local_path = os.path.join(os.path.dirname(__file__), "static", "portfolios", f"{username}.html")
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                PORTFOLIO_CACHE[username] = html_content
                return html_content
        except Exception as e:
            logging.error(f"Error reading local portfolio file: {e}")

    # 3. Check Firebase Firestore
    if firebase_db:
        try:
            doc = firebase_db.collection("portfolios").document(username).get()
            if doc.exists:
                data = doc.to_dict()
                html_content = data.get("html", "")
                if html_content:
                    PORTFOLIO_CACHE[username] = html_content
                    return html_content
        except Exception as e:
            logging.error(f"Error fetching portfolio from Firebase: {e}")

    # 4. Universal fast fallback: Serve portfolio-viewer.html which renders instantly from client localStorage / Apps Script
    viewer_path = os.path.join(os.path.dirname(__file__), 'portfolio-viewer.html')
    if os.path.exists(viewer_path):
        with open(viewer_path, 'r', encoding='utf-8') as f:
            return f.read()

    return "Portfolio not found. Make sure you have generated one first.", 404


# ── Health & Diagnostics Endpoint ───────────────────────────────────────
@app.route('/api/health')
def health_check():
    """Returns system health, cache stats, rate-limiter stats, and shield stats."""
    health = {
        "status": "healthy",
        "version": "3.1.0",
        "firebase_connected": firebase_db is not None,
        "security_shield": security_shield.stats if security_shield else "disabled",
        "cache": app_cache.stats if app_cache else "disabled",
        "rate_limiter": rate_limiter.stats if rate_limiter else "disabled",
    }
    return jsonify(health), 200

# ── Local Catch-All for Portfolio Viewer SPA ────────────────────────────
@app.route('/<path:username>')
def catch_all_portfolio(username):
    # Ignore API, static, and internal routes
    if username.startswith('api/') or username.startswith('static/') or username in ['tools', 'login', 'signup']:
        return "Not Found", 404
        
    viewer_path = os.path.join(os.path.dirname(__file__), 'portfolio-viewer.html')
    if os.path.exists(viewer_path):
        with open(viewer_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Not Found", 404

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in the request'}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Upload to Google Drive
            result = upload_file_to_drive(file_path, filename, file.mimetype)
            
            # Clean up the local file after successful upload
            os.remove(file_path)
            
            return jsonify({
                'success': True,
                **result
            })
            
        except Exception as e:
            # Clean up local file in case of error
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
            return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
