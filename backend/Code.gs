/**
 * ====================================================
 * PROMPT BAZAAR ACADEMY - ENTERPRISE BACKEND GENERATOR
 * GOOGLE APPS SCRIPT - SINGLE FILE - PRODUCTION READY
 * ====================================================
 */

// ====================================================
// 1. CONFIGURATION
// ====================================================
const CONFIG = {
  SHEET_NAME: "AcademyDB",
  VERSION: "1.0",
  ADMIN_EMAIL: "admin@promptbazaar.com", // Customize as needed
  TOTAL_COLUMNS: 31,
  COLUMNS: {
    RecordID: 0,
    CourseID: 1,
    CourseName: 2,
    CourseSlug: 3,
    CourseCategory: 4,
    CourseLevel: 5,
    CourseThumbnail: 6,
    CourseDescription: 7,
    ModuleID: 8,
    ModuleNumber: 9,
    ModuleTitle: 10,
    ModuleDescription: 11,
    LessonID: 12,
    LessonNumber: 13,
    LessonTitle: 14,
    LessonContent: 15,
    LessonDuration: 16,
    LessonVideoURL: 17,
    LessonResources: 18,
    MCQQuestions: 19,
    AssignmentQuestions: 20,
    PracticalTask: 21,
    LearningObjectives: 22,
    Prerequisites: 23,
    OrderIndex: 24,
    IsFree: 25,
    IsPublished: 26,
    Status: 27,
    CreatedBy: 28,
    CreatedAt: 29,
    UpdatedAt: 30
  }
};

// ====================================================
// 2. ROUTER
// ====================================================
function doPost(e) {
  return handleRequest(e, "POST");
}

function doGet(e) {
  return handleRequest(e, "GET");
}

function handleRequest(e, method) {
  const startTime = new Date().getTime();
  let action = "UNKNOWN";

  try {
    let payload = {};
    
    // Parse Payload
    if (method === "POST" && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        return errorResponse("Invalid JSON payload", 400);
      }
    } else if (method === "GET") {
      payload = e.parameter;
    }

    action = payload.action;
    if (!action) {
      return errorResponse("Missing 'action' parameter", 400);
    }

    let result;
    
    // API Routing
    switch (action) {
      case "health": result = apiHealth(); break;
      case "createCourse": result = apiCreateCourse(payload); break;
      case "updateCourse": result = apiUpdateCourse(payload); break;
      case "deleteCourse": result = apiDeleteCourse(payload); break;
      case "publishCourse": result = apiPublishCourse(payload); break;
      case "unpublishCourse": result = apiUnpublishCourse(payload); break;
      
      case "createModule": result = apiCreateModule(payload); break;
      case "updateModule": result = apiUpdateModule(payload); break;
      case "deleteModule": result = apiDeleteModule(payload); break;
      
      case "createLesson": result = apiCreateLesson(payload); break;
      case "updateLesson": result = apiUpdateLesson(payload); break;
      case "deleteLesson": result = apiDeleteLesson(payload); break;
      
      case "addMCQs": result = apiUpdateField(payload, "MCQQuestions"); break;
      case "updateMCQs": result = apiUpdateField(payload, "MCQQuestions"); break;
      case "deleteMCQs": result = apiClearField(payload, "MCQQuestions"); break;
      
      case "addAssignments": result = apiUpdateField(payload, "AssignmentQuestions"); break;
      case "updateAssignments": result = apiUpdateField(payload, "AssignmentQuestions"); break;
      case "deleteAssignments": result = apiClearField(payload, "AssignmentQuestions"); break;
      
      case "getCourse": result = apiGetCourse(payload); break;
      case "getModule": result = apiGetModule(payload); break;
      case "getLesson": result = apiGetLesson(payload); break;
      case "getAllCourses": result = apiGetAllCourses(payload); break;
      case "getPublishedCourses": result = apiGetPublishedCourses(payload); break;
      
      case "searchCourse": result = apiSearch(payload, "Course"); break;
      case "searchModule": result = apiSearch(payload, "Module"); break;
      case "searchLesson": result = apiSearch(payload, "Lesson"); break;
      
      default:
        return errorResponse("Unknown action: " + action, 400);
    }
    
    logExecution(action, "SUCCESS", new Date().getTime() - startTime);
    return successResponse(result.data, result.message);
    
  } catch (error) {
    logExecution(action, "ERROR", new Date().getTime() - startTime, error.message);
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

// ====================================================
// 3. RESPONSE HELPERS
// ====================================================
function successResponse(data, message = "Success") {
  const response = {
    success: true,
    message: message,
    data: data || {},
    timestamp: new Date().toISOString(),
    version: CONFIG.VERSION
  };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, code = 400) {
  const response = {
    success: false,
    message: message,
    data: { errorCode: code },
    timestamp: new Date().toISOString(),
    version: CONFIG.VERSION
  };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// ====================================================
// 4. DATABASE HELPERS
// ====================================================
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    // Auto-initialize
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = new Array(CONFIG.TOTAL_COLUMNS).fill("");
    for (const key in CONFIG.COLUMNS) {
      headers[CONFIG.COLUMNS[key]] = key;
    }
    sheet.appendRow(headers);
    // Format headers
    sheet.getRange(1, 1, 1, CONFIG.TOTAL_COLUMNS).setFontWeight("bold").setBackground("#F3F4F6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAllRecords() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  data.shift(); // Remove headers
  return data;
}

function saveRecord(recordArray) {
  const sheet = getSheet();
  sheet.appendRow(recordArray);
}

function updateRecord(recordId, updatedArray) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLUMNS.RecordID] === recordId) {
      sheet.getRange(i + 1, 1, 1, CONFIG.TOTAL_COLUMNS).setValues([updatedArray]);
      return true;
    }
  }
  return false;
}

