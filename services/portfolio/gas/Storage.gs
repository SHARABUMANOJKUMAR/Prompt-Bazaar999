/**
 * Google Drive Storage Orchestration for Portfolio Builder Pro
 * Set the ROOT_FOLDER_ID to a folder where all user portfolios will be saved.
 */

var ROOT_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // MUST BE SET BEFORE DEPLOYMENT

var Storage = {
  
  /**
   * Retrieves or creates a folder by name within a parent folder
   * @param {GoogleAppsScript.Drive.Folder} parentFolder 
   * @param {string} folderName 
   * @returns {GoogleAppsScript.Drive.Folder}
   */
  getOrCreateFolder: function(parentFolder, folderName) {
    var folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return parentFolder.createFolder(folderName);
  },

  /**
   * Initializes the user's root folder and nested sub-folders
   * @param {string} userId 
   * @returns {Object} Map of created folders { root, profile, certificates, achievements, projects, resume }
   */
  initializeUserFolders: function(userId) {
    var rootDir = DriveApp.getFolderById(ROOT_FOLDER_ID);
    
    // User root folder
    var userFolder = this.getOrCreateFolder(rootDir, userId);
    
    // Sub-folders
    var folders = {
      root: userFolder,
      profile: this.getOrCreateFolder(userFolder, "Profile"),
      certificates: this.getOrCreateFolder(userFolder, "Certificates"),
      achievements: this.getOrCreateFolder(userFolder, "Achievements"),
      projects: this.getOrCreateFolder(userFolder, "Projects"),
      resume: this.getOrCreateFolder(userFolder, "Resume")
    };
    
    return folders;
  },

  /**
   * Uploads a file from Base64 string to a specific folder and makes it publicly viewable.
   * @param {GoogleAppsScript.Drive.Folder} folder 
   * @param {string} base64DataUri 
   * @param {string} fileNamePrefix 
   * @returns {string} Public URL of the uploaded file
   */
  uploadFile: function(folder, base64DataUri, fileNamePrefix) {
    if (!base64DataUri) return null;
    
    var timestamp = new Date().getTime();
    var fallbackName = fileNamePrefix + "_" + timestamp;
    
    var blob = base64ToBlob(base64DataUri, fallbackName);
    var file = folder.createFile(blob);
    
    // Set sharing to Anyone with the link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return direct download/view URL
    // Format: https://drive.google.com/uc?id=FILE_ID
    return "https://drive.google.com/uc?id=" + file.getId();
  }
};
