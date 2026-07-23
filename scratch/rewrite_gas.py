import re

file_path = r"c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\google_apps_script_v3.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace everything from `if (action === 'enroll') {` to `} else if (action === 'save_portfolio') {`

start_marker = "      if (action === 'enroll') {"
end_marker = "      } else if (action === 'save_portfolio') {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers!")
else:
    new_code = """      if (action === 'enroll') {
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
          var subject = "Welcome to Prompt Bazaar Academy! \\ud83c\\udf93";
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
          if (postData.completedModules !== undefined) setColValue(rowIndex, "Last_Completed_Module", postData.completedModules);
          if (postData.lastCompletedLesson !== undefined) setColValue(rowIndex, "Last_Completed_Lesson", postData.lastCompletedLesson);
          if (postData.quizScores !== undefined) setColValue(rowIndex, "Quiz_Scores", postData.quizScores);
          if (postData.assignmentLinks !== undefined) setColValue(rowIndex, "Assignment_Links", postData.assignmentLinks);
          
          if (postData.progressPct === 100) {
            setColValue(rowIndex, "Course_Completed", "TRUE");
            
            // Check if certificate exists, if not generate it
            var certIdx = headers.indexOf("Certificate_ID");
            if (certIdx > -1 && !sheet.getRange(rowIndex, certIdx + 1).getValue()) {
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

"""

    content = content[:start_idx] + new_code + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced doPost successfully.")

# Now we need to replace generateCertificatePDF and processUserCompletion
# Let's find generateCertificatePDF

cert_start_marker = "function generateCertificatePDF(userName, courseName, certId) {"

cert_start_idx = content.find(cert_start_marker)
if cert_start_idx == -1:
    print("Could not find cert marker!")
else:
    new_cert_code = """function generateCertificatePDF(userName, courseName, certId) {
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
    // Fixed QR URL to point to /academy/verify instead of just /verify, and encode properly
    var verificationUrl = "https://promptbazzar.netlify.app/academy/verify?certId=" + encodeURIComponent(certId);
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
          var subject = "Congratulations! Your Prompt Bazaar Certificate \\ud83c\\udf93";
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
"""
    
    # We replace from function generateCertificatePDF to the end of the file or up to a specific known marker.
    # Actually, the file ends after processUserCompletion.
    
    content = content[:cert_start_idx] + new_cert_code
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced certificates successfully.")