function deleteRecordFromDB(recordId) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLUMNS.RecordID] === recordId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// Map array to object
function rowToObject(row) {
  const obj = {};
  for (const key in CONFIG.COLUMNS) {
    obj[key] = row[CONFIG.COLUMNS[key]];
  }
  return obj;
}

// Map object to array
function objectToRow(obj) {
  const row = new Array(CONFIG.TOTAL_COLUMNS).fill("");
  for (const key in CONFIG.COLUMNS) {
    if (obj[key] !== undefined) {
      row[CONFIG.COLUMNS[key]] = obj[key];
    }
  }
  return row;
}

// ====================================================
// 5. UTILITIES & VALIDATION
// ====================================================
function generateID(prefix) {
  return prefix + "_" + Utilities.getUuid().split("-")[0].toUpperCase();
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

function validateRequired(payload, fields) {
  for (const field of fields) {
    if (!payload[field] || payload[field].toString().trim() === "") {
      throw new Error(`Field '${field}' is required.`);
    }
  }
}

function validateURL(url) {
  if (!url) return true;
  const pattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  if (!pattern.test(url)) throw new Error(`Invalid URL format: ${url}`);
  return true;
}

function validateDuration(duration) {
  if (!duration) return true;
  const pattern = /^([0-9]{2,3}):([0-5][0-9])(:([0-5][0-9]))?$/;
  if (!pattern.test(duration)) throw new Error("Invalid duration format. Expected MM:SS or HH:MM:SS");
  return true;
}

function validateOrderIndex(index) {
  if (index !== undefined && index !== null && isNaN(parseInt(index))) {
    throw new Error("OrderIndex must be a number");
  }
}

function validateDuplicateID(idField, idValue) {
  const records = getAllRecords();
  for (const row of records) {
    if (row[CONFIG.COLUMNS[idField]] === idValue) {
      if (idField === "CourseID" && !row[CONFIG.COLUMNS.ModuleID]) throw new Error(`Duplicate ${idField}: ${idValue}`);
      if (idField === "ModuleID" && !row[CONFIG.COLUMNS.LessonID]) throw new Error(`Duplicate ${idField}: ${idValue}`);
      if (idField === "LessonID") throw new Error(`Duplicate ${idField}: ${idValue}`);
    }
  }
}

function findEntity(idType, idValue) {
  const records = getAllRecords();
  for (const row of records) {
    if (row[CONFIG.COLUMNS[idType]] === idValue) {
      // Differentiate the core entity
      if (idType === "CourseID" && row[CONFIG.COLUMNS.ModuleID]) continue; 
      if (idType === "ModuleID" && row[CONFIG.COLUMNS.LessonID]) continue; 
      return rowToObject(row);
    }
  }
  throw new Error(`Entity not found with ${idType}: ${idValue}`);
}

// ====================================================
// 6. API IMPLEMENTATIONS (CRUD)
// ====================================================

function apiHealth() {
  return { message: "API is healthy and running.", data: { status: "OK", timestamp: new Date().toISOString() } };
}

// --- COURSE ---
function apiCreateCourse(payload) {
  validateRequired(payload, ["CourseName"]);
  if(payload.CourseThumbnail) validateURL(payload.CourseThumbnail);
  validateOrderIndex(payload.OrderIndex);
  
  const courseId = payload.CourseID || generateID("CRS");
  if(payload.CourseID) validateDuplicateID("CourseID", courseId);

  const newCourse = {
    RecordID: generateID("REC"),
    CourseID: courseId,
    CourseName: sanitize(payload.CourseName),
    CourseSlug: sanitize(payload.CourseSlug) || sanitize(payload.CourseName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    CourseCategory: sanitize(payload.CourseCategory),
    CourseLevel: sanitize(payload.CourseLevel),
    CourseThumbnail: sanitize(payload.CourseThumbnail),
    CourseDescription: sanitize(payload.CourseDescription),
    OrderIndex: payload.OrderIndex || 0,
    IsFree: payload.IsFree || false,
    IsPublished: false,
    Status: "DRAFT",
    CreatedBy: sanitize(payload.CreatedBy) || "Admin",
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };

  saveRecord(objectToRow(newCourse));
  return { message: "Course created successfully", data: newCourse };
}

function apiUpdateCourse(payload) {
  validateRequired(payload, ["CourseID"]);
  const course = findEntity("CourseID", payload.CourseID);
  
  if(payload.CourseThumbnail) validateURL(payload.CourseThumbnail);
  validateOrderIndex(payload.OrderIndex);

  const updatable = ["CourseName", "CourseSlug", "CourseCategory", "CourseLevel", "CourseThumbnail", "CourseDescription", "OrderIndex", "IsFree", "Status"];
  for (const field of updatable) {
    if (payload[field] !== undefined) course[field] = sanitize(payload[field]);
  }
  course.UpdatedAt = new Date().toISOString();
  
  updateRecord(course.RecordID, objectToRow(course));
  return { message: "Course updated successfully", data: course };
}

function apiDeleteCourse(payload) {
  validateRequired(payload, ["CourseID"]);
  const courseId = payload.CourseID;
  
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][CONFIG.COLUMNS.CourseID] === courseId) {
      rowsToDelete.push(i + 1);
    }
  }
  
  if (rowsToDelete.length === 0) throw new Error("Course not found");
  rowsToDelete.forEach(rowIdx => sheet.deleteRow(rowIdx));
  
  return { message: "Course and related modules/lessons deleted successfully", data: { deletedRows: rowsToDelete.length } };
}

