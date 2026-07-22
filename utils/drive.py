import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
CREDENTIALS_DIR = os.path.join(os.path.dirname(__file__), '..', 'credentials')
CLIENT_SECRET_FILE = os.path.join(CREDENTIALS_DIR, 'client_secret.json')
TOKEN_FILE = os.path.join(CREDENTIALS_DIR, 'token.json')
FOLDER_ID = '16I6c9NWchJuWUA4r-KEaOkWZzWUGYC7L'

def get_drive_service():
    """Authenticates using OAuth 2.0 and returns a Google Drive API service instance."""
    creds = None
    
    # Check if we are running in Render (using environment variables)
    env_token = os.environ.get('GOOGLE_TOKEN_JSON')
    if env_token:
        try:
            token_info = json.loads(env_token)
            creds = Credentials.from_authorized_user_info(token_info, SCOPES)
        except Exception as e:
            print(f"Error parsing GOOGLE_TOKEN_JSON from environment: {e}")
            
    # Fallback to local token.json if env variable is not set
    elif os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                # If refresh fails, fall back to re-authenticating
                print(f"Failed to refresh token: {e}")
                creds = None
                
        if not creds:
            if os.environ.get('RENDER'):
                raise ValueError(
                    "Missing or invalid GOOGLE_TOKEN_JSON environment variable. "
                    "Since this app is running on Render, it cannot open a browser to authenticate. "
                    "Please copy the exact contents of your local 'credentials/token.json' "
                    "and paste it as the GOOGLE_TOKEN_JSON environment variable in your Render dashboard."
                )
            elif not os.path.exists(CLIENT_SECRET_FILE):
                raise FileNotFoundError(
                    f"Missing {CLIENT_SECRET_FILE}. Please download OAuth 2.0 Client "
                    "credentials from Google Cloud Console and save it to this path."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
            # Run local server to receive the authorization code
            creds = flow.run_local_server(port=0)
            
        # Save the credentials for the next run
        try:
            os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
        except Exception as e:
            print(f"Warning: Could not save updated token to {TOKEN_FILE}: {e}")

    service = build('drive', 'v3', credentials=creds)
    return service

def upload_file_to_drive(file_path, file_name, mimetype):
    """
    Uploads a file to a specific Google Drive folder and sets permissions.
    Returns the file ID, view URL, and download URL.
    """
    service = get_drive_service()
    
    file_metadata = {
        'name': file_name,
        'parents': [FOLDER_ID]
    }
    media = MediaFileUpload(file_path, mimetype=mimetype, resumable=True)
    
    file = service.files().create(
        body=file_metadata, 
        media_body=media, 
        fields='id, name, webViewLink, webContentLink',
        supportsAllDrives=True
    ).execute()
    
    file_id = file.get('id')
    
    # Set permissions so anyone with the link can view
    permission = {
        'type': 'anyone',
        'role': 'reader',
    }
    service.permissions().create(
        fileId=file_id,
        body=permission,
        fields='id',
        supportsAllDrives=True
    ).execute()
    
    return {
        'fileId': file_id,
        'fileName': file.get('name'),
        'viewUrl': file.get('webViewLink'),
        'downloadUrl': file.get('webContentLink')
    }
