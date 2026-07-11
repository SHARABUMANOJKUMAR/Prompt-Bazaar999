import requests
import json
import logging

logger = logging.getLogger(__name__)

APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzVOqOCQuvLHp59mBKes38ZJ9WouIKVDf6GN1MxF_DOjMdJFrX14sknQjMoYppdIBzy/exec"

def save_portfolio_data(user_id, username, portfolio_data, html_content):
    """
    Saves the portfolio data via Apps Script to Google Sheets and triggers the email.
    """
    if isinstance(portfolio_data, dict):
        personal = portfolio_data.get('personal', {})
        photo_val = personal.get('photoUrl', '') or personal.get('photo_url', '') or personal.get('photo', '')
        resume_val = personal.get('resumeUrl', '') or personal.get('resume_url', '') or personal.get('resume', '') or portfolio_data.get('resumeUrl', '')
        personal['photo'] = photo_val
        personal['photoUrl'] = photo_val
        personal['photo_url'] = photo_val
        personal['resumeUrl'] = resume_val
        personal['resume_url'] = resume_val
        personal['resume'] = resume_val
        portfolio_data['personal'] = personal

        # Normalize design choices & resume at root level
        portfolio_data['colorPalette'] = portfolio_data.get('colorPalette') or portfolio_data.get('color_palette') or '#0D6EFD'
        portfolio_data['font'] = portfolio_data.get('font') or 'Inter'
        portfolio_data['theme'] = portfolio_data.get('theme') or 'Minimal'
        portfolio_data['resumeUrl'] = resume_val

    portfolio_url = f"https://prompt-bazaar.web.app/portfolio-viewer?u={username}"
    custom_subdomain = f"https://{username}.prompt-bazaar.web.app/"

    payload = {
        "action": "save_portfolio",
        "user_id": user_id,
        "username": username,
        "portfolio_url": portfolio_url,
        "custom_subdomain": custom_subdomain,
        "portfolio_data": json.dumps(portfolio_data),
        "html_content": html_content
    }
    
    try:
        response = requests.post(
            APPS_SCRIPT_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30,
            allow_redirects=True
        )
        if response.status_code == 200:
            return True
        else:
            logger.error(f"Failed to save portfolio data via GAS. Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Exception during GAS save_portfolio: {e}")
        return False
