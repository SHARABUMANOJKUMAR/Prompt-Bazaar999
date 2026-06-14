import os
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from functools import wraps
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore, messaging
import json

# Global Firestore DB reference
firebase_db = None

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

import logging
logging.basicConfig(level=logging.INFO)

@app.route('/health')
def health_check():
    """Lightweight endpoint for keep-alive ping."""
    logging.info("Health Check Request Received. Responding HTTP 200 OK.")
    return jsonify({
        "status": "ok",
        "service": "Prompt Bazaar",
        "uptime": True
    }), 200
@app.before_request
def handle_options_preflight():
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        origin = request.headers.get('Origin')
        allowed_origins = ["https://prompt-bazaar.web.app", "http://localhost:5000", "http://127.0.0.1:5000"]
        if not origin or origin not in allowed_origins:
            origin = "https://prompt-bazaar.web.app"
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = ["https://prompt-bazaar.web.app", "http://localhost:5000", "http://127.0.0.1:5000"]
    if not origin or origin not in allowed_origins:
        origin = "https://prompt-bazaar.web.app"
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

@app.route('/profile')
@login_required
def profile():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='account')

@app.route('/wishlist')
@login_required
def wishlist():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='wishlist')

@app.route('/payments')
@login_required
def payments():
    user = session.get('user')
    return render_template('profile.html', user=user, active_tab='payments')


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
            users_api_url = "https://script.google.com/macros/s/AKfycbzeyp93N_8BIW40Qi5isffi5h7FfHvm84_1n3mWMIzYNVVovayy-fL5RNiC6k15i7GL8g/exec"
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
        image_url = data.get("image_url", "https://prompt-bazaar.web.app/static/images/logo.png")
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
                    link="https://prompt-bazaar.web.app/prompt-gallery"
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

# ============================================================================
# PROMPT BAZAAR 3.0 – ANALYTICS & RECOMMENDATION ENGINE
# ============================================================================

# --- Category Relationship Map for Content-Based Recommendations ---
CATEGORY_RELATIONS = {
    "couple": ["anniversary", "wedding", "romantic", "love", "valentine"],
    "anniversary": ["couple", "wedding", "romantic", "love"],
    "wedding": ["couple", "anniversary", "romantic", "bridal"],
    "romantic": ["couple", "anniversary", "wedding", "love", "valentine"],
    "business": ["linkedin", "marketing", "startup", "advertisement", "corporate", "professional"],
    "linkedin": ["business", "marketing", "professional", "corporate", "resume"],
    "marketing": ["business", "linkedin", "advertisement", "startup", "social media"],
    "youtube": ["video", "thumbnail", "content", "creator", "vlog"],
    "kids": ["children", "baby", "family", "birthday", "school"],
    "men": ["portrait", "professional", "fashion", "headshot"],
    "women": ["portrait", "fashion", "beauty", "headshot"],
    "birthday": ["kids", "celebration", "party", "invitation"],
}

def _calculate_asset_score(views, saves, shares, downloads):
    """Calculate the weighted engagement score for an asset."""
    return (views * 0.3) + (saves * 0.4) + (shares * 0.2) + (downloads * 0.1)