function apiPublishCourse(payload) {
  validateRequired(payload, ["CourseID"]);
  const course = findEntity("CourseID", payload.CourseID);
  
  course.IsPublished = true;
  course.Status = "PUBLISHED";
  course.UpdatedAt = new Date().toISOString();
  
  updateRecord(course.RecordID, objectToRow(course));
  sendCoursePublishedEmail(course);
  
  return { message: "Course published successfully", data: course };
}

function apiUnpublishCourse(payload) {
  validateRequired(payload, ["CourseID"]);
  const course = findEntity("CourseID", payload.CourseID);
  
  course.IsPublished = false;
  course.Status = "DRAFT";
  course.UpdatedAt = new Date().toISOString();
  
  updateRecord(course.RecordID, objectToRow(course));
  return { message: "Course unpublished successfully", data: course };
}

// --- MODULE ---
function apiCreateModule(payload) {
  validateRequired(payload, ["CourseID", "ModuleTitle"]);
  const course = findEntity("CourseID", payload.CourseID);
  validateOrderIndex(payload.OrderIndex);
  
  const moduleId = payload.ModuleID || generateID("MOD");
  if(payload.ModuleID) validateDuplicateID("ModuleID", moduleId);

  const newModule = {
    RecordID: generateID("REC"),
    CourseID: course.CourseID,
    ModuleID: moduleId,
    ModuleNumber: payload.ModuleNumber || 1,
    ModuleTitle: sanitize(payload.ModuleTitle),
    ModuleDescription: sanitize(payload.ModuleDescription),
    OrderIndex: payload.OrderIndex || 0,
    Status: "ACTIVE",
    CreatedBy: sanitize(payload.CreatedBy) || "Admin",
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };

  saveRecord(objectToRow(newModule));
  return { message: "Module created successfully", data: newModule };
}

