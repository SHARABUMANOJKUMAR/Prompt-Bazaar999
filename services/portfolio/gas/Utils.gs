/**
 * Utilities for Portfolio Builder Pro
 */

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Return a standardized JSON success response
 * @param {Object} data - Payload to return
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonSuccess(data) {
  var response = {
    success: true,
    data: data
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Return a standardized JSON error response
 * @param {string} message - Error message
 * @param {number} code - Optional error code
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonError(message, code) {
  var response = {
    success: false,
    error: message,
    code: code || 400
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Extracts filename and mimeType from a Base64 string that includes a data URI scheme
 * Example: data:image/png;base64,iVBORw0KGgo...
 * @param {string} dataUri 
 * @param {string} fallbackName 
 * @returns {Object} { blob: Blob, name: string }
 */
function base64ToBlob(dataUri, fallbackName) {
  try {
    var matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 data URI format");
    }
    var mimeType = matches[1];
    var base64Data = matches[2];
    
    // Determine extension from mimeType if possible
    var ext = "";
    if (mimeType.indexOf("image/jpeg") !== -1) ext = ".jpg";
    else if (mimeType.indexOf("image/png") !== -1) ext = ".png";
    else if (mimeType.indexOf("image/webp") !== -1) ext = ".webp";
    else if (mimeType.indexOf("application/pdf") !== -1) ext = ".pdf";
    
    var fileName = fallbackName + ext;
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    return blob;
  } catch(e) {
    throw new Error("Failed to parse base64 file: " + e.message);
  }
}
