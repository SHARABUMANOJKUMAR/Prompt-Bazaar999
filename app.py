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
            print("Firebase Admin initialized with service account file ✅")
        else:
            # 2. Try to parse service account JSON from direct env string
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS")
            if sa_json:
                cred_dict = json.loads(sa_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin initialized with environment JSON credentials ✅")
            else:
                # 3. Fallback to default application credentials
                firebase_admin.initialize_app()
                print("Firebase Admin initialized with default credentials ✅")
    
    # Initialize Firestore client
    firebase_db = firestore.client()
    print("Firestore DB client connected successfully! ✅")
except Exception as e:
    print(f"WARNING: Firebase Admin SDK initialization failed: {e}. The app will continue, but push notifications will run in mock/no-op mode until credentials are set.")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev_key')

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
GAS_URL = "https://script.google.com/macros/s/AKfycbwCLIowdAuaMfwfuZJoIYPVatfkBwsI98JYgAgaAwR4kx4juKuOdjsShRGiK7ZOVaYe/exec"

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
    Handles the 302/307 redirection manually to prevent python-requests
    from changing the method to GET and discarding the JSON body.
    """
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
            allow_redirects=False
        )
        if response.status_code in [302, 307]:
            redirect_url = response.headers.get('Location')
            if redirect_url:
                # Perform the POST request to the redirected URL with the original payload preserved!
                response = requests.post(
                    redirect_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=timeout
                )
        return response
    except Exception as e:
        print(f"post_to_gas exception for URL {url}: {e}")
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
@login_required
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
@login_required
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
@login_required
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
        price = request.form.get("price", 2)
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
        new_prompt = payload.copy()
        new_prompt['id'] = str(uuid.uuid4())[:8]
        PROMPTS_DB.append(new_prompt)

        # Send POST request
        response = post_to_gas(GAS_URL, payload, timeout=30)

        # Raw response text
        raw_text = response.text.strip()

        # Ensure response is not empty
        if not raw_text:
            return jsonify({
                "success": False,
                "message": "Empty response from Google Apps Script."
            }), 500

        # Parse JSON
        result = response.json()

        # Return success response
        return jsonify({
            "success": result.get("success", False),
            "message": result.get("message", "Unknown response"),
            "prompt_id": result.get("prompt_id")
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

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
@login_required
def api_get_prompts():
    return jsonify({'prompts': PROMPTS_DB})

@app.route('/api/admin/prompts/<prompt_id>', methods=['DELETE'])
@login_required
def api_delete_prompt(prompt_id):
    try:
        pid = int(prompt_id) if prompt_id.isdigit() else prompt_id
        
        payload = {
            "action": "delete_prompt",
            "prompt_id": pid
        }
        
        response = post_to_gas(GAS_URL, payload, timeout=30)
        
        result = response.json()
        if result.get("success", False):
            global PROMPTS_DB
            PROMPTS_DB = [p for p in PROMPTS_DB if str(p.get('prompt_id') or p.get('id')) != str(prompt_id)]
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': result.get("message", "Failed to delete from database")}), 400
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/prompts', methods=['GET'])
def api_get_public_prompts():
    try:
        # Fetching prompts from GAS via GET request
        response = requests.get(f"{GAS_URL}?action=get_prompts", timeout=30)
        
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
@login_required
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