function apiUpdateModule(payload) {
  validateRequired(payload, ["ModuleID"]);
  const mod = findEntity("ModuleID", payload.ModuleID);
  validateOrderIndex(payload.OrderIndex);
  
  const updatable = ["ModuleTitle", "ModuleDescription", "ModuleNumber", "OrderIndex", "Status"];
  for (const field of updatable) {
    if (payload[field] !== undefined) mod[field] = sanitize(payload[field]);
  }
  mod.UpdatedAt = new Date().toISOString();
  
  updateRecord(mod.RecordID, objectToRow(mod));
  return { message: "Module updated successfully", data: mod };
}

function apiDeleteModule(payload) {
  validateRequired(payload, ["ModuleID"]);
  const moduleId = payload.ModuleID;
  
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][CONFIG.COLUMNS.ModuleID] === moduleId) {
      rowsToDelete.push(i + 1);
    }
  }
  
  if (rowsToDelete.length === 0) throw new Error("Module not found");
  rowsToDelete.forEach(rowIdx => sheet.deleteRow(rowIdx));
  
  return { message: "Module and related lessons deleted successfully", data: { deletedRows: rowsToDelete.length } };
}

// --- LESSON ---
function apiCreateLesson(payload) {
  validateRequired(payload, ["ModuleID", "LessonTitle"]);
  const mod = findEntity("ModuleID", payload.ModuleID);
  
  if(payload.LessonVideoURL) validateURL(payload.LessonVideoURL);
  if(payload.LessonDuration) validateDuration(payload.LessonDuration);
  validateOrderIndex(payload.OrderIndex);

  const lessonId = payload.LessonID || generateID("LSN");
  if(payload.LessonID) validateDuplicateID("LessonID", lessonId);

  const newLesson = {
    RecordID: generateID("REC"),
    CourseID: mod.CourseID,
    ModuleID: mod.ModuleID,
    LessonID: lessonId,
    LessonNumber: payload.LessonNumber || 1,
    LessonTitle: sanitize(payload.LessonTitle),
    LessonContent: sanitize(payload.LessonContent),
    LessonDuration: payload.LessonDuration || "00:00",
    LessonVideoURL: sanitize(payload.LessonVideoURL),
    LessonResources: sanitize(payload.LessonResources),
    LearningObjectives: sanitize(payload.LearningObjectives),
    Prerequisites: sanitize(payload.Prerequisites),
    OrderIndex: payload.OrderIndex || 0,
    Status: "ACTIVE",
    CreatedBy: sanitize(payload.CreatedBy) || "Admin",
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };

  saveRecord(objectToRow(newLesson));
  return { message: "Lesson created successfully", data: newLesson };
}

function apiUpdateLesson(payload) {
  validateRequired(payload, ["LessonID"]);
  const lesson = findEntity("LessonID", payload.LessonID);
  
  if(payload.LessonVideoURL) validateURL(payload.LessonVideoURL);
  if(payload.LessonDuration) validateDuration(payload.LessonDuration);
  validateOrderIndex(payload.OrderIndex);

  const updatable = ["LessonTitle", "LessonContent", "LessonNumber", "LessonDuration", "LessonVideoURL", "LessonResources", "LearningObjectives", "Prerequisites", "OrderIndex", "Status"];
  for (const field of updatable) {
    if (payload[field] !== undefined) lesson[field] = sanitize(payload[field]);
  }
  lesson.UpdatedAt = new Date().toISOString();
  
  updateRecord(lesson.RecordID, objectToRow(lesson));
  return { message: "Lesson updated successfully", data: lesson };
}

function apiDeleteLesson(payload) {
  validateRequired(payload, ["LessonID"]);
  const lesson = findEntity("LessonID", payload.LessonID);
  deleteRecordFromDB(lesson.RecordID);
  return { message: "Lesson deleted successfully", data: { deletedLessonID: lesson.LessonID } };
}

