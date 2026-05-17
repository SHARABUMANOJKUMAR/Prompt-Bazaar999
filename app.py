import os
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from functools import wraps
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev_key')

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
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

@app.route('/login')
def login():
    if 'user' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

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
    
    session_user = session['user']
    if displayName is not None:
        session_user['displayName'] = displayName
    if photoURL is not None:
        session_user['photoURL'] = photoURL
        
    session['user'] = session_user
    session.modified = True
    return jsonify({'success': True})

import json
import uuid
import requests
import csv
import io

PROMPTS_DB = []

DATA_DIR = 'data'
os.makedirs(DATA_DIR, exist_ok=True)
EDITED_USERS_FILE = os.path.join(DATA_DIR, 'edited_users.json')
DELETED_USERS_FILE = os.path.join(DATA_DIR, 'deleted_users.json')

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
            requests.post(users_api_url, json=payload, timeout=10)
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
        response = requests.post(
            GAS_URL,
            json=payload,
            headers={
                "Content-Type": "application/json"
            },
            timeout=30
        )

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
        
        response = requests.post(
            GAS_URL,
            json=payload,
            headers={
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
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
        response = requests.post(GAS_URL, json=payload, timeout=30)
        
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