def _jaccard_similarity(set_a, set_b):
    """Compute Jaccard similarity between two sets of keywords."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union) if union else 0.0

def _tokenize(text):
    """Convert text to a set of lowercase tokens for similarity matching."""
    if not text:
        return set()
    import re
    return set(re.findall(r'[a-z0-9]+', text.lower()))


@app.route('/api/track-engagement', methods=['POST', 'OPTIONS'])
def track_engagement():
    """Track user engagement events (view, save, share, download) on a prompt."""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    if not firebase_db:
        return jsonify({"success": False, "message": "Firebase DB not initialized."}), 500

    try:
        data = request.get_json() or {}
        prompt_id = data.get("prompt_id")
        event_type = data.get("event_type")  # "view", "save", "share", "download"
        user_email = data.get("user_email", "anonymous")
        category = data.get("category", "")

        if not prompt_id or event_type not in ("view", "save", "share", "download"):
            return jsonify({"success": False, "message": "Invalid prompt_id or event_type."}), 400

        # 1. Update the prompt engagement counters in Firestore
        field_map = {"view": "views", "save": "saves", "share": "shares", "download": "downloads"}
        field_name = field_map[event_type]
        
        prompt_ref = firebase_db.collection("prompt_engagement").document(str(prompt_id))
        prompt_doc = prompt_ref.get()
        
        if prompt_doc.exists:
            current_data = prompt_doc.to_dict()
            new_value = current_data.get(field_name, 0) + 1
            updates = {field_name: new_value}
            # Recalculate score
            views = current_data.get("views", 0) + (1 if event_type == "view" else 0)
            saves = current_data.get("saves", 0) + (1 if event_type == "save" else 0)
            shares = current_data.get("shares", 0) + (1 if event_type == "share" else 0)
            downloads = current_data.get("downloads", 0) + (1 if event_type == "download" else 0)
            updates["score"] = _calculate_asset_score(views, saves, shares, downloads)
            prompt_ref.update(updates)
        else:
            initial = {"views": 0, "saves": 0, "shares": 0, "downloads": 0, "prompt_id": str(prompt_id), "category": category}
            initial[field_name] = 1
            initial["score"] = _calculate_asset_score(
                initial["views"], initial["saves"], initial["shares"], initial["downloads"]
            )
            prompt_ref.set(initial)

        # 2. Track user behaviour for personalized recommendations
        if user_email and user_email != "anonymous":
            user_ref = firebase_db.collection("user_behaviour").document(user_email)
            user_doc = user_ref.get()
            if user_doc.exists:
                behaviour = user_doc.to_dict()
                # Track category preferences
                cat_prefs = behaviour.get("category_preferences", {})
                if category:
                    cat_prefs[category.lower()] = cat_prefs.get(category.lower(), 0) + 1
                # Track recent views
                recent = behaviour.get("recent_views", [])
                if event_type == "view":
                    recent = [str(prompt_id)] + [r for r in recent if r != str(prompt_id)]
                    recent = recent[:50]  # Keep last 50
                user_ref.update({
                    "category_preferences": cat_prefs,
                    "recent_views": recent,
                    "last_active": firestore.SERVER_TIMESTAMP
                })
            else:
                user_ref.set({
                    "email": user_email,
                    "category_preferences": {category.lower(): 1} if category else {},
                    "recent_views": [str(prompt_id)] if event_type == "view" else [],
                    "saved_prompts": [],
                    "last_active": firestore.SERVER_TIMESTAMP
                })

        return jsonify({"success": True})
    except Exception as e:
        logging.error(f"Error tracking engagement: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/recommend', methods=['GET'])
def api_recommend():
    """Lightweight Content-Based + Popularity recommendation engine."""
    try:
        user_email = request.args.get("email", "")
        prompt_id = request.args.get("prompt_id", "")
        rec_type = request.args.get("type", "similar")  # "similar", "personalized", "trending"

        # Fetch all prompts from GAS
        all_prompts = []
        try:
            resp = requests.get(f"{GAS_URL}?action=get_prompts&cache_bust={uuid.uuid4().hex}", timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    all_prompts = data
                elif isinstance(data, dict) and 'prompts' in data:
                    all_prompts = data['prompts']
        except:
            all_prompts = PROMPTS_DB

        if not all_prompts:
            return jsonify([])

        # Fetch engagement scores
        engagement_map = {}
        if firebase_db:
            try:
                eng_docs = firebase_db.collection("prompt_engagement").stream()
                for doc in eng_docs:
                    d = doc.to_dict()
                    engagement_map[str(d.get("prompt_id", doc.id))] = d
            except:
                pass

        # Enrich prompts with engagement data
        for p in all_prompts:
            pid = str(p.get("prompt_id") or p.get("id", ""))
            eng = engagement_map.get(pid, {})
            p["views"] = eng.get("views", 0)
            p["saves"] = eng.get("saves", 0)
            p["shares"] = eng.get("shares", 0)
            p["downloads"] = eng.get("downloads", 0)
            p["score"] = eng.get("score", 0)

        recommendations = []

        if rec_type == "similar" and prompt_id:
            # Find the target prompt
            target = None
            for p in all_prompts:
                if str(p.get("prompt_id") or p.get("id", "")) == str(prompt_id):
                    target = p
                    break
            
            if target:
                target_tokens = _tokenize(f"{target.get('title', '')} {target.get('category', '')} {target.get('description', '')} {target.get('platform', '')}")
                target_cat = (target.get("category") or "").lower()
                related_cats = set(CATEGORY_RELATIONS.get(target_cat, []))
                related_cats.add(target_cat)

                scored = []
                for p in all_prompts:
                    pid = str(p.get("prompt_id") or p.get("id", ""))
                    if pid == str(prompt_id):
                        continue
                    p_tokens = _tokenize(f"{p.get('title', '')} {p.get('category', '')} {p.get('description', '')} {p.get('platform', '')}")
                    sim = _jaccard_similarity(target_tokens, p_tokens)
                    # Boost score for related categories
                    p_cat = (p.get("category") or "").lower()
                    if p_cat in related_cats:
                        sim += 0.3
                    # Factor in popularity
                    sim += p.get("score", 0) * 0.001
                    scored.append((sim, p))

                scored.sort(key=lambda x: x[0], reverse=True)
                recommendations = [item[1] for item in scored[:12]]

        elif rec_type == "personalized" and user_email and firebase_db:
            # Get user behaviour
            try:
                user_doc = firebase_db.collection("user_behaviour").document(user_email).get()
                if user_doc.exists:
                    behaviour = user_doc.to_dict()
                    cat_prefs = behaviour.get("category_preferences", {})
                    recent_views = set(behaviour.get("recent_views", []))

                    # Find top categories
                    sorted_cats = sorted(cat_prefs.items(), key=lambda x: x[1], reverse=True)
                    top_cats = set()
                    for cat, _ in sorted_cats[:5]:
                        top_cats.add(cat)
                        top_cats.update(CATEGORY_RELATIONS.get(cat, []))

                    scored = []
                    for p in all_prompts:
                        pid = str(p.get("prompt_id") or p.get("id", ""))
                        if pid in recent_views:
                            continue  # Don't recommend already viewed
                        p_cat = (p.get("category") or "").lower()
                        cat_score = 1.0 if p_cat in top_cats else 0.0
                        pop_score = p.get("score", 0) * 0.001
                        scored.append((cat_score + pop_score, p))

                    scored.sort(key=lambda x: x[0], reverse=True)
                    recommendations = [item[1] for item in scored[:12]]
                else:
                    # No behaviour data, return popular prompts
                    recommendations = sorted(all_prompts, key=lambda x: x.get("score", 0), reverse=True)[:12]
            except:
                recommendations = sorted(all_prompts, key=lambda x: x.get("score", 0), reverse=True)[:12]

        elif rec_type == "trending":
            recommendations = sorted(all_prompts, key=lambda x: x.get("score", 0), reverse=True)[:12]

        else:
            # Default: return most popular
            recommendations = sorted(all_prompts, key=lambda x: x.get("score", 0), reverse=True)[:12]

        return jsonify(recommendations)
    except Exception as e:
        logging.error(f"Error generating recommendations: {e}")
        return jsonify([])


@app.route('/api/trending', methods=['GET'])
def api_trending():
    """Returns prompts sorted by engagement score, grouped by section."""
    try:
        all_prompts = []
        try:
            resp = requests.get(f"{GAS_URL}?action=get_prompts&cache_bust={uuid.uuid4().hex}", timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    all_prompts = data
                elif isinstance(data, dict) and 'prompts' in data:
                    all_prompts = data['prompts']
        except:
            all_prompts = PROMPTS_DB

        # Fetch engagement
        engagement_map = {}
        if firebase_db:
            try:
                for doc in firebase_db.collection("prompt_engagement").stream():
                    d = doc.to_dict()
                    engagement_map[str(d.get("prompt_id", doc.id))] = d
            except:
                pass

        for p in all_prompts:
            pid = str(p.get("prompt_id") or p.get("id", ""))
            eng = engagement_map.get(pid, {})
            p["views"] = eng.get("views", 0)
            p["saves"] = eng.get("saves", 0)
            p["shares"] = eng.get("shares", 0)
            p["downloads"] = eng.get("downloads", 0)
            p["score"] = eng.get("score", 0)

        # Trending Today (highest score)
        trending = sorted(all_prompts, key=lambda x: x.get("score", 0), reverse=True)[:12]

        # New Arrivals (latest uploads)
        new_arrivals = sorted(all_prompts, key=lambda x: x.get("created_at", ""), reverse=True)[:12]

        # Most Saved
        most_saved = sorted(all_prompts, key=lambda x: x.get("saves", 0), reverse=True)[:12]

        # Most Shared
        most_shared = sorted(all_prompts, key=lambda x: x.get("shares", 0), reverse=True)[:12]

        # Popular Categories (count per category)
        cat_counts = {}
        for p in all_prompts:
            cat = (p.get("category") or "General").strip()
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        popular_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return jsonify({
            "trending_today": trending,
            "new_arrivals": new_arrivals,
            "most_saved": most_saved,
            "most_shared": most_shared,
            "popular_categories": [{"name": c[0], "count": c[1]} for c in popular_categories],
            "total_assets": len(all_prompts)
        })
    except Exception as e:
        logging.error(f"Error fetching trending: {e}")
        return jsonify({"trending_today": [], "new_arrivals": [], "most_saved": [], "most_shared": [], "popular_categories": [], "total_assets": 0})


@app.route('/api/analytics', methods=['GET'])
def api_analytics():
    """Data Science Dashboard analytics for admin."""
    if not firebase_db:
        return jsonify({"success": False, "message": "Firebase not initialized"}), 500

    try:
        # Engagement data
        engagement_docs = list(firebase_db.collection("prompt_engagement").stream())
        total_views = 0
        total_saves = 0
        total_shares = 0
        total_downloads = 0
        top_viewed = []
        top_saved = []
        category_engagement = {}

        for doc in engagement_docs:
            d = doc.to_dict()
            views = d.get("views", 0)
            saves = d.get("saves", 0)
            shares = d.get("shares", 0)
            downloads = d.get("downloads", 0)
            total_views += views
            total_saves += saves
            total_shares += shares
            total_downloads += downloads

            cat = (d.get("category") or "General").lower()
            if cat not in category_engagement:
                category_engagement[cat] = {"views": 0, "saves": 0, "shares": 0}
            category_engagement[cat]["views"] += views
            category_engagement[cat]["saves"] += saves
            category_engagement[cat]["shares"] += shares

            top_viewed.append({"prompt_id": d.get("prompt_id", doc.id), "views": views, "category": d.get("category", "")})
            top_saved.append({"prompt_id": d.get("prompt_id", doc.id), "saves": saves, "category": d.get("category", "")})

        top_viewed.sort(key=lambda x: x["views"], reverse=True)
        top_saved.sort(key=lambda x: x["saves"], reverse=True)

        # User analytics
        user_docs = list(firebase_db.collection("user_behaviour").stream())
        total_users = len(user_docs)

        # Fastest growing category
        fastest_cat = max(category_engagement.items(), key=lambda x: x[1]["views"] + x[1]["saves"]) if category_engagement else ("N/A", {})

        return jsonify({
            "success": True,
            "total_views": total_views,
            "total_saves": total_saves,
            "total_shares": total_shares,
            "total_downloads": total_downloads,
            "total_tracked_users": total_users,
            "top_viewed_assets": top_viewed[:10],
            "top_saved_assets": top_saved[:10],
            "fastest_growing_category": fastest_cat[0] if fastest_cat else "N/A",
            "category_engagement": category_engagement
        })
    except Exception as e:
        logging.error(f"Error fetching analytics: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/search', methods=['GET'])
def api_smart_search():
    """Fuzzy search with keyword + category + creator matching."""
    try:
        q = (request.args.get("q") or "").strip().lower()
        if not q:
            return jsonify([])

        all_prompts = []
        try:
            resp = requests.get(f"{GAS_URL}?action=get_prompts&cache_bust={uuid.uuid4().hex}", timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    all_prompts = data
                elif isinstance(data, dict) and 'prompts' in data:
                    all_prompts = data['prompts']
        except:
            all_prompts = PROMPTS_DB

        query_tokens = _tokenize(q)
        scored = []

        for p in all_prompts:
            title = (p.get("title") or "").lower()
            category = (p.get("category") or "").lower()
            description = (p.get("description") or "").lower()
            creator = (p.get("creator_name") or "").lower()
            platform = (p.get("platform") or "").lower()

            score = 0.0

            # Exact substring match (highest weight)
            if q in title:
                score += 5.0
            if q in category:
                score += 3.0
            if q in description:
                score += 2.0
            if q in creator:
                score += 2.0
            if q in platform:
                score += 1.5

            # Token-level fuzzy matching
            all_text = f"{title} {category} {description} {creator} {platform}"
            prompt_tokens = _tokenize(all_text)
            token_match = len(query_tokens & prompt_tokens) / max(len(query_tokens), 1)
            score += token_match * 3.0

            # Related category boost
            for qt in query_tokens:
                related = CATEGORY_RELATIONS.get(qt, [])
                if category in related or qt == category:
                    score += 2.0

            if score > 0:
                scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        return jsonify([item[1] for item in scored[:30]])
    except Exception as e:
        logging.error(f"Error in smart search: {e}")
        return jsonify([])

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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
