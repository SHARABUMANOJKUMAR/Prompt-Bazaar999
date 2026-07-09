/**
 * Validation logic for Portfolio Builder Pro
 */

var Validation = {
  
  /**
   * Validate standard email format
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail: function(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Validate E.164 phone number format (optional fields return true if empty)
   * @param {string} phone 
   * @returns {boolean}
   */
  isValidPhone: function(phone) {
    if (!phone) return true; // Phone is optional in PRD
    var re = /^\+?[1-9]\d{1,14}$/;
    return re.test(phone.replace(/[\s\-\(\)]/g, ''));
  },

  /**
   * Validate GitHub URL
   * @param {string} url 
   * @returns {boolean}
   */
  isValidGitHub: function(url) {
    if (!url) return true;
    return url.indexOf('github.com/') !== -1;
  },

  /**
   * Validate LinkedIn URL
   * @param {string} url 
   * @returns {boolean}
   */
  isValidLinkedIn: function(url) {
    if (!url) return true;
    return url.indexOf('linkedin.com/in/') !== -1;
  },

  /**
   * Validates the core required fields from the payload
   * @param {Object} data 
   */
  validatePayload: function(data) {
    if (!data) throw new Error("Empty payload");
    
    // Step 1: Basic Info
    if (!data.fullName || data.fullName.trim().length === 0) throw new Error("Full Name is required");
    if (!data.fullName || data.fullName.length > 100) throw new Error("Full Name exceeds 100 characters");
    
    if (!data.email || !this.isValidEmail(data.email)) throw new Error("Valid Email is required");
    if (!this.isValidPhone(data.phone)) throw new Error("Invalid Phone format");
    
    if (!data.role || data.role.trim().length === 0) throw new Error("Professional Role is required");
    if (data.role.length > 100) throw new Error("Role exceeds 100 characters");
    
    if (!data.headline || data.headline.trim().length === 0) throw new Error("Headline is required");
    if (data.headline.length > 120) throw new Error("Headline exceeds 120 characters");

    // Step 2: Summary
    if (!data.summary || data.summary.trim().length === 0) throw new Error("Professional Summary is required");
    if (data.summary.length > 1000) throw new Error("Summary exceeds 1000 characters");
    
    // Social Links validation
    if (data.socialLinks) {
      if (!this.isValidGitHub(data.socialLinks.github)) throw new Error("Invalid GitHub URL");
      if (!this.isValidLinkedIn(data.socialLinks.linkedin)) throw new Error("Invalid LinkedIn URL");
    }
  }
};
