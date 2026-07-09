/**
 * Google Sheets Database Orchestration for Portfolio Builder Pro
 * Set the SPREADSHEET_ID to the ID of your Google Sheet.
 * Set the SHEET_NAME to the name of the tab containing the user data.
 */

var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // MUST BE SET BEFORE DEPLOYMENT
var SHEET_NAME = 'Users';

var Database = {
  
  /**
   * Retrieves the active sheet to interact with
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet: function() {
    return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  },

  /**
   * Gets a map of column names to column indices (0-based) from the header row (row 1)
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
   * @returns {Object} { "user_id": 0, "email": 1, ... }
   */
  getColumnMapping: function(sheet) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colMap = {};
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i].toString().trim();
      if (header !== "") {
        colMap[header] = i;
      }
    }
    return colMap;
  },

  /**
   * Checks if an email already exists in the database
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
   * @param {Object} colMap 
   * @param {string} email 
   * @returns {boolean}
   */
  emailExists: function(sheet, colMap, email) {
    if (colMap['email'] === undefined) throw new Error("Column 'email' not found in spreadsheet");
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    
    var emailData = sheet.getRange(2, colMap['email'] + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < emailData.length; i++) {
      if (emailData[i][0] === email) {
        return true;
      }
    }
    return false;
  },

  /**
   * Saves or updates the portfolio data in Google Sheets
   * @param {Object} data 
   * @param {Object} driveUrls 
   * @param {string} folderId 
   * @param {string} userId
   */
  savePortfolio: function(data, driveUrls, folderId, userId) {
    var sheet = this.getSheet();
    var colMap = this.getColumnMapping(sheet);
    
    if (this.emailExists(sheet, colMap, data.email)) {
      throw new Error("A portfolio with this email already exists.");
    }
    
    // Prepare the row array matching the spreadsheet's column width
    var rowData = new Array(Object.keys(colMap).length).fill("");
    var timestamp = new Date().toISOString();
    
    // Safely assign value by column name if it exists in the sheet
    var setVal = function(colName, value) {
      if (colMap[colName] !== undefined && value !== undefined && value !== null) {
        rowData[colMap[colName]] = value;
      }
    };
    
    // Standard properties
    setVal("user_id", userId);
    setVal("full_name", data.fullName);
    setVal("email", data.email);
    setVal("phone", data.phone);
    setVal("city", data.city);
    setVal("role", data.role);
    setVal("headline", data.headline);
    setVal("summary", data.summary);
    
    // File URLs
    setVal("avatar_url", driveUrls.profilePhoto || "");
    setVal("resume_url", driveUrls.resume || "");
    setVal("drive_folder_id", folderId);
    
    // Social Links
    if (data.socialLinks) {
      setVal("social_links_json", JSON.stringify(data.socialLinks));
    }
    
    // Arrays as JSON Strings
    if (data.skills) setVal("skills_json", JSON.stringify(data.skills));
    if (data.education) setVal("education_json", JSON.stringify(data.education));
    
    // Map project images to URLs before stringifying
    if (data.projects) {
      var mappedProjects = data.projects.map(function(proj, index) {
        var key = "project_" + index;
        if (driveUrls[key]) {
          proj.imageUrl = driveUrls[key];
        }
        return proj;
      });
      setVal("projects_json", JSON.stringify(mappedProjects));
    }
    
    if (data.experience) setVal("experience_json", JSON.stringify(data.experience));
    
    if (data.certificates) {
      var mappedCerts = data.certificates.map(function(cert, index) {
        var key = "cert_" + index;
        if (driveUrls[key]) cert.imageUrl = driveUrls[key];
        return cert;
      });
      setVal("certificates_json", JSON.stringify(mappedCerts));
    }
    
    if (data.achievements) {
      var mappedAchs = data.achievements.map(function(ach, index) {
        var key = "ach_" + index;
        if (driveUrls[key]) ach.imageUrl = driveUrls[key];
        return ach;
      });
      setVal("achievements_json", JSON.stringify(mappedAchs));
    }
    
    // System Status
    setVal("portfolio_status", "Draft");
    setVal("created_at", timestamp);
    setVal("updated_at", timestamp);
    
    // Append the row
    sheet.appendRow(rowData);
  }
};
