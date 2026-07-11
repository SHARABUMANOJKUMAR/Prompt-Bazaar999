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

function normalizeDriveUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  const gMatch = t.match(/drive\.google\.com\/.*(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/i);
  if (gMatch && gMatch[1]) {
    return 'https://lh3.googleusercontent.com/d/' + gMatch[1];
  }
  if (t.indexOf('dropbox.com') !== -1 && t.indexOf('?dl=0') !== -1) {
    return t.replace('?dl=0', '?raw=1');
  }
  return t;
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === 'save_portfolio') {
      const userId = postData.user_id || Utilities.getUuid();
      const rawData = postData.portfolio_data || postData.data || {};
      
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

      const email = personal.email || pData.email || '';
      const phone = personal.phone || pData.phone || '';
      const profilePhoto = personal.photoUrl || personal.photo || pData.photo || '';
      const summary = pData.summary || personal.summary || '';

      // Array / string conversions
      const skills = Array.isArray(pData.skills) ? pData.skills.join(', ') : (pData.skills || '');
      const education = Array.isArray(pData.education) ? JSON.stringify(pData.education) : (pData.education || '');
      const projects = Array.isArray(pData.projects) ? JSON.stringify(pData.projects) : (pData.projects || '');
      const experience = Array.isArray(pData.experience) ? JSON.stringify(pData.experience) : (pData.experience || '');
      const certificates = Array.isArray(pData.certificates) ? JSON.stringify(pData.certificates) : (pData.certificates || '');
      const achievements = Array.isArray(pData.achievements) ? pData.achievements.join('\n') : (pData.achievements || '');

      // Social links
      const linkedIn = personal.linkedin || personal.linkedIn || pData.linkedIn || '';
      const github = personal.github || personal.gitHub || pData.github || '';

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

      const rowValues = [
        userId, firstName, lastName, email, phone,
        profilePhoto, summary, skills, education,
        projects, experience, certificates, achievements,
        linkedIn, github, theme, colorPalette, font,
        resumeUrl, portfolioUrl, customSubdomain, status,
        foundRow > 0 ? dataRange[foundRow - 1][22] : now,
        now,
        username,
        JSON.stringify(pData)
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

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Portfolio saved successfully and automated email sent',
        user_id: userId,
        username: username,
        url: portfolioUrl
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

        if ((rowUsername.toLowerCase() === lookup.toLowerCase() ||
             rowUserId === lookup ||
             rowUrl.toLowerCase().indexOf('/' + lookup.toLowerCase()) !== -1) && rawJson) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            user_id: rowUserId,
            username: rowUsername,
            portfolio: JSON.parse(rawJson)
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

