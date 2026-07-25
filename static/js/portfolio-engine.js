// Portfolio Engine - Shared logic for building the Portfolio HTML
// Used by both tools.js (Preview/Generator) and portfolio-viewer.html (Public Viewer)

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim().replace(/^['"]|['"]$/g, '');
  var gdriveMatch = url.match(/drive\.google\.com\/.*(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return 'https://lh3.googleusercontent.com/d/' + gdriveMatch[1];
  }
  if (url.indexOf('dropbox.com') !== -1) {
    return url.replace('dl=0', 'raw=1');
  }
  return url;
}

function getImageHtml(url, fallbackSvg, altText) {
  var normUrl = normalizeImageUrl(url);
  if (!normUrl) return '<img src="' + fallbackSvg + '" alt="' + altText + '" loading="lazy" decoding="async">';
  var driveId = '';
  var m = (url||'').match(/drive\.google\.com\/.*(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/i);
  if (m && m[1]) driveId = m[1];
  var thumbUrl = driveId ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1000' : fallbackSvg;
  return '<img src="' + normUrl + '" alt="' + altText + '" loading="lazy" decoding="async" onerror="if(this.src!==\'' + thumbUrl + '\'){this.src=\'' + thumbUrl + '\';}else{this.onerror=null;this.src=\'' + fallbackSvg + '\';}">';
}

function getFallbackAvatarSvg(name, color) {
  var initials = (name || 'PB').trim().split(/\s+/).slice(0, 2).map(function(p){return p.charAt(0).toUpperCase();}).join('');
  var c = encodeURIComponent(color || '#0D6EFD');
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + c + '"/><stop offset="100%" stop-color="%236366F1"/></linearGradient></defs><rect width="240" height="240" fill="url(%23g)" rx="120"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="86" font-weight="800" fill="white">' + initials + '</text></svg>';
}

function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

function buildClientSidePortfolioHtml(username, state) {
  var name = (state.personal && state.personal.name) || state.name || 'My Portfolio';
  var role = (state.personal && state.personal.role) || state.role || 'Professional';
  var email = (state.personal && state.personal.email) || state.email || '';
  var phone = (state.personal && state.personal.phone) || state.phone || '';
  var resumeUrl = (state.personal && (state.personal.resumeUrl || state.personal.resume_url)) || state.resumeUrl || '';
  var photoUrl = normalizeImageUrl((state.personal && (state.personal.photoUrl || state.personal.photo)) || state.photo);
  var primary = state.colorPalette || '#0D6EFD';
  var font = state.font || 'Inter';
  var summary = state.summary || 'Welcome to my professional portfolio.';
  var skills = (typeof state.skills === 'string' ? state.skills.split(',') : (state.skills || [])).map(function(s){return typeof s === 'string' ? s.trim() : s;}).filter(Boolean);
  var linkedin = (state.socials && state.socials.linkedin) || state.linkedin || '';
  var github = (state.socials && state.socials.github) || state.github || '';

  var fallbackAvatar = getFallbackAvatarSvg(name, primary);

  var validExp = (state.experience || []).filter(function(e){ return (e.company||'').trim() || (e.role||'').trim() || (e.description||'').trim(); });
  var validProj = (state.projects || []).filter(function(p){ return (p.title||'').trim() || (p.description||'').trim() || (p.imageUrl||'').trim() || (p.link||'').trim(); });
  var validEdu = (state.education || []).filter(function(ed){ return (ed.institution||'').trim() || (ed.degree||'').trim() || (ed.year||'').trim(); });
  var validCert = (state.certificates || []).filter(function(c){ return (c.name||'').trim() || (c.issuer||'').trim() || (c.imageUrl||'').trim(); });
  
  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">';
  html += '<title>'+escapeHtml(name)+' | '+escapeHtml(role)+'</title>';
  html += '<meta name="description" content="'+escapeHtml(summary)+'">';
  html += '<meta name="keywords" content="'+escapeHtml(name)+', '+escapeHtml(role)+', Portfolio, Professional, Resume, Developer, Designer, '+escapeHtml(skills.join(', '))+'">';
  
  if (photoUrl) {
    html += '<link rel="icon" href="'+escapeHtml(photoUrl)+'">';
  } else {
    html += '<link rel="icon" type="image/svg+xml" href="'+fallbackAvatar.replace(/"/g, '&quot;')+'">';
  }
  
  html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">';
  html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
  
  // Premium default theme if none provided
  var cc = state.customColors || { bgBase: '#020617', textMain: '#F8FAFC', primary: '#3B82F6', cardBg: 'rgba(30, 41, 59, 0.7)', cardBorder: 'rgba(255, 255, 255, 0.1)', textMuted: '#94A3B8' };
  
  // Inject Premium CSS
  html += '<style>';
  html += ':root { --primary: '+cc.primary+'; --text-main: '+cc.textMain+'; --text-muted: '+cc.textMuted+'; --bg-base: '+cc.bgBase+'; --card-bg: '+cc.cardBg+'; --border: '+cc.cardBorder+'; }';
  html += '*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }';
  html += 'html { scroll-behavior: smooth; overflow-x: hidden; }';
  html += 'body { font-family: "'+font+'", "Inter", sans-serif; background: var(--bg-base); color: var(--text-main); line-height: 1.7; overflow-x: hidden; width: 100%; position: relative; }';
  
  // Mesmerizing Background Animation
  html += 'body::before { content: ""; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), transparent 60%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08), transparent 50%); animation: rotateGlow 40s linear infinite; z-index: -1; pointer-events: none; will-change: transform; }';
  html += '@keyframes rotateGlow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  html += '@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }';
  
  // Stunning Navbar
  html += '.navbar { position: fixed; top: 0; width: 100%; background: rgba(2, 6, 23, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 16px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); z-index: 1000; transition: all 0.3s; }';
  html += '.nav-brand { font-weight: 900; font-family: "Outfit", sans-serif; font-size: clamp(1.2rem, 2.5vw, 1.5rem); color: var(--text-main); text-decoration: none; display: flex; align-items: center; gap: 12px; letter-spacing: -0.02em; }';
  html += '.nav-brand span { color: var(--primary); }';
  html += '.nav-btn { background: rgba(255,255,255,0.1); color: var(--text-main); padding: 10px 24px; border-radius: 9999px; font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); border: 1px solid var(--border); }';
  html += '.nav-btn:hover { background: var(--primary); color: #fff; transform: translateY(-2px); border-color: var(--primary); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }';
  
  html += '.container { width: 100%; max-width: 1100px; margin: 0 auto; padding: 0 5%; }';
  
  // Hero Section
  html += '.hero-section { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 120px 0 60px; animation: fadeInUp 1s cubic-bezier(0.16,1,0.3,1); position: relative; }';
  html += '.avatar-wrap { width: clamp(130px, 20vw, 180px); height: clamp(130px, 20vw, 180px); margin: 0 auto 32px; border-radius: 50%; overflow: hidden; border: 4px solid var(--card-bg); box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--border); position: relative; }';
  html += '.avatar-wrap::after { content: ""; position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 20px rgba(255,255,255,0.2); }';
  html += '.avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s; }';
  html += '.avatar-wrap:hover img { transform: scale(1.05); }';
  html += '.hero-title { font-family: "Outfit", sans-serif; font-size: clamp(2.5rem, 7vw, 4.5rem); font-weight: 900; letter-spacing: -0.04em; margin-bottom: 16px; line-height: 1.1; color: var(--text-main); text-shadow: 0 10px 30px rgba(0,0,0,0.2); }';
  html += '.hero-role { font-size: clamp(1.2rem, 3vw, 1.8rem); color: var(--primary); font-weight: 700; margin-bottom: 24px; letter-spacing: -0.01em; background: linear-gradient(to right, var(--primary), #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block; }';
  html += '.hero-summary { max-width: 700px; margin: 0 auto 40px; color: var(--text-muted); font-size: clamp(1.1rem, 2vw, 1.25rem); line-height: 1.8; font-weight: 300; }';
  
  // Buttons
  html += '.hero-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 10px; }';
  html += '.btn-primary { background: var(--primary); color: #fff; padding: 14px 32px; border-radius: 14px; font-weight: 600; font-size: 1.05rem; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); border: 1px solid rgba(255,255,255,0.1); }';
  html += '.btn-primary:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 15px 35px rgba(59, 130, 246, 0.5); }';
  html += '.btn-outline { background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border); padding: 14px 32px; border-radius: 14px; font-weight: 600; font-size: 1.05rem; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); backdrop-filter: blur(10px); }';
  html += '.btn-outline:hover { background: rgba(255,255,255,0.1); transform: translateY(-4px) scale(1.02); border-color: var(--text-muted); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }';
  
  // Layout & Cards
  html += '.section { padding: clamp(60px, 10vw, 100px) 0; position: relative; }';
  html += '.section-header { margin-bottom: clamp(40px, 6vw, 60px); text-align: left; }';
  html += '.section-title { font-family: "Outfit", sans-serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; letter-spacing: -0.03em; color: var(--text-main); display: inline-block; position: relative; padding-bottom: 12px; }';
  html += '.section-title::after { content: ""; position: absolute; left: 0; bottom: 0; width: 60px; height: 4px; background: var(--primary); border-radius: 4px; }';
  html += '.section-subtitle { color: var(--primary); font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em; }';
  
  html += '.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: clamp(24px, 4vw, 32px); }';
  html += '.card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: clamp(24px, 4vw, 36px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); display: flex; flex-direction: column; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); position: relative; overflow: hidden; }';
  html += '.card::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%); opacity: 0; transition: opacity 0.4s; pointer-events: none; }';
  html += '.card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.2); }';
  html += '.card:hover::before { opacity: 1; }';
  
  html += '.card-title { font-family: "Outfit", sans-serif; font-size: clamp(1.3rem, 2.5vw, 1.6rem); font-weight: 800; margin-bottom: 10px; color: var(--text-main); letter-spacing: -0.01em; }';
  html += '.card-meta { color: var(--primary); font-size: 0.95rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }';
  html += '.card-body { color: var(--text-muted); font-size: 1.05rem; line-height: 1.7; flex-grow: 1; font-weight: 300; }';
  
  // Skills Tags
  html += '.skill-tags { display: flex; flex-wrap: wrap; gap: 12px; }';
  html += '.skill-chip { background: rgba(255,255,255,0.03); color: var(--text-main); padding: 12px 24px; border-radius: 12px; font-weight: 500; font-size: 1rem; border: 1px solid var(--border); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); }';
  html += '.skill-chip:hover { transform: translateY(-4px) scale(1.05); background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }';
  html += '.skill-chip::before { content: "•"; color: var(--primary); font-size: 1.2rem; line-height: 0; }';
  html += '.skill-chip:hover::before { color: rgba(255,255,255,0.8); }';
  
  // Project Images
  html += '.proj-img-wrap { width: calc(100% + clamp(48px, 8vw, 72px)); margin: calc(clamp(-24px, -4vw, -36px)) calc(clamp(-24px, -4vw, -36px)) 24px calc(clamp(-24px, -4vw, -36px)); height: 240px; overflow: hidden; background: #000; position: relative; }';
  html += '.proj-img-wrap img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: all 0.7s cubic-bezier(0.16,1,0.3,1); }';
  html += '.card:hover .proj-img-wrap img { transform: scale(1.1); opacity: 1; }';
  html += '.proj-img-wrap::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, var(--card-bg), transparent); pointer-events: none; }';
  
  // Contact
  html += '.contact-card { background: linear-gradient(145deg, var(--card-bg), rgba(0,0,0,0.2)); color: var(--text-main); border-radius: 32px; padding: clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px); text-align: center; border: 1px solid var(--border); box-shadow: 0 20px 50px rgba(0,0,0,0.2); position: relative; overflow: hidden; }';
  html += '.contact-card::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 50% 50%, rgba(59,130,246,0.1), transparent 50%); pointer-events: none; }';
  html += '.contact-card h2 { font-family: "Outfit", sans-serif; font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 900; margin-bottom: 20px; color: var(--text-main); letter-spacing: -0.03em; }';
  html += '.contact-card p { color: var(--text-muted); font-size: clamp(1.1rem, 2.5vw, 1.3rem); max-width: 600px; margin: 0 auto 40px; font-weight: 300; }';
  
  html += 'footer { text-align: center; padding: 60px 24px; color: var(--text-muted); font-size: 0.95rem; border-top: 1px solid var(--border); margin-top: 60px; backdrop-filter: blur(10px); }';
  html += '</style></head><body>';

  html += '<nav class="navbar"><a href="#" class="nav-brand"><i class="fas fa-layer-group"></i> <span>'+escapeHtml(name.split(' ')[0])+'</span></a><a href="#contact" class="nav-btn">Get in Touch <i class="fas fa-arrow-right" style="margin-left:6px; font-size:0.8em;"></i></a></nav>';

  // HERO SECTION
  html += '<section class="section hero-section"><div class="container">';
  html += '<div class="avatar-wrap">'+getImageHtml(photoUrl, fallbackAvatar, name)+'</div>';
  html += '<h1 class="hero-title">'+escapeHtml(name)+'</h1>';
  html += '<div class="hero-role">'+escapeHtml(role)+'</div>';
  html += '<p class="hero-summary">'+escapeHtml(summary)+'</p>';
  html += '<div class="hero-actions">';
  if (resumeUrl && /^https?:\/\//i.test(resumeUrl)) {
    html += '<a href="'+escapeHtml(resumeUrl)+'" target="_blank" class="btn-primary"><i class="fas fa-file-pdf"></i> View Resume</a>';
  }
  if (linkedin && /^https?:\/\//i.test(linkedin)) {
    html += '<a href="'+escapeHtml(linkedin)+'" target="_blank" class="btn-outline"><i class="fab fa-linkedin" style="color:#0A66C2;"></i> LinkedIn</a>';
  }
  if (github && /^https?:\/\//i.test(github)) {
    html += '<a href="'+escapeHtml(github)+'" target="_blank" class="btn-outline"><i class="fab fa-github"></i> GitHub</a>';
  }
  html += '<a href="#contact" class="btn-outline"><i class="fas fa-paper-plane"></i> Contact Me</a>';
  html += '</div></div></section>';

  // ABOUT / SUMMARY SECTION
  html += '<section class="section" id="about"><div class="container">';
  html += '<div class="section-header"><div class="section-subtitle">Introduction</div><h2 class="section-title">About Me</h2></div>';
  html += '<div class="card" style="padding: clamp(32px, 6vw, 48px);"><p class="card-body" style="font-size: 1.15rem;">'+escapeHtml(summary)+'</p></div>';
  html += '</div></section>';

  // SKILLS SECTION
  if (skills.length > 0) {
    html += '<section class="section" id="skills"><div class="container">';
    html += '<div class="section-header"><div class="section-subtitle">Expertise</div><h2 class="section-title">Core Competencies</h2></div>';
    html += '<div class="skill-tags">';
    skills.forEach(function(s){ html += '<span class="skill-chip">'+escapeHtml(s)+'</span>'; });
    html += '</div></div></section>';
  }

  // PROJECTS SECTION
  if (validProj.length > 0) {
    html += '<section class="section" id="projects"><div class="container">';
    html += '<div class="section-header"><div class="section-subtitle">Portfolio</div><h2 class="section-title">Featured Projects</h2></div>';
    html += '<div class="card-grid">';
    validProj.forEach(function(p){
      html += '<div class="card">';
      html += '<div class="proj-img-wrap">'+getImageHtml(p.imageUrl, fallbackAvatar, p.title||'Project')+'</div>';
      html += '<h3 class="card-title">'+escapeHtml(p.title||'Project')+'</h3>';
      html += '<p class="card-body">'+escapeHtml(p.description||'')+'</p>';
      if (p.link && /^https?:\/\//i.test(p.link)) {
        html += '<div style="margin-top:24px;"><a href="'+escapeHtml(p.link)+'" target="_blank" class="btn-outline" style="padding: 10px 24px; font-size: 0.95rem; width: 100%; justify-content: center;">View Project <i class="fas fa-arrow-up-right-from-square"></i></a></div>';
      }
      html += '</div>';
    });
    html += '</div></div></section>';
  }

  // EXPERIENCE SECTION
  if (validExp.length > 0) {
    html += '<section class="section" id="experience"><div class="container">';
    html += '<div class="section-header"><div class="section-subtitle">Career</div><h2 class="section-title">Professional Experience</h2></div>';
    html += '<div class="card-grid" style="grid-template-columns: 1fr;">';
    validExp.forEach(function(e){
      html += '<div class="card" style="display:flex; flex-direction:row; flex-wrap:wrap; gap: 24px; align-items: flex-start;">';
      html += '<div style="flex: 1; min-width: 250px;">';
      html += '<h3 class="card-title" style="font-size: 1.8rem;">'+escapeHtml(e.role||'Role')+'</h3>';
      html += '<div class="card-meta" style="font-size: 1.1rem;"><i class="fas fa-building"></i> '+escapeHtml(e.company||'Company')+' &nbsp;&bull;&nbsp; <i class="far fa-calendar-alt"></i> '+escapeHtml(e.duration||'')+'</div>';
      html += '</div>';
      html += '<div style="flex: 2; min-width: 300px;"><p class="card-body">'+escapeHtml(e.description||'')+'</p></div>';
      html += '</div>';
    });
    html += '</div></div></section>';
  }

  // EDUCATION SECTION
  if (validEdu.length > 0) {
    html += '<section class="section" id="education"><div class="container">';
    html += '<div class="section-header"><div class="section-subtitle">Academic</div><h2 class="section-title">Education</h2></div>';
    html += '<div class="card-grid">';
    validEdu.forEach(function(ed){
      html += '<div class="card">';
      html += '<div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--primary);margin-bottom:20px; border: 1px solid var(--border);"><i class="fas fa-graduation-cap" style="font-size:1.8rem;"></i></div>';
      html += '<h3 class="card-title">'+escapeHtml(ed.degree||'Degree')+'</h3>';
      html += '<div class="card-meta"><i class="fas fa-university"></i> '+escapeHtml(ed.institution||'Institution')+'</div>';
      if (ed.year) html += '<p class="card-body" style="color:var(--primary); font-weight: 500;">'+escapeHtml(ed.year)+'</p>';
      html += '</div>';
    });
    html += '</div></div></section>';
  }

  // ACHIEVEMENTS SECTION
  if (state.achievements && state.achievements.length > 0) {
    var validAchs = state.achievements.filter(function(a) { return a.description.trim() !== ''; });
    if (validAchs.length > 0) {
      html += '<section class="section" id="achievements"><div class="container">';
      html += '<div class="section-header"><div class="section-subtitle">Milestones</div><h2 class="section-title">Honors &amp; Achievements</h2></div>';
      html += '<div class="card-grid">';
      validAchs.forEach(function(ach, i) {
        html += '<div class="card" style="flex-direction: row; gap: 20px; align-items: center;">';
        html += '<div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg, var(--primary), #8B5CF6);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow: 0 10px 20px rgba(59,130,246,0.3);">';
        html += '<i class="fas fa-trophy" style="font-size:1.8rem;"></i></div>';
        html += '<div>';
        html += '<h3 class="card-title" style="margin-bottom:4px;">Achievement ' + (i+1) + '</h3>';
        html += '<p class="card-body" style="font-size:1rem;">' + escapeHtml(ach.description) + '</p>';
        html += '</div></div>';
      });
      html += '</div></div></section>';
    }
  }

  // CERTIFICATIONS SECTION
  if (validCert.length > 0) {
    html += '<section class="section" id="certifications"><div class="container">';
    html += '<div class="section-header"><div class="section-subtitle">Credentials</div><h2 class="section-title">Certifications</h2></div>';
    html += '<div class="card-grid">';
    validCert.forEach(function(c){
      html += '<div class="card">';
      if (c.imageUrl) {
        html += '<div class="proj-img-wrap" style="height:180px;">'+getImageHtml(c.imageUrl, fallbackAvatar, c.name||'Certificate')+'</div>';
      } else {
        html += '<div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--primary);margin-bottom:20px; border: 1px solid var(--border);"><i class="fas fa-certificate" style="font-size:1.8rem;"></i></div>';
      }
      html += '<h3 class="card-title">'+escapeHtml(c.name||'Certificate')+'</h3>';
      html += '<div class="card-meta"><i class="fas fa-award"></i> '+escapeHtml(c.issuer||'Issuer')+'</div>';
      html += '</div>';
    });
    html += '</div></div></section>';
  }

  // CONTACT SECTION
  html += '<section class="section" id="contact"><div class="container">';
  html += '<div class="contact-card">';
  html += '<h2>Ready to collaborate?</h2>';
  html += '<p>I am always open to discussing product design work, new projects, or opportunities to be part of your vision. Let&#39;s create something amazing together.</p>';
  html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;">';
  if (email) {
    html += '<a href="mailto:'+escapeHtml(email)+'" class="btn-primary"><i class="fas fa-envelope"></i> Send an Email</a>';
  }
  if (phone) {
    html += '<a href="tel:'+escapeHtml(phone)+'" class="btn-outline"><i class="fas fa-phone-alt"></i> Call Me</a>';
  }
  if (!email && !phone && linkedin) {
    html += '<a href="'+escapeHtml(linkedin)+'" target="_blank" class="btn-primary"><i class="fab fa-linkedin"></i> Connect on LinkedIn</a>';
  }
  html += '</div></div></div></section>';

  // INTERACTIVE ENGINE
  var animationStyle = state.animation || '3D Tilt & Glow';
  html += '<script>';
  html += 'document.addEventListener("DOMContentLoaded", function() {';
  html += '  if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;';
  if (animationStyle === '3D Tilt & Glow' || animationStyle === 'Magnetic Interactive') {
    html += '  var cards = document.querySelectorAll(".card");';
    html += '  cards.forEach(function(card) {';
    html += '    card.style.transformStyle = "preserve-3d";';
    html += '    card.style.transition = "transform 0.1s ease-out, box-shadow 0.3s ease, border-color 0.3s ease";';
    html += '    card.addEventListener("mousemove", function(e) {';
    html += '      var rect = card.getBoundingClientRect();';
    html += '      var x = e.clientX - rect.left, y = e.clientY - rect.top;';
    html += '      var rotateX = ((y - rect.height/2) / (rect.height/2)) * -4;';
    html += '      var rotateY = ((x - rect.width/2) / (rect.width/2)) * 4;';
    html += '      card.style.transform = "perspective(1000px) rotateX("+rotateX+"deg) rotateY("+rotateY+"deg) scale3d(1.02,1.02,1.02)";';
    html += '    });';
    html += '    card.addEventListener("mouseleave", function() {';
    html += '      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";';
    html += '    });';
    html += '  });';
  }
  html += '});';
  html += '<' + '/script>';

  // FOOTER (With Branding)
  html += '<footer><div class="container">&copy; '+new Date().getFullYear()+' '+escapeHtml(name)+' &bull; Crafted with precision. Powered by <strong>Prompt Bazaar Labs</strong>.</div></footer></body></html>';
  return html;
}
