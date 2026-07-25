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
        var cardStyles = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;';
        function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

        var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">';
        html += '<title>'+name+' | '+role+'</title>';
        html += '<meta name="description" content="'+summary.replace(/"/g, '&quot;')+'">';
        html += '<meta name="keywords" content="'+name.replace(/"/g, '&quot;')+', '+role.replace(/"/g, '&quot;')+', Portfolio, Professional, Resume, Developer, Designer, '+skills.join(', ')+'">';
        if (photoUrl) {
          html += '<link rel="icon" href="'+photoUrl+'">';
        } else {
          html += '<link rel="icon" type="image/svg+xml" href="'+fallbackAvatar.replace(/"/g, '&quot;')+'">';
        }
        html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">';
        html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
        var cc = state.customColors || { bgBase: '#F8FCFF', textMain: '#1A365D', primary: '#2563EB', cardBg: '#FFFFFF', cardBorder: '#D6E4FF', textMuted: '#64748B' };
        html += '<style>';
        html += ':root { --primary: '+cc.primary+'; --text-main: '+cc.textMain+'; --text-muted: '+cc.textMuted+'; --bg-base: '+cc.bgBase+'; --card-bg: '+cc.cardBg+'; --border: '+cc.cardBorder+'; }';
        html += '*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }';
        html += 'html { scroll-behavior: smooth; overflow-x: hidden; }';
        html += 'body { font-family: "'+font+'", "Inter", sans-serif; background: var(--bg-base); color: var(--text-main); line-height: 1.65; overflow-x: hidden; width: 100%; }';
        html += 'body::before { content: ""; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), transparent 60%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08), transparent 50%); animation: rotateGlow 40s linear infinite; z-index: -1; pointer-events: none; will-change: transform; }';
        html += '@keyframes rotateGlow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';

        html += '@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }';
        html += '.navbar { position: sticky; top: 0; background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); z-index: 1000; }';
        html += '.nav-brand { font-weight: 800; font-size: clamp(1.1rem, 2.2vw, 1.35rem); color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 10px; }';
        html += '.nav-btn { background: var(--primary); color: #fff; padding: 9px 20px; border-radius: 9999px; font-weight: 600; font-size: 0.88rem; text-decoration: none; transition: all 0.2s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 4px 14px rgba(13, 110, 253, 0.25); }';
        html += '.nav-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(13, 110, 253, 0.38); }';
        html += '.container { width: 100%; margin: 0 auto; }';
        html += '@media (max-width: 767px) { .container { width: 100%; padding: 0 16px; max-width: none; } .navbar { padding: 12px 16px; } }';
        html += '@media (min-width: 768px) and (max-width: 1023px) { .container { max-width: 720px; padding: 0 24px; } }';
        html += '@media (min-width: 1024px) and (max-width: 1279px) { .container { max-width: 960px; padding: 0 32px; } }';
        html += '@media (min-width: 1280px) { .container { max-width: 1200px; padding: 0 48px; } }';
        html += '.hero-section { padding: clamp(48px, 8vw, 96px) 0 clamp(36px, 6vw, 64px); text-align: center; animation: fadeInUp 0.7s ease-out; }';
        html += '.avatar-wrap { width: clamp(110px, 18vw, 156px); height: clamp(110px, 18vw, 156px); margin: 0 auto 24px; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,0.2); box-shadow: 0 16px 36px rgba(0,0,0,0.4); }';
        html += '.avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }';
        html += '.hero-title { font-size: clamp(2rem, 6vw, 3.8rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 12px; line-height: 1.15; color: var(--text-main); }';
        html += '.hero-role { font-size: clamp(1.1rem, 2.5vw, 1.45rem); color: var(--primary); font-weight: 700; margin-bottom: 20px; }';
        html += '.hero-summary { max-width: 680px; margin: 0 auto 28px; color: #94A3B8; font-size: clamp(1rem, 1.8vw, 1.15rem); line-height: 1.7; }';
        html += '.hero-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-top: 24px; }';
        html += '.btn-primary { background: var(--primary); color: #fff; padding: 12px 26px; border-radius: 12px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.25s; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }';
        html += '.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }';
        html += '.btn-outline { background: transparent; color: var(--primary); border: 2px solid var(--primary); padding: 12px 26px; border-radius: 12px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.25s; }';
        html += '.btn-outline:hover { background: var(--primary); color: #ffffff; transform: translateY(-2px); }';
        html += '.section { padding: clamp(36px, 6vw, 64px) 0; }';
        html += '.section-header { margin-bottom: clamp(24px, 4vw, 36px); }';
        html += '.section-title { font-size: clamp(1.5rem, 3.5vw, 2.2rem); font-weight: 800; letter-spacing: -0.02em; color: #000000; }';
        html += '.section-subtitle { color: #94A3B8; font-size: 0.95rem; margin-top: 4px; }';
        html += '.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: clamp(16px, 2.5vw, 24px); }';
        html += '@media (max-width: 767px) { .card-grid { grid-template-columns: 1fr; gap: 16px; } }';
        html += '.card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; padding: clamp(20px, 3.5vw, 28px); box-shadow: 0 4px 18px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); display: flex; flex-direction: column; backdrop-filter: blur(14px); }';
        html += '.card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(0,0,0,0.15); border-color: var(--primary); }';
        html += '.card-title { font-size: clamp(1.15rem, 2.2vw, 1.35rem); font-weight: 700; margin-bottom: 6px; color: var(--text-main); }';
        html += '.card-meta { color: var(--primary); font-size: 0.9rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }';
        html += '.card-body { color: #94A3B8; font-size: 0.96rem; line-height: 1.65; flex-grow: 1; }';
        html += '.skill-tags { display: flex; flex-wrap: wrap; gap: 10px; }';
        html += '.skill-chip { background: rgba(13, 110, 253, 0.12); color: #60A5FA; padding: 8px 18px; border-radius: 9999px; font-weight: 600; font-size: 0.9rem; border: 1px solid rgba(13, 110, 253, 0.25); transition: all 0.2s; }';
        html += '.skill-chip:hover { transform: translateY(-2px); background: var(--primary); color: #fff; }';
        html += '.proj-img-wrap { width: 100%; height: 200px; border-radius: 14px; overflow: hidden; margin-bottom: 18px; background: rgba(255,255,255,0.05); }';
        html += '.proj-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }';
        html += '.card:hover .proj-img-wrap img { transform: scale(1.06); }';
        html += '.contact-card { background: var(--card-bg); color: var(--text-main); border-radius: 24px; padding: clamp(32px, 6vw, 48px); text-align: center; border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }';
        html += '.contact-card h2 { font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; margin-bottom: 12px; color: #000000; }';
        html += '.contact-card p { color: var(--text-muted); font-size: clamp(1rem, 2vw, 1.15rem); max-width: 560px; margin: 0 auto 28px; }';
        html += 'footer { text-align: center; padding: 48px 24px; color: #64748B; font-size: 0.9rem; border-top: 1px solid var(--border); margin-top: 48px; }';
        html += '</style></head><body>';

        html += '<nav class="navbar"><a href="#" class="nav-brand"><i class="fas fa-layer-group"></i> '+name+'</a><a href="#contact" class="nav-btn">Get in Touch</a></nav>';

        // HERO SECTION
        html += '<section class="section hero-section"><div class="container">';
        html += '<div class="avatar-wrap">'+getImageHtml(photoUrl, fallbackAvatar, name)+'</div>';
        html += '<h1 class="hero-title">'+name+'</h1>';
        html += '<div class="hero-role">'+role+'</div>';
        html += '<p class="hero-summary">'+summary+'</p>';
        html += '<div class="hero-actions">';
        if (resumeUrl && /^https?:\/\//i.test(resumeUrl)) {
          html += '<a href="'+resumeUrl+'" target="_blank" class="btn-primary"><i class="fas fa-file-alt"></i> View Resume</a>';
        }
        if (linkedin && /^https?:\/\//i.test(linkedin)) {
          html += '<a href="'+linkedin+'" target="_blank" class="btn-primary" style="background:#0A66C2;border-color:#0A66C2;color:#fff;"><i class="fab fa-linkedin"></i> LinkedIn</a>';
        }
        if (github && /^https?:\/\//i.test(github)) {
          html += '<a href="'+github+'" target="_blank" class="btn-primary" style="background:#24292E;border-color:#24292E;color:#fff;"><i class="fab fa-github"></i> GitHub</a>';
        }
        html += '<a href="#contact" class="btn-outline"><i class="fas fa-paper-plane"></i> Contact Me</a>';
        html += '</div></div></section>';

        // ABOUT / SUMMARY SECTION
        html += '<section class="section"><div class="container">';
        html += '<div class="section-header"><h2 class="section-title">About Me</h2></div>';
        html += '<div class="card" style="padding: clamp(24px, 4vw, 36px);"><p class="card-body" style="font-size: 1.05rem;">'+summary+'</p></div>';
        html += '</div></section>';

        // SKILLS SECTION
        if (skills.length > 0) {
          html += '<section class="section"><div class="container">';
          html += '<div class="section-header"><h2 class="section-title">Core Competencies</h2><div class="section-subtitle">Skills & expertise</div></div>';
          html += '<div class="skill-tags">';
          skills.forEach(function(s){ html += '<span class="skill-chip">'+s+'</span>'; });
          html += '</div></div></section>';
        }

        // PROJECTS SECTION
        if (validProj.length > 0) {
          html += '<section class="section"><div class="container">';
          html += '<div class="section-header"><h2 class="section-title">Featured Projects</h2><div class="section-subtitle">Highlights of my work</div></div>';
          html += '<div class="card-grid">';
          validProj.forEach(function(p){
            html += '<div class="card">';
            html += '<div class="proj-img-wrap">'+getImageHtml(p.imageUrl, fallbackAvatar, p.title||'Project')+'</div>';
            html += '<h3 class="card-title">'+(p.title||'Project')+'</h3>';
            html += '<p class="card-body">'+(p.description||'')+'</p>';
            if (p.link && /^https?:\/\//i.test(p.link)) {
              html += '<div style="margin-top:18px;"><a href="'+p.link+'" target="_blank" class="btn-outline" style="padding: 8px 18px; font-size: 0.88rem;">Explore Project <i class="fas fa-external-link-alt"></i></a></div>';
            }
            html += '</div>';
          });
          html += '</div></div></section>';
        }

        // EXPERIENCE SECTION
        if (validExp.length > 0) {
          html += '<section class="section"><div class="container">';
          html += '<div class="section-header"><h2 class="section-title">Professional Experience</h2><div class="section-subtitle">My career journey</div></div>';
          html += '<div class="card-grid">';
          validExp.forEach(function(e){
            html += '<div class="card">';
            html += '<h3 class="card-title">'+(e.role||'Role')+'</h3>';
            html += '<div class="card-meta"><i class="fas fa-building"></i> '+(e.company||'Company')+' &bull; '+(e.duration||'')+'</div>';
            html += '<p class="card-body">'+(e.description||'')+'</p>';
            html += '</div>';
          });
          html += '</div></div></section>';
        }

        // EDUCATION SECTION
        if (validEdu.length > 0) {
          html += '<section class="section"><div class="container">';
          html += '<div class="section-header"><h2 class="section-title">Education</h2></div>';
          html += '<div class="card-grid">';
          validEdu.forEach(function(ed){
            html += '<div class="card">';
            html += '<h3 class="card-title">'+(ed.degree||'Degree')+'</h3>';
            html += '<div class="card-meta"><i class="fas fa-university"></i> '+(ed.institution||'Institution')+' &bull; '+(ed.year||'')+'</div>';
            html += '</div>';
          });
          html += '</div></div></section>';
        }

        // ACHIEVEMENTS SECTION
        if (state.achievements && state.achievements.length > 0) {
          var validAchs = state.achievements.filter(function(a) { return a.description.trim() !== ''; });
          if (validAchs.length > 0) {
            html += '<section class="container" style="margin-top:60px;">';
            html += '<div class="section-header"><h2 class="section-title">Honors &amp; Achievements</h2></div>';
            html += '<div class="grid-layout">';
            validAchs.forEach(function(ach, i) {
              html += '<div class="card" style="padding:24px; ' + cardStyles + '">';
              html += '<div style="display:flex; align-items:flex-start; gap:16px;">';
              html += '<div style="width:48px;height:48px;border-radius:12px;background:rgba(13,110,253,0.1);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">';
              html += '<i class="fas fa-award" style="font-size:1.5rem;"></i></div>';
              html += '<div>';
              html += '<h3 style="font-size:1.25rem;color:var(--text-main);margin-bottom:8px;font-weight:600;">Achievement ' + (i+1) + '</h3>';
              html += '<p style="color:var(--text-muted);line-height:1.6;font-size:0.95rem;">' + escapeHtml(ach.description) + '</p>';
              html += '</div></div></div>';
            });
            html += '</div></section>';
          }
        }

        // CERTIFICATIONS SECTION
        if (validCert.length > 0) {
          html += '<section class="section"><div class="container">';
          html += '<div class="section-header"><h2 class="section-title">Certifications</h2></div>';
          html += '<div class="card-grid">';
          validCert.forEach(function(c){
            html += '<div class="card">';
            if (c.imageUrl) {
              html += '<div class="proj-img-wrap" style="height:140px;">'+getImageHtml(c.imageUrl, fallbackAvatar, c.name||'Certificate')+'</div>';
            }
            html += '<h3 class="card-title">'+(c.name||'Certificate')+'</h3>';
            html += '<div class="card-meta"><i class="fas fa-award"></i> '+(c.issuer||'Issuer')+'</div>';
            html += '</div>';
          });
          html += '</div></div></section>';
        }



        // CONTACT SECTION
        html += '<section class="section" id="contact"><div class="container">';
        html += '<div class="contact-card" style="background:var(--card-bg); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.05);">';
        html += '<h2 style="color:#000000;">Let&rsquo;s Connect</h2>';
        html += '<p style="color:#475569;">Open to professional opportunities, collaboration, and exciting projects. Feel free to reach out anytime.</p>';
        html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;">';
        if (email) {
          html += '<a href="mailto:'+email+'" class="btn-primary" style="background:var(--primary);color:#fff;"><i class="fas fa-envelope"></i> '+email+'</a>';
        }
        if (phone) {
          html += '<a href="tel:'+phone+'" class="btn-primary" style="background:var(--primary);color:#fff;">📞 '+phone+'</a>';
        }
        if (linkedin && /^https?:\/\//i.test(linkedin)) {
          html += '<a href="'+linkedin+'" target="_blank" class="btn-primary" style="background:#0A66C2;color:#fff;"><i class="fab fa-linkedin"></i> LinkedIn</a>';
        }
        if (github && /^https?:\/\//i.test(github)) {
          html += '<a href="'+github+'" target="_blank" class="btn-primary" style="background:#24292E;color:#fff;"><i class="fab fa-github"></i> GitHub</a>';
        }
        html += '</div></div></div></section>';

        // 3D & Interactive Animation Engine Script
        var animationStyle = state.animation || '3D Tilt & Glow';
        html += '<script>';
        html += 'document.addEventListener("DOMContentLoaded", function() {';
        html += '  if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;';
        if (animationStyle === '3D Tilt & Glow') {
          html += '  var cards = document.querySelectorAll(".card, .contact-card");';
          html += '  cards.forEach(function(card) {';
          html += '    card.style.transformStyle = "preserve-3d";';
          html += '    card.style.transition = "transform 0.15s ease-out, box-shadow 0.3s ease";';
          html += '    card.addEventListener("mousemove", function(e) {';
          html += '      var rect = card.getBoundingClientRect();';
          html += '      var x = e.clientX - rect.left, y = e.clientY - rect.top;';
          html += '      var rotateX = ((y - rect.height/2) / (rect.height/2)) * -6;';
          html += '      var rotateY = ((x - rect.width/2) / (rect.width/2)) * 6;';
          html += '      card.style.transform = "perspective(1000px) rotateX("+rotateX+"deg) rotateY("+rotateY+"deg) scale3d(1.02,1.02,1.02)";';
          html += '    });';
          html += '    card.addEventListener("mouseleave", function() {';
          html += '      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";';
          html += '    });';
          html += '  });';
        } else if (animationStyle === 'Floating Hologram') {
          html += '  var wrap = document.querySelector(".avatar-wrap");';
          html += '  if(wrap) { wrap.style.transition = "transform 3s ease-in-out infinite alternate"; }';
        } else if (animationStyle === 'Magnetic Interactive') {
          html += '  document.querySelectorAll(".btn-primary, .btn-outline").forEach(function(btn) {';
          html += '    btn.addEventListener("mousemove", function(e) {';
          html += '      var r = btn.getBoundingClientRect();';
          html += '      var dx = (e.clientX - (r.left + r.width/2)) * 0.25;';
          html += '      var dy = (e.clientY - (r.top + r.height/2)) * 0.25;';
          html += '      btn.style.transform = "translate("+dx+"px, "+dy+"px)";';
          html += '    });';
          html += '    btn.addEventListener("mouseleave", function() { btn.style.transform = "translate(0, 0)"; });';
          html += '  });';
        }
        html += '});';
        html += '<' + '/script>';

        // FOOTER
        html += '<footer><div class="container">&copy; '+new Date().getFullYear()+' '+name+' &bull; Powered by <strong>Prompt Bazaar Labs</strong></div></footer></body></html>';
        return html;
      }
