from utils.drive import get_drive_service

if __name__ == "__main__":
    print("Starting authentication flow...")
    service = get_drive_service()
    print("Authentication successful! token.json has been created.")
