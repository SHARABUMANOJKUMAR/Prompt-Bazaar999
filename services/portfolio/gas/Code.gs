/**
 * Portfolio Builder Pro - Google Apps Script Backend (Phase 2)
 * Orchestrator and Entry Point
 */

/**
 * Handle HTTP GET Requests (e.g. Health Check)
 */
function doGet(e) {
  return ContentService.createTextOutput("Portfolio Builder Pro API is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle HTTP OPTIONS Requests (CORS)
 */
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}

/**
 * Handle HTTP POST Requests (Form Submission)
 */
function doPost(e) {
  try {
    // 1. Parse Payload
    if (!e.postData || !e.postData.contents) {
      throw new Error("No data received.");
    }
    var payload = JSON.parse(e.postData.contents);
    
    // 2. Validate Data
    Validation.validatePayload(payload);
    
    // 3. Generate User ID
    var userId = generateUUID();
    
    // 4. Initialize Google Drive Storage
    var folders = Storage.initializeUserFolders(userId);
    
    // 5. Process File Uploads
    var driveUrls = {};
    
    // 5a. Profile Photo
    if (payload.profilePhotoBase64) {
      driveUrls.profilePhoto = Storage.uploadFile(folders.profile, payload.profilePhotoBase64, "avatar");
    }
    
    // 5b. Resume PDF
    if (payload.resumeBase64) {
      driveUrls.resume = Storage.uploadFile(folders.resume, payload.resumeBase64, "resume");
    }
    
    // 5c. Projects
    if (payload.projects && payload.projects.length > 0) {
      for (var i = 0; i < payload.projects.length; i++) {
        var proj = payload.projects[i];
        if (proj.imageBase64) {
          var key = "project_" + i;
          driveUrls[key] = Storage.uploadFile(folders.projects, proj.imageBase64, key);
        }
      }
    }
    
    // 5d. Certificates
    if (payload.certificates && payload.certificates.length > 0) {
      for (var j = 0; j < payload.certificates.length; j++) {
        var cert = payload.certificates[j];
        if (cert.imageBase64) {
          var key = "cert_" + j;
          driveUrls[key] = Storage.uploadFile(folders.certificates, cert.imageBase64, key);
        }
      }
    }
    
    // 5e. Achievements
    if (payload.achievements && payload.achievements.length > 0) {
      for (var k = 0; k < payload.achievements.length; k++) {
        var ach = payload.achievements[k];
        if (ach.imageBase64) {
          var key = "ach_" + k;
          driveUrls[key] = Storage.uploadFile(folders.achievements, ach.imageBase64, key);
        }
      }
    }
    
    // 6. Store Data in Google Sheets
    Database.savePortfolio(payload, driveUrls, folders.root.getId(), userId);
    
    // 7. Return Success Response
    var responseData = {
      message: "Portfolio data successfully saved as Draft.",
      userId: userId,
      status: "Draft",
      folderId: folders.root.getId()
    };
    
    return jsonSuccess(responseData);
    
  } catch (err) {
    // Return formatted error
    return jsonError(err.message, 400);
  }
}
