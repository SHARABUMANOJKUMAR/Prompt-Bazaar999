  /**
   * PROMPT BAZAAR PORTFOLIO BUILDER V3 - GOOGLE APPS SCRIPT PRODUCTION ENDPOINT
   * 
   * Instructions:
   * 1. Open your Google Sheet bound to Prompt Bazaar.
   * 2. Go to Extensions -> Apps Script.
   * 3. Replace all existing code with this script.
   * 4. Click Deploy -> New Deployment -> Select type: Web App.
   *    - Execute as: Me
   *    - Who has access: Anyone
   * 5. Copy the Web App URL and update your configuration if needed.
   */

  const CONFIG = {
    CERTIFICATE_TEMPLATE_ID: '1s4zylo0gzqmEId9nfPR9CCD9CfvhmAjXdxGZdaIo2W4', 
    CERTIFICATE_FOLDER_ID: '1TIa4W-gb0_S4xGBNbDTNbCDoPgl6_rvg', 
    SHEET_NAME: 'Academy'
  };

  function normalizeDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const t = url.trim();
    const gMatch = t.match(/drive\.google\.com\/.*(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/i);
    if (gMatch && gMatch[1]) {
      return 'https://drive.google.com/uc?export=view&id=' + gMatch[1];
    }
    if (t.indexOf('dropbox.com') !== -1 && t.indexOf('?dl=0') !== -1) {
      return t.replace('?dl=0', '?raw=1');
    }
    return t;
  }

  function logErrorToSheet(message, errorObject) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Debug Logs");
      if (!sheet) {
        sheet = ss.insertSheet("Debug Logs");
        sheet.appendRow(["Timestamp", "Message", "Error Details"]);
      }
      var errStr = errorObject ? errorObject.toString() : "";
      if (errorObject && errorObject.stack) errStr += "\n" + errorObject.stack;
      sheet.appendRow([new Date(), message, errStr]);
    } catch (e) {
      Logger.log("Failed to log error: " + e.toString());
    }
  }

  function doPost(e) {
    try {
      const postData = JSON.parse(e.postData.contents);
      const action = postData.action;

      if (action === 'enroll') {
        var email = postData.email;
        var fullName = postData.fullName || postData.name || '';
        
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Academy");
        if (!sheet) {
          sheet = ss.insertSheet("Academy");
          sheet.appendRow(["User ID", "Name", "Email", "Course ID", "Current Module", "Completed Modules", "Progress %", "Certificate Status", "Certificate ID", "QR URL", "Completion Date", "Last Updated"]);
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#f3f4f6");
        }
        
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        
        for (var i = 1; i < data.length; i++) {
          var emailIdx = headers.indexOf("Email");
          if (emailIdx > -1 && data[i][emailIdx] === email) {
            var existingUserId = headers.indexOf("User ID") > -1 ? data[i][headers.indexOf("User ID")] : "";
            return ContentService.createTextOutput(JSON.stringify({
              success: true,
              message: "User already enrolled",
              userId: existingUserId
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        
        var userId = "USER-" + Utilities.getUuid().split('-')[0].toUpperCase();
        var now = new Date();
        var newRow = new Array(headers.length).fill('');
        
        function getIdx(col) { return headers.indexOf(col); }
        if (getIdx("User ID") > -1) newRow[getIdx("User ID")] = userId;
        if (getIdx("Name") > -1) newRow[getIdx("Name")] = fullName;
        if (getIdx("Full_Name") > -1) newRow[getIdx("Full_Name")] = fullName;
        if (getIdx("Email") > -1) newRow[getIdx("Email")] = email;
        if (getIdx("Course ID") > -1) newRow[getIdx("Course ID")] = "PROMPT_ENG_MASTER";
        if (getIdx("Current Module") > -1) newRow[getIdx("Current Module")] = 1;
        if (getIdx("Completed Modules") > -1) newRow[getIdx("Completed Modules")] = 0;
        if (getIdx("Progress %") > -1) newRow[getIdx("Progress %")] = 0;
        if (getIdx("Certificate Status") > -1) newRow[getIdx("Certificate Status")] = "Not Started";
        if (getIdx("Last Updated") > -1) newRow[getIdx("Last Updated")] = now;
        
        sheet.appendRow(newRow);
        
        try {
          var subject = "Welcome to Prompt Bazaar Academy! \ud83c\udf93";
          var htmlBody = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Welcome to Prompt Bazaar Academy!</h1>
              </div>
              <div style="padding: 40px 30px; background: white; color: #0f172a;">
                <p style="font-size: 16px; line-height: 1.6;">Hi ${fullName || 'there'},</p>
                <p style="font-size: 16px; line-height: 1.6;">You have successfully enrolled in the <strong>Prompt Engineering Master Course</strong>.</p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="https://promptbazaar.netlify.app/academy" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Start Learning Now</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6;">Happy Prompting,<br><strong>The Prompt Bazaar Team</strong></p>
              </div>
            </div>
          `;
          MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
        } catch (e) {}
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          userId: userId,
          message: "Successfully enrolled"
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else if (action === 'get_academy') {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Academy");
        if (!sheet) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: "Academy sheet not found"
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var userIdIdx = headers.indexOf("User ID");
        var currentModuleIdx = headers.indexOf("Current Module");
        var completedModulesIdx = headers.indexOf("Completed Modules");
        var progressPctIdx = headers.indexOf("Progress %");
        
        var userId = postData.user_id;
        var progress = { currentModule: 1, completedModules: 0, progressPct: 0 };
        
        for (var i = 1; i < data.length; i++) {
          if (data[i][userIdIdx] === userId) {
            progress = {
              currentModule: data[i][currentModuleIdx] || 1,
              completedModules: data[i][completedModulesIdx] || 0,
              progressPct: data[i][progressPctIdx] || 0
            };
            break;
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          progress: progress
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else if (action === 'update_academy') {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Academy");
        if (!sheet) {
          // Create sheet and headers if it doesn't exist
          sheet = ss.insertSheet("Academy");
          sheet.appendRow(["User ID", "Name", "Email", "Course ID", "Current Module", "Completed Modules", "M1 Quiz", "M2 Quiz", "M3 Quiz", "M4 Quiz", "M5 Quiz", "M6 Quiz", "M7 Quiz", "M8 Quiz", "Assignment 1", "Assignment 2", "Assignment 3", "Assignment 4", "Progress %", "Certificate Status", "Certificate ID", "QR URL", "Completion Date", "Last Updated"]);
          // Freeze header
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, 24).setFontWeight("bold").setBackground("#f3f4f6");
        }
        
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var userId = postData.user_id;
        
        // Find if user exists
        var rowIndex = -1;
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === userId) {
            rowIndex = i + 1; // 1-indexed for SpreadsheetApp
            break;
          }
        }
        
        var now = new Date();
        var completed = parseInt(postData.completedModules) || 0;
        var current = parseInt(postData.currentModule) || 1;
        var pct = parseInt(postData.progressPct) || 0;
        
        // Helper function to safely set column value dynamically by header name
        function setColValue(rowNum, colName, value) {
          var colIdx = headers.indexOf(colName);
          if (colIdx > -1) {
            sheet.getRange(rowNum, colIdx + 1).setValue(value);
          } else {
            // Add new header
            headers.push(colName);
            sheet.getRange(1, headers.length).setValue(colName);
            sheet.getRange(1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
            sheet.getRange(rowNum, headers.length).setValue(value);
          }
        }
        
        if (rowIndex > -1) {
          // Update existing user
          setColValue(rowIndex, "Current Module", current);
          setColValue(rowIndex, "Completed Modules", completed);
          setColValue(rowIndex, "Progress %", pct);
          setColValue(rowIndex, "Last Updated", now);
          
          if (postData.xp !== undefined) setColValue(rowIndex, "XP Score", postData.xp);
          if (postData.phases !== undefined) setColValue(rowIndex, "Phases", postData.phases);
          if (postData.lastCompletedModule !== undefined) setColValue(rowIndex, "Last Completed Module", postData.lastCompletedModule);
          if (postData.lastCompletedLesson !== undefined) setColValue(rowIndex, "Last Completed Lesson", postData.lastCompletedLesson);
          if (postData.quizScores !== undefined) setColValue(rowIndex, "Quiz Scores", postData.quizScores);
          if (postData.assignmentLinks !== undefined) setColValue(rowIndex, "Assignment Links", postData.assignmentLinks);
          
          if (pct === 100) {
            var compDateCol = headers.indexOf("Completion Date");
            if (compDateCol > -1) {
              if (!sheet.getRange(rowIndex, compDateCol + 1).getValue()) {
                sheet.getRange(rowIndex, compDateCol + 1).setValue(now);
              }
            }
          }
        } else {
          // New user (Enrolment)
          var newRow = new Array(headers.length).fill('');
          newRow[headers.indexOf("User ID")] = userId;
          if (headers.indexOf("Name") > -1) newRow[headers.indexOf("Name")] = postData.name || '';
          if (headers.indexOf("Email") > -1) newRow[headers.indexOf("Email")] = postData.email || '';
          if (headers.indexOf("Course ID") > -1) newRow[headers.indexOf("Course ID")] = "PROMPT_ENG_MASTER";
          if (headers.indexOf("Current Module") > -1) newRow[headers.indexOf("Current Module")] = current;
          if (headers.indexOf("Completed Modules") > -1) newRow[headers.indexOf("Completed Modules")] = completed;
          if (headers.indexOf("Progress %") > -1) newRow[headers.indexOf("Progress %")] = pct;
          if (headers.indexOf("Certificate Status") > -1) newRow[headers.indexOf("Certificate Status")] = "Not Started";
          if (headers.indexOf("Last Updated") > -1) newRow[headers.indexOf("Last Updated")] = now;
          
          // Also handle new fields if enrolling (though they might not exist yet)
          sheet.appendRow(newRow);
          rowIndex = sheet.getLastRow();
          
          if (postData.xp !== undefined) setColValue(rowIndex, "XP Score", postData.xp);
          if (postData.phases !== undefined) setColValue(rowIndex, "Phases", postData.phases);
          if (postData.lastCompletedModule !== undefined) setColValue(rowIndex, "Last Completed Module", postData.lastCompletedModule);
          if (postData.lastCompletedLesson !== undefined) setColValue(rowIndex, "Last Completed Lesson", postData.lastCompletedLesson);
          if (postData.quizScores !== undefined) setColValue(rowIndex, "Quiz Scores", postData.quizScores);
          if (postData.assignmentLinks !== undefined) setColValue(rowIndex, "Assignment Links", postData.assignmentLinks);
          
          // Send Welcome Email
          try {
            var emailStr = postData.email;
            if (emailStr) {
              var subject = "Welcome to Prompt Bazaar Academy! 🎓";
              var htmlBody = `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                  <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Welcome to Prompt Bazaar Academy!</h1>
                  </div>
                  <div style="padding: 40px 30px; background: white; color: #0f172a;">
                    <p style="font-size: 16px; line-height: 1.6;">Hi ${postData.name || 'there'},</p>
                    <p style="font-size: 16px; line-height: 1.6;">You have successfully enrolled in the <strong>Prompt Engineering Master Course</strong>. We are excited to have you on board.</p>
                    <p style="font-size: 16px; line-height: 1.6;">In this 8-module course, you will learn everything from prompt fundamentals to advanced AI agent workflows.</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="https://promptbazzar.netlify.app/academy" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Start Learning Now</a>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Happy Prompting,<br><strong>The Prompt Bazaar Team</strong></p>
                  </div>
                  <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                    &copy; ${new Date().getFullYear()} Prompt Bazaar. All rights reserved.
                  </div>
                </div>
              `;
              MailApp.sendEmail({
                to: emailStr,
                subject: subject,
                htmlBody: htmlBody
              });
            }
          } catch (emailErr) {
            logErrorToSheet("Welcome Email Failed for " + userId, emailErr);
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Progress updated"
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else if (action === 'generate_certificate') {
        var email = postData.email;
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Academy");
        if (!sheet) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Academy sheet not found" })).setMimeType(ContentService.MimeType.JSON);
        }
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        
        for (var i = 1; i < data.length; i++) {
          var userEmailIdx = headers.indexOf("Email");
          if (userEmailIdx > -1 && data[i][userEmailIdx] === email) {
            var userIdIdx = headers.indexOf("User ID") > -1 ? headers.indexOf("User ID") : headers.indexOf("User_ID");
            var userId = userIdIdx > -1 ? data[i][userIdIdx] : Utilities.getUuid();
            
            var nameIdx = headers.indexOf("Name") > -1 ? headers.indexOf("Name") : (headers.indexOf("Full_Name") > -1 ? headers.indexOf("Full_Name") : headers.indexOf("Full Name"));
            var fullName = nameIdx > -1 ? data[i][nameIdx] : email;
            if (!fullName || fullName.trim() === '') fullName = email;
            
            // Generate certificate
            var result = processUserCompletion(userId, fullName, email, sheet, i + 1, headers);
            
            if (result.success) {
              return ContentService.createTextOutput(JSON.stringify({
                success: true,
                certificateUrl: result.fileUrl
              })).setMimeType(ContentService.MimeType.JSON);
            } else {
              return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: "Internal Error: " + result.error
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "User not found"
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else if (action === 'verify') {
        var certIdToVerify = postData.certificateId;
        if (!certIdToVerify) {
          return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "No certificate ID provided" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Academy");
        if (!sheet) {
           return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Database not configured properly" })).setMimeType(ContentService.MimeType.JSON);
        }
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        
        var certIdCol = headers.indexOf("Certificate ID") > -1 ? headers.indexOf("Certificate ID") : headers.indexOf("Certificate_ID");
        
        if (certIdCol === -1) {
          return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Database not configured properly" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        for (var i = 1; i < data.length; i++) {
          if (data[i][certIdCol] === certIdToVerify) {
            var certUrlCol = headers.indexOf("Certificate_URL") > -1 ? headers.indexOf("Certificate_URL") : headers.indexOf("QR URL");
            var issueDateCol = headers.indexOf("Certificate_Issued_Date") > -1 ? headers.indexOf("Certificate_Issued_Date") : headers.indexOf("Completion Date");
            var nameCol = headers.indexOf("Name") > -1 ? headers.indexOf("Name") : headers.indexOf("Full_Name");
            return ContentService.createTextOutput(JSON.stringify({
              valid: true,
              studentName: data[i][nameCol],
              issueDate: data[i][issueDateCol],
              certificateUrl: data[i][certUrlCol]
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        
        // Not found
        return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Certificate not found" })).setMimeType(ContentService.MimeType.JSON);

      } else if (action === 'save_portfolio') {
        const userId = postData.user_id || Utilities.getUuid();
        const rawData = postData.portfolio_data || postData.data || {};
        
        let uploadErrors = [];
        let pData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const personal = pData.personal || {};

        // Parse full name into First & Last Name
        const fullName = (personal.name || pData.name || '').trim();
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Normalize profile photo
        if (personal.photoUrl) personal.photoUrl = normalizeDriveUrl(personal.photoUrl);
        if (personal.photo_url) personal.photo_url = normalizeDriveUrl(personal.photo_url);
        if (pData.photo) pData.photo = normalizeDriveUrl(pData.photo);

        // Normalize project images
        if (Array.isArray(pData.projects)) {
          pData.projects.forEach(function(p) {
            if (p && p.imageUrl) p.imageUrl = normalizeDriveUrl(p.imageUrl);
          });
        }

        // Normalize certificate images
        if (Array.isArray(pData.certificates)) {
          pData.certificates.forEach(function(c) {
            if (c && c.imageUrl) c.imageUrl = normalizeDriveUrl(c.imageUrl);
          });
        }

        // Generate clean username slug if not provided
        let username = postData.username || '';
        if (!username) {
          const baseSlug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          username = baseSlug || ('user-' + Math.floor(100 + Math.random() * 900));
        }

        // Google Drive Base64 upload logic has been removed.
        // The frontend now uploads images directly to Cloudinary and sends the secure URLs.


        const email = personal.email || pData.email || '';
        const phone = personal.phone || pData.phone || '';
        let profilePhoto = '';
        const summary = pData.summary || personal.summary || '';

        // Array / string conversions
        const skills = Array.isArray(pData.skills) ? pData.skills.join(', ') : (pData.skills || '');
        const education = Array.isArray(pData.education) ? JSON.stringify(pData.education) : (pData.education || '');
        const projects = Array.isArray(pData.projects) ? JSON.stringify(pData.projects) : (pData.projects || '');
        const experience = Array.isArray(pData.experience) ? JSON.stringify(pData.experience) : (pData.experience || '');
        const certificates = Array.isArray(pData.certificates) ? JSON.stringify(pData.certificates) : (pData.certificates || '');
        const achievements = Array.isArray(pData.achievements) ? pData.achievements.map(function(a){ return typeof a === 'string' ? a : (a.description || ''); }).join('\n') : (pData.achievements || '');
        const achievementsList = Array.isArray(pData.achievements) ? pData.achievements.map(function(a){ return typeof a === 'string' ? a : (a.description || ''); }).join('\n') : (pData.achievements || '');
        // Social links
        const linkedIn = personal.linkedin || personal.linkedIn || (pData.socials && pData.socials.linkedin) || pData.linkedIn || '';
        const github = personal.github || personal.gitHub || (pData.socials && pData.socials.github) || pData.github || '';

        // Design choices & URLs
        const theme = pData.theme || pData.portfolioTheme || 'Minimal SaaS';
        const colorPalette = pData.colorPalette || pData.color_palette || '#0D6EFD';
        const font = pData.font || 'Inter';
        const resumeUrl = personal.resumeUrl || personal.resume_url || pData.resumeUrl || '';
        const portfolioUrl = postData.portfolio_url || ('https://promptbazzar.netlify.app/p/' + username);
        const customSubdomain = postData.custom_subdomain || ('https://' + username + '.promptbazzar.netlify.app/');

        const status = 'Published';
        const now = new Date();

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // Ensure headers if sheet is empty
        if (sheet.getLastRow() === 0) {
          sheet.appendRow([
            'User ID', 'First Name', 'Last Name', 'Email', 'Phone',
            'Profile Photo URL', 'Professional Summary', 'Skills', 'Education',
            'Projects', 'Experience', 'Certificates', 'Achievements',
            'LinkedIn', 'GitHub', 'Portfolio Theme', 'Color Palette', 'Font',
            'Resume URL', 'Portfolio URL', 'Custom Subdomain', 'Portfolio Status',
            'Created At', 'Updated At', 'Username Slug', 'Raw JSON'
          ]);
        }

        // Check if username already exists to update row, or append new row
        const dataRange = sheet.getDataRange().getValues();
        let foundRow = -1;
        for (let i = 1; i < dataRange.length; i++) {
          if (dataRange[i][24] === username || dataRange[i][0] === userId) {
            foundRow = i + 1;
            break;
          }
        }

        // Extract the pre-built HTML content if provided
        let htmlContent = postData.html_content || '';
        
        // Google Sheets has a hard limit of 50,000 characters per cell.
        // If the HTML includes Base64 images, it will crash the save process.
        // If it's too large, we drop it. The viewer will safely fallback to re-rendering from JSON state.
        if (htmlContent.length > 45000) {
          htmlContent = '';
        }

        let stringifiedPData = JSON.stringify(pData);
        if (stringifiedPData.length > 45000) {
          // If still too big (e.g. Drive upload failed), aggressively strip base64 to save the text data
          if (pData.photo && pData.photo.length > 500) pData.photo = '';
          if (pData.personal && pData.personal.photoUrl && pData.personal.photoUrl.length > 500) pData.personal.photoUrl = '';
          if (pData.personal && pData.personal.photo_url && pData.personal.photo_url.length > 500) pData.personal.photo_url = '';
          if (Array.isArray(pData.projects)) {
            pData.projects.forEach(p => { if (p.imageUrl && p.imageUrl.length > 500) p.imageUrl = ''; });
          }
          if (Array.isArray(pData.certificates)) {
            pData.certificates.forEach(c => { if (c.imageUrl && c.imageUrl.length > 500) c.imageUrl = ''; });
          }
          stringifiedPData = JSON.stringify(pData);
          // Fallback to avoid JSON corruption if text is inexplicably huge
          if (stringifiedPData.length > 45000) {
            pData.projects = [];
            pData.certificates = [];
            stringifiedPData = JSON.stringify(pData);
          }
        }

        const projectsStr = Array.isArray(pData.projects) ? JSON.stringify(pData.projects) : (pData.projects || '');
        const experienceStr = Array.isArray(pData.experience) ? JSON.stringify(pData.experience) : (pData.experience || '');
        const certificatesStr = Array.isArray(pData.certificates) ? JSON.stringify(pData.certificates) : (pData.certificates || '');
        
        profilePhoto = personal.photoUrl || personal.photo || pData.photo || '';

        const rowValues = [
          userId, firstName, lastName, email, phone,
          profilePhoto, summary, skills, education,
          projectsStr, experienceStr, certificatesStr, achievements,
          linkedIn, github, theme, colorPalette, font,
          resumeUrl, portfolioUrl, customSubdomain, status,
          foundRow > 0 ? dataRange[foundRow - 1][22] : now,
          now,
          username,
          stringifiedPData,
          htmlContent   // col 27: pre-built HTML portfolio
        ];

        if (foundRow > 0) {
          sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          sheet.appendRow(rowValues);
        }

        // Automated Email Delivery
        if (email && email.indexOf('@') !== -1) {
          try {
            sendPortfolioSuccessEmail(email, firstName || fullName || 'Creator', username, portfolioUrl, customSubdomain, theme);
          } catch (mailErr) {}
        }

        // Return success response
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'Portfolio successfully created/updated!',
          portfolio_url: portfolioUrl,
          username: username,
          user_id: userId,
          uploadErrors: uploadErrors
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  function doGet(e) {
    try {
      const action = e.parameter.action;
      const lookup = (e.parameter.username || e.parameter.u || e.parameter.user_id || e.parameter.slug || '').trim();

      if (action === 'get_portfolio' && lookup) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const dataRange = sheet.getDataRange().getValues();

        for (let i = 1; i < dataRange.length; i++) {
          const rowUserId = String(dataRange[i][0] || '');      // User ID (col 1)
          const rowUsername = String(dataRange[i][24] || '');   // Username Slug (col 25)
          const rowUrl = String(dataRange[i][19] || '');        // Portfolio URL (col 20)
          const rawJson = dataRange[i][25];                     // Raw JSON (col 26)
          const htmlContent = dataRange[i][26] || '';           // Pre-built HTML (col 27)

          if ((rowUsername.toLowerCase() === lookup.toLowerCase() ||
              rowUserId === lookup ||
              rowUrl.toLowerCase().indexOf('/' + lookup.toLowerCase()) !== -1) && rawJson) {
            
            let parsedJson = {};
            try {
              parsedJson = JSON.parse(rawJson);
            } catch(e) {
              parsedJson = { error: "Portfolio data corrupted", fallback: true };
            }

            return ContentService.createTextOutput(JSON.stringify({
              success: true,
              user_id: rowUserId,
              username: rowUsername,
              portfolio: parsedJson,
              html: htmlContent || null
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Portfolio not found for identifier: ' + lookup
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        service: 'Prompt Bazaar Portfolio API V3 Active'
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  function sendPortfolioSuccessEmail(recipientEmail, name, username, portfolioUrl, customSubdomain, theme) {
    const subject = "🎉 Your Custom AI Portfolio is Live on Prompt Bazaar!";
    
    const cleanPortfolioUrl = portfolioUrl || ("https://promptbazzar.netlify.app/p/" + username);
    const primarySubdomain = customSubdomain ? customSubdomain.split(',')[0].trim() : ("https://" + username + ".promptbazzar.netlify.app/");

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Portfolio is Live!</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);">
              
              <!-- Colorful Header Banner -->
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#0d6efd 0%,#6366f1 50%,#ec4899 100%);padding:48px 32px;text-align:center;">
                  <div style="font-size:42px;margin-bottom:12px;">🚀</div>
                  <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">Your Portfolio is Officially Live!</h1>
                  <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:8px 0 0 0;">Congratulations, ${name}! Your AI-crafted showcase is ready for the world.</p>
                </td>
              </tr>

              <!-- Content Area -->
              <tr>
                <td style="padding:36px 32px;color:#f8fafc;">
                  <p style="font-size:16px;line-height:1.6;color:#e2e8f0;margin-top:0;">
                    We have compiled your personal details, skills, projects, and achievements into a stunning <strong>${theme || 'Minimal SaaS'}</strong> interactive experience.
                  </p>

                  <!-- Portfolio Links Box -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin:24px 0;">
                    <tr>
                      <td style="padding:22px;">
                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px;">Direct Portfolio URL</div>
                        <a href="${cleanPortfolioUrl}" style="color:#38bdf8;font-size:15px;font-weight:600;text-decoration:none;word-break:break-all;">${cleanPortfolioUrl}</a>
                        
                        <div style="height:14px;"></div>

                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px;">Custom Subdomain</div>
                        <a href="${primarySubdomain}" style="color:#a78bfa;font-size:15px;font-weight:600;text-decoration:none;word-break:break-all;">${primarySubdomain}</a>
                      </td>
                    </tr>
                  </table>

                  <!-- Main CTA Button -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                    <tr>
                      <td align="center">
                        <a href="${cleanPortfolioUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0d6efd,#3b82f6);color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:9999px;text-decoration:none;box-shadow:0 10px 25px rgba(13,110,253,0.4);">
                          🌐 Open Your Live Portfolio
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Sharing Tips -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;margin-top:24px;">
                    <tr>
                      <td>
                        <h3 style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 12px 0;">Next Steps to Maximize Your Impact:</h3>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 8px 0;">• <strong>Add to LinkedIn:</strong> Paste your portfolio URL in your LinkedIn Featured section &amp; Contact info.</p>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 8px 0;">• <strong>Update Your Resume:</strong> Include your clean custom link at the top header of your CV.</p>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">• <strong>QR Code:</strong> Generate a Contact or URL QR code in Prompt Bazaar Tools to share instantly on your business card.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background-color:#0f172a;padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                  <p style="color:#64748b;font-size:13px;margin:0 0 6px 0;">🇮🇳 Built with ❤️ in India by <strong>Prompt Bazaar Labs</strong></p>
                  <p style="color:#475569;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Prompt Bazaar. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
      MailApp.sendEmail({
        to: recipientEmail,
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (err) {
      // Fallback if MailApp quota exceeded or not authorized
    }
  }

function generateCertificatePDF(userName, courseName, certId) {
  var step = "Initializing";
  try {
    step = "Getting Folder";
    var folder = DriveApp.getFolderById(CONFIG.CERTIFICATE_FOLDER_ID);
    
    step = "Getting Template File and Copying";
    var tempFile = DriveApp.getFileById(CONFIG.CERTIFICATE_TEMPLATE_ID).makeCopy(userName + ' - Certificate', folder);
    
    step = "Opening Slides";
    var slidePresentation = SlidesApp.openById(tempFile.getId());
    var slide = slidePresentation.getSlides()[0];
    
    step = "Replacing Text";
    slidePresentation.replaceAllText('{{NAME}}', userName);
    slidePresentation.replaceAllText('{{DATE}}', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    slidePresentation.replaceAllText('{{CERT_ID}}', certId); 
    
    step = "Fetching QR Code";
    var verificationUrl = "https://promptbazaar.netlify.app/verify?id=" + certId;
    var qrApiUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(verificationUrl) + "&size=150";
    var qrBlob = UrlFetchApp.fetch(qrApiUrl).getBlob();
    
    step = "Inserting QR Code";
    var shapes = slide.getShapes();
    for (var i = 0; i < shapes.length; i++) {
      try {
        if (shapes[i].getText().asString().indexOf("{{QR}}") !== -1) {
          slide.insertImage(qrBlob, shapes[i].getLeft(), shapes[i].getTop(), shapes[i].getWidth(), shapes[i].getHeight());
          shapes[i].remove();
          break;
        }
      } catch (shapeErr) {
        // Ignore shapes that don't support text
      }
    }
    
    step = "Saving Slides";
    slidePresentation.saveAndClose();
    
    step = "Converting to PDF";
    var pdfBlob = tempFile.getAs(MimeType.PDF);
    
    step = "Creating final PDF file";
    var finalPdfFile = folder.createFile(pdfBlob);
    finalPdfFile.setName(userName + ' - Prompt Academy Certificate.pdf');
    
    step = "Setting file sharing permissions";
    try {
      finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      Logger.log("Could not set sharing permissions: " + sharingErr);
    }
    
    step = "Trashing temporary slide file";
    tempFile.setTrashed(true);
    
    return { success: true, fileUrl: finalPdfFile.getUrl(), fileBlob: pdfBlob };
  } catch (e) {
    return { success: false, error: e.toString() + " at step: " + step };
  }
}

function processUserCompletion(userId, userName, userEmail, sheet, rowIndex, headers) {
  var certId = "PB-" + Utilities.getUuid().split('-')[0].toUpperCase() + "-" + new Date().getFullYear();
  var certResult = generateCertificatePDF(userName, "Prompt Engineering Master Course", certId);
  
  if (certResult.success) {
    // Helper to dynamically set column values
    function setColValue(rowNum, colName, value) {
      var colIdx = headers.indexOf(colName);
      if (colIdx > -1) {
        sheet.getRange(rowNum, colIdx + 1).setValue(value);
      } else {
        headers.push(colName);
        sheet.getRange(1, headers.length).setValue(colName);
        sheet.getRange(1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
        sheet.getRange(rowNum, headers.length).setValue(value);
      }
    }

    setColValue(rowIndex, "Certificate Status", "Issued");
    setColValue(rowIndex, "Certificate ID", certId);
    setColValue(rowIndex, "Certificate_URL", certResult.fileUrl);
    setColValue(rowIndex, "Certificate_Issued_Date", new Date());
    setColValue(rowIndex, "Course_Completed", "TRUE");

    return { success: true, fileUrl: certResult.fileUrl };
  }
  return { success: false, error: certResult.error };
}