// --- EXTRAS (MCQ, ASSIGNMENTS) ---
function apiUpdateField(payload, fieldName) {
  validateRequired(payload, ["LessonID", fieldName]);
  const lesson = findEntity("LessonID", payload.LessonID);
  
  // Validate JSON string
  try {
    if (typeof payload[fieldName] === "object") {
      lesson[fieldName] = JSON.stringify(payload[fieldName]);
    } else {
      JSON.parse(payload[fieldName]); 
      lesson[fieldName] = payload[fieldName];
    }
  } catch (err) {
    throw new Error(`Invalid JSON format for ${fieldName}`);
  }
  
  lesson.UpdatedAt = new Date().toISOString();
  updateRecord(lesson.RecordID, objectToRow(lesson));
  return { message: `${fieldName} updated successfully`, data: lesson };
}

function apiClearField(payload, fieldName) {
  validateRequired(payload, ["LessonID"]);
  const lesson = findEntity("LessonID", payload.LessonID);
  lesson[fieldName] = "";
  lesson.UpdatedAt = new Date().toISOString();
  updateRecord(lesson.RecordID, objectToRow(lesson));
  return { message: `${fieldName} deleted successfully`, data: lesson };
}

// ====================================================
// 7. GETTERS & SEARCH
// ====================================================

function apiGetCourse(payload) {
  validateRequired(payload, ["CourseID"]);
  const records = getAllRecords();
  const course = records.find(r => r[CONFIG.COLUMNS.CourseID] === payload.CourseID && !r[CONFIG.COLUMNS.ModuleID]);
  if (!course) throw new Error("Course not found");
  
  const tree = rowToObject(course);
  tree.Modules = buildCourseTree(records, payload.CourseID);
  
  return { message: "Course retrieved", data: tree };
}

function buildCourseTree(records, courseId) {
  const modules = records.filter(r => r[CONFIG.COLUMNS.CourseID] === courseId && r[CONFIG.COLUMNS.ModuleID] && !r[CONFIG.COLUMNS.LessonID]).map(rowToObject);
  const lessons = records.filter(r => r[CONFIG.COLUMNS.CourseID] === courseId && r[CONFIG.COLUMNS.LessonID]).map(rowToObject);
  
  modules.sort((a, b) => (parseInt(a.OrderIndex) || 0) - (parseInt(b.OrderIndex) || 0));
  lessons.sort((a, b) => (parseInt(a.OrderIndex) || 0) - (parseInt(b.OrderIndex) || 0));
  
  modules.forEach(mod => {
    mod.Lessons = lessons.filter(l => l.ModuleID === mod.ModuleID);
  });
  
  return modules;
}

function apiGetModule(payload) {
  validateRequired(payload, ["ModuleID"]);
  const records = getAllRecords();
  const mod = records.find(r => r[CONFIG.COLUMNS.ModuleID] === payload.ModuleID && !r[CONFIG.COLUMNS.LessonID]);
  if (!mod) throw new Error("Module not found");
  
  const modObj = rowToObject(mod);
  const lessons = records.filter(r => r[CONFIG.COLUMNS.ModuleID] === payload.ModuleID && r[CONFIG.COLUMNS.LessonID]).map(rowToObject);
  lessons.sort((a, b) => (parseInt(a.OrderIndex) || 0) - (parseInt(b.OrderIndex) || 0));
  modObj.Lessons = lessons;
  
  return { message: "Module retrieved", data: modObj };
}

function apiGetLesson(payload) {
  validateRequired(payload, ["LessonID"]);
  const lessonObj = findEntity("LessonID", payload.LessonID);
  return { message: "Lesson retrieved", data: lessonObj };
}

function apiGetAllCourses(payload) {
  const records = getAllRecords();
  let courses = records.filter(r => r[CONFIG.COLUMNS.CourseID] && !r[CONFIG.COLUMNS.ModuleID]).map(rowToObject);
  courses = applySorting(courses, payload.SortBy);
  return { message: "Courses retrieved", data: { count: courses.length, courses: courses } };
}

function apiGetPublishedCourses(payload) {
  const records = getAllRecords();
  let courses = records.filter(r => r[CONFIG.COLUMNS.CourseID] && !r[CONFIG.COLUMNS.ModuleID] && String(r[CONFIG.COLUMNS.IsPublished]) === "true").map(rowToObject);
  courses = applySorting(courses, payload.SortBy);
  return { message: "Published courses retrieved", data: { count: courses.length, courses: courses } };
}

