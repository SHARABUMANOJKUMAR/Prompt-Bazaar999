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
          sheet.appendRow(["User_ID", "Email", "Full_Name", "Registration_Date", "Last_Active_Date", "Overall_Progress_Percent", "Current_Phase", "Last_Completed_Module", "Last_Completed_Lesson", "Quiz_Scores", "Assignment_Links", "Course_Completed", "Certificate_Issued_Date", "Certificate_ID", "Certificate_URL"]);
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#f3f4f6");
        }
        
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        
        for (var i = 1; i < data.length; i++) {
          var emailIdx = headers.indexOf("Email");
          if (emailIdx > -1 && data[i][emailIdx] === email) {
            var existingUserId = headers.indexOf("User_ID") > -1 ? data[i][headers.indexOf("User_ID")] : "";
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
        if (getIdx("User_ID") > -1) newRow[getIdx("User_ID")] = userId;
        if (getIdx("Email") > -1) newRow[getIdx("Email")] = email;
        if (getIdx("Full_Name") > -1) newRow[getIdx("Full_Name")] = fullName;
        if (getIdx("Registration_Date") > -1) newRow[getIdx("Registration_Date")] = now;
        if (getIdx("Last_Active_Date") > -1) newRow[getIdx("Last_Active_Date")] = now;
        if (getIdx("Overall_Progress_Percent") > -1) newRow[getIdx("Overall_Progress_Percent")] = 0;
        if (getIdx("Course_Completed") > -1) newRow[getIdx("Course_Completed")] = "FALSE";
        
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
                  <a href="https://promptbazzar.netlify.app/academy" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Start Learning Now</a>
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
        var userIdIdx = headers.indexOf("User_ID");
        var currentModuleIdx = headers.indexOf("Current_Phase");
        var completedModulesIdx = headers.indexOf("Last_Completed_Module");
        var progressPctIdx = headers.indexOf("Overall_Progress_Percent");
        
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
          sheet = ss.insertSheet("Academy");
          sheet.appendRow(["User_ID", "Email", "Full_Name", "Registration_Date", "Last_Active_Date", "Overall_Progress_Percent", "Current_Phase", "Last_Completed_Module", "Last_Completed_Lesson", "Quiz_Scores", "Assignment_Links", "Course_Completed", "Certificate_Issued_Date", "Certificate_ID", "Certificate_URL"]);
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#f3f4f6");
        }
        
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var userId = postData.user_id;
        
        var rowIndex = -1;
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === userId) {
            rowIndex = i + 1;
            break;
          }
        }
        
        var now = new Date();
        
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
        
        if (rowIndex > -1) {
          setColValue(rowIndex, "Last_Active_Date", now);
          if (postData.progressPct !== undefined) setColValue(rowIndex, "Overall_Progress_Percent", postData.progressPct);
          if (postData.currentModule !== undefined) setColValue(rowIndex, "Current_Phase", postData.currentModule);
          if (postData.lastCompletedModule !== undefined) setColValue(rowIndex, "Last_Completed_Module", postData.lastCompletedModule);
          if (postData.lastCompletedLesson !== undefined) setColValue(rowIndex, "Last_Completed_Lesson", postData.lastCompletedLesson);
          if (postData.quizScores !== undefined) setColValue(rowIndex, "Quiz_Scores", postData.quizScores);
          if (postData.assignmentLinks !== undefined) setColValue(rowIndex, "Assignment_Links", postData.assignmentLinks);
          
          if (postData.progressPct === 100) {
            setColValue(rowIndex, "Course_Completed", "TRUE");
            
            // Check if certificate exists, if not generate it
            var certIdx = headers.indexOf("Certificate_ID");
            var hasCert = (certIdx > -1) ? sheet.getRange(rowIndex, certIdx + 1).getValue() : false;
            if (!hasCert) {
                var emailIdx = headers.indexOf("Email");
                var nameIdx = headers.indexOf("Full_Name");
                var emailStr = emailIdx > -1 ? sheet.getRange(rowIndex, emailIdx + 1).getValue() : '';
                var nameStr = nameIdx > -1 ? sheet.getRange(rowIndex, nameIdx + 1).getValue() : '';
                processUserCompletion(userId, nameStr, emailStr, sheet, rowIndex, headers);
            }
          }
          
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Progress updated"
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
        
        var certIdCol = headers.indexOf("Certificate_ID");
        if (certIdCol === -1) {
          return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Database not configured properly" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        for (var i = 1; i < data.length; i++) {
          if (data[i][certIdCol] === certIdToVerify) {
            var certUrlCol = headers.indexOf("Certificate_URL");
            var issueDateCol = headers.indexOf("Certificate_Issued_Date");
            var nameCol = headers.indexOf("Full_Name");
            return ContentService.createTextOutput(JSON.stringify({
              valid: true,
              studentName: nameCol > -1 ? data[i][nameCol] : "",
              issueDate: issueDateCol > -1 ? data[i][issueDateCol] : "",
              certificateUrl: certUrlCol > -1 ? data[i][certUrlCol] : ""
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Certificate not found" })).setMimeType(ContentService.MimeType.JSON);

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
    // Fixed QR URL to point to /verify?id= and spelled with two z's
    var verificationUrl = "https://promptbazzar.netlify.app/verify?id=" + encodeURIComponent(certId);
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
    pdfBlob.setName(userName + ' - Prompt Academy Certificate.pdf');
    
    step = "Creating final PDF file";
    var finalPdfFile = folder.createFile(pdfBlob);
    
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

    setColValue(rowIndex, "Certificate_ID", certId);
    setColValue(rowIndex, "Certificate_URL", certResult.fileUrl);
    setColValue(rowIndex, "Certificate_Issued_Date", new Date());
    setColValue(rowIndex, "Course_Completed", "TRUE");

    // Send attractive certificate email
    if (userEmail) {
        try {
          var subject = "Congratulations! Your Prompt Bazaar Certificate \ud83c\udf93";
          var htmlBody = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Congratulations, ${userName || 'Student'}!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">You have successfully completed the course.</p>
              </div>
              <div style="padding: 40px 30px; background: white; color: #0f172a;">
                <p style="font-size: 16px; line-height: 1.6;">Your hard work has paid off. We are thrilled to award you your official <strong>Prompt Engineering Master Course</strong> Certificate.</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${certResult.fileUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">View & Download Certificate</a>
                </div>
                <p style="font-size: 16px; line-height: 1.6;">You can also verify your certificate online using this ID: <strong>${certId}</strong>.</p>
                <p style="font-size: 16px; line-height: 1.6;">Keep building amazing things,<br><strong>The Prompt Bazaar Team</strong></p>
              </div>
            </div>
          `;
          // Attach PDF
          MailApp.sendEmail({ 
              to: userEmail, 
              subject: subject, 
              htmlBody: htmlBody,
              attachments: [certResult.fileBlob]
          });
        } catch(e) {}
    }

    return { success: true, fileUrl: certResult.fileUrl };
  }
  return { success: false, error: certResult.error };
}