function apiSearch(payload, entityType) {
  const records = getAllRecords();
  let entities = [];
  
  if (entityType === "Course") {
    entities = records.filter(r => r[CONFIG.COLUMNS.CourseID] && !r[CONFIG.COLUMNS.ModuleID]).map(rowToObject);
  } else if (entityType === "Module") {
    entities = records.filter(r => r[CONFIG.COLUMNS.ModuleID] && !r[CONFIG.COLUMNS.LessonID]).map(rowToObject);
  } else if (entityType === "Lesson") {
    entities = records.filter(r => r[CONFIG.COLUMNS.LessonID]).map(rowToObject);
  }
  
  if (payload.Query) {
    const q = payload.Query.toLowerCase();
    entities = entities.filter(e => {
      const nameMatch = (e.CourseName && e.CourseName.toLowerCase().includes(q)) || 
                        (e.ModuleTitle && e.ModuleTitle.toLowerCase().includes(q)) || 
                        (e.LessonTitle && e.LessonTitle.toLowerCase().includes(q));
      const descMatch = (e.CourseDescription && e.CourseDescription.toLowerCase().includes(q));
      return nameMatch || descMatch;
    });
  }
  
  if (payload.Category && entityType === "Course") {
    entities = entities.filter(e => e.CourseCategory === payload.Category);
  }
  if (payload.Level && entityType === "Course") {
    entities = entities.filter(e => e.CourseLevel === payload.Level);
  }
  if (payload.Status) {
    entities = entities.filter(e => e.Status === payload.Status);
  }
  
  entities = applySorting(entities, payload.SortBy);
  
  return { message: "Search completed", data: { count: entities.length, results: entities } };
}

function applySorting(array, sortBy) {
  if (!sortBy) return array;
  
  return array.sort((a, b) => {
    switch (sortBy) {
      case "Newest": return new Date(b.CreatedAt) - new Date(a.CreatedAt);
      case "Oldest": return new Date(a.CreatedAt) - new Date(b.CreatedAt);
      case "Alphabetical":
        const nameA = a.CourseName || a.ModuleTitle || a.LessonTitle || "";
        const nameB = b.CourseName || b.ModuleTitle || b.LessonTitle || "";
        return nameA.localeCompare(nameB);
      case "OrderIndex":
        return (parseInt(a.OrderIndex) || 0) - (parseInt(b.OrderIndex) || 0);
      default: return 0;
    }
  });
}

// ====================================================
// 8. EMAIL AUTOMATION
// ====================================================
function sendCoursePublishedEmail(course) {
  try {
    const adminEmail = Session.getActiveUser().getEmail() || CONFIG.ADMIN_EMAIL;
    if (!adminEmail) return;
    
    const subject = `🚀 New Course Published: ${course.CourseName}`;
    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; margin: 0;">Prompt Bazaar Academy</h1>
          <p style="color: #6B7280; font-size: 14px;">Enterprise Learning Management System</p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Course Published Successfully!</h2>
          <p style="color: #374151; line-height: 1.6;">
            Your course <strong>${course.CourseName}</strong> has been officially published and is now live.
          </p>
          <ul style="color: #4B5563; padding-left: 20px; line-height: 1.6;">
            <li><strong>Course ID:</strong> ${course.CourseID}</li>
            <li><strong>Category:</strong> ${course.CourseCategory || 'N/A'}</li>
            <li><strong>Level:</strong> ${course.CourseLevel || 'N/A'}</li>
            <li><strong>Published By:</strong> ${course.CreatedBy}</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Course Dashboard</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
          <p>This is an automated message from your Enterprise Backend.</p>
          <p>&copy; ${new Date().getFullYear()} Prompt Bazaar Academy. All rights reserved.</p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: adminEmail,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    logExecution("sendCoursePublishedEmail", "ERROR", 0, e.message);
  }
}

// ====================================================
// 9. LOGGING
// ====================================================
function logExecution(action, status, durationMs, errorMsg = "") {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheetName = "SystemLogs";
    let logSheet = ss.getSheetByName(logSheetName);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(logSheetName);
      logSheet.appendRow(["Timestamp", "Action", "Status", "Duration (ms)", "ErrorMessage"]);
      logSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#F3F4F6");
      logSheet.setFrozenRows(1);
    }
    
    logSheet.appendRow([
      new Date().toISOString(),
      action,
      status,
      durationMs,
      errorMsg
    ]);
  } catch(e) {
    // Fail silently for logs to not crash main execution
  }
}
