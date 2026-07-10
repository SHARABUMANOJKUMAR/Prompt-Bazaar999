import re

class PortfolioGenerationAgent:
    """
    Generates Responsive Portfolio Website (HTML/CSS)
    With exact user input mapping, user-provided image display, and rich CSS animations.
    """
    def normalize_image(self, url):
        if not url:
            return "", ""
        url = url.strip()
        gdrive_match = re.search(r'drive\.google\.com/.*(?:file/d/|id=)([a-zA-Z0-9_-]+)', url)
        if gdrive_match:
            file_id = gdrive_match.group(1)
            primary_url = f"https://lh3.googleusercontent.com/d/{file_id}"
            fallback_url = f"https://drive.google.com/thumbnail?id={file_id}&sz=w1000"
            return primary_url, fallback_url
        if 'dropbox.com' in url and '?dl=0' in url:
            return url.replace('?dl=0', '?raw=1'), ""
        return url, ""

    def execute(self, data, profile_data, content_data, design_data):
        personal = data.get('personal', {})
        experience = data.get('experience', [])
        education = data.get('education', [])
        projects = data.get('projects', [])
        certificates = data.get('certificates', [])
        achievements = data.get('achievements', '')
        
        skills_raw = data.get('skills', '')
        if isinstance(skills_raw, list):
            skills = [str(s).strip() for s in skills_raw if str(s).strip()]
        else:
            skills = [s.strip() for s in str(skills_raw).split(',') if s.strip()] if skills_raw else []
        socials = data.get('socials', {})
        
        primary = data.get('colorPalette', '#0D6EFD')
        font_family = data.get('font', 'Inter')
        
        first_name = personal.get('firstName', '').strip()
        last_name = personal.get('lastName', '').strip()
        name = personal.get('name', '').strip()
        if (not name or name == 'Professional Portfolio') and (first_name or last_name):
            name = f"{first_name} {last_name}".strip()
        if not name:
            name = "My Portfolio"

        role = personal.get('role', '').strip() or personal.get('headline', '').strip() or 'Software Professional'
        photo_url = personal.get('photoUrl', '').strip() or personal.get('photo_url', '').strip() or personal.get('image', '').strip()
        email = personal.get('email', '').strip()
        phone = personal.get('phone', '').strip()
        resume_url = personal.get('resumeUrl', '').strip()
        summary = content_data.get('enhanced_summary', '').strip() or data.get('summary', '').strip()

        seo_terms = [name, role, "portfolio", "developer"] + skills
        seo_keywords_clean = ", ".join(sorted(set([k.strip() for k in seo_terms if k and len(k.strip()) > 1])))
        meta_desc = (summary[:160] + '...') if len(summary) > 160 else (summary or f"Professional portfolio of {name}, {role}.")

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} | {role}</title>
    <meta name="description" content="{meta_desc}">
    <meta name="keywords" content="{seo_keywords_clean}">
    <meta name="author" content="{name}">
    <meta property="og:title" content="{name} | {role}">
    <meta property="og:description" content="{meta_desc}">
    <meta property="og:type" content="website">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&family=Roboto:wght@300;400;500;700&family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {{
            --primary: {primary};
            --text-main: #0f172a;
            --text-muted: #475569;
            --bg-base: #f8fafc;
            --card-bg: rgba(255, 255, 255, 0.82);
            --card-border: rgba(255, 255, 255, 0.65);
            --glass-shadow: 0 10px 32px 0 rgba(31, 38, 135, 0.08);
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        html {{
            scroll-behavior: smooth;
        }}
        body {{
            font-family: '{font_family}', sans-serif;
            background: var(--bg-base);
            color: var(--text-main);
            line-height: 1.65;
            overflow-x: hidden;
            word-break: break-word;
            overflow-wrap: break-word;
        }}
        /* Vibrant animated background mesh */
        .bg-mesh {{
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            background-image: 
                radial-gradient(at 25% 20%, {primary}26 0px, transparent 55%),
                radial-gradient(at 80% 15%, rgba(168, 85, 247, 0.16) 0px, transparent 55%),
                radial-gradient(at 15% 75%, rgba(236, 72, 153, 0.14) 0px, transparent 55%);
            filter: blur(45px);
            animation: pulseBg 12s ease-in-out infinite alternate;
        }}
        @keyframes pulseBg {{
            0% {{ opacity: 0.85; transform: scale(1); }}
            100% {{ opacity: 1; transform: scale(1.05); }}
        }}
        /* Sticky Navigation Bar */
        .navbar {{
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.84);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(226, 232, 240, 0.7);
            padding: 14px 0;
            animation: slideDown 0.6s ease-out;
        }}
        @keyframes slideDown {{
            from {{ transform: translateY(-100%); opacity: 0; }}
            to {{ transform: translateY(0); opacity: 1; }}
        }}
        .nav-inner {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
        }}
        .brand {{
            font-family: 'Outfit', sans-serif;
            font-size: 1.35rem;
            font-weight: 800;
            text-decoration: none;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .brand span {{
            color: var(--primary);
        }}
        .nav-links {{
            display: flex;
            align-items: center;
            gap: 20px;
            list-style: none;
            flex-wrap: wrap;
        }}
        .nav-links a {{
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            transition: color 0.2s, transform 0.2s;
        }}
        .nav-links a:hover {{
            color: var(--primary);
            transform: translateY(-1px);
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }}
        
        /* Hero Section */
        .hero {{
            min-height: 75vh;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 48px;
            padding: 70px 0 60px;
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        @keyframes fadeInUp {{
            from {{ opacity: 0; transform: translateY(28px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        .hero-content {{
            flex: 1;
            max-width: 680px;
        }}
        .hero-img {{
            width: clamp(180px, 28vw, 260px);
            height: clamp(180px, 28vw, 260px);
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid white;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
            flex-shrink: 0;
            animation: floatImage 6s ease-in-out infinite;
        }}
        @keyframes floatImage {{
            0%, 100% {{ transform: translateY(0px) rotate(0deg); }}
            50% {{ transform: translateY(-12px) rotate(1.5deg); }}
        }}
        .hero h1 {{
            font-family: 'Outfit', sans-serif;
            font-size: clamp(2.1rem, 5.5vw, 4rem);
            font-weight: 800;
            line-height: 1.15;
            margin-bottom: 14px;
            background: linear-gradient(135deg, var(--primary) 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }}
        .hero h2 {{
            font-size: clamp(1.15rem, 2.6vw, 1.6rem);
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 18px;
        }}
        .hero p {{
            font-size: clamp(0.98rem, 1.8vw, 1.12rem);
            color: var(--text-muted);
            margin-bottom: 28px;
            max-width: 65ch;
        }}
        .social-links {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
        }}
        .social-links a.icon-btn {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            color: var(--text-main);
            font-size: 1.15rem;
            text-decoration: none;
            box-shadow: var(--glass-shadow);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        .social-links a.icon-btn:hover {{
            background: var(--primary);
            color: white;
            transform: translateY(-4px) scale(1.08);
        }}
        .resume-btn {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 22px;
            background: var(--primary);
            color: #ffffff !important;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s;
            min-height: 44px;
        }}
        .resume-btn:hover {{
            transform: translateY(-3px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
        }}
        
        .section-title {{
            font-family: 'Outfit', sans-serif;
            font-size: clamp(1.6rem, 3.5vw, 2.2rem);
            font-weight: 700;
            margin-bottom: 28px;
            color: var(--text-main);
        }}
        section {{
            padding: 48px 0;
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        
        /* Grid Layout */
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
            gap: 24px;
        }}
        .glass-card {{
            background: var(--card-bg);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 26px;
            box-shadow: var(--glass-shadow);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }}
        .glass-card:hover {{
            transform: translateY(-8px);
            box-shadow: 0 22px 42px rgba(31, 38, 135, 0.16);
        }}
        .glass-card:hover .project-card-img {{
            transform: scale(1.08);
        }}
        .glass-card h3 {{
            font-size: 1.25rem;
            margin-bottom: 8px;
            font-weight: 700;
            color: var(--text-main);
        }}
        .glass-card .subtitle {{
            font-size: 0.92rem;
            color: var(--primary);
            font-weight: 600;
            margin-bottom: 14px;
        }}
        .glass-card p {{
            color: var(--text-muted);
            font-size: 0.95rem;
            flex: 1;
            line-height: 1.6;
        }}
        .project-img-wrapper {{
            margin: -26px -26px 18px -26px;
            overflow: hidden;
            border-radius: 20px 20px 0 0;
            background: #e2e8f0;
        }}
        .project-card-img {{
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            display: block;
        }}
        
        /* Skills Section */
        .skills-container {{
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }}
        .skill-tag {{
            background: rgba(59, 130, 246, 0.08);
            color: var(--primary);
            padding: 8px 18px;
            border-radius: 999px;
            font-size: 0.92rem;
            font-weight: 600;
            border: 1px solid rgba(59, 130, 246, 0.22);
            transition: background 0.25s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        .skill-tag:hover {{
            background: var(--primary);
            color: #ffffff;
            transform: translateY(-2px) scale(1.05);
        }}
        /* Responsive Breakpoints matching Device Categories */
        @media (max-width: 479px) {{
            .navbar {{ padding: 14px 16px; }}
            .container {{ width: 100%; max-width: 100%; padding: 0 14px; margin: 0 auto; }}
            .hero {{ flex-direction: column-reverse; text-align: center; gap: 24px; padding: 36px 0; }}
            .hero h1 {{ font-size: 2.1rem; }}
            .hero-img {{ width: 130px; height: 130px; }}
            .social-links {{ justify-content: center; gap: 10px; }}
            .grid {{ grid-template-columns: 1fr; gap: 16px; }}
            .glass-card {{ padding: 20px; border-radius: 16px; }}
        }}
        @media (min-width: 480px) and (max-width: 767px) {{
            .navbar {{ padding: 16px 20px; }}
            .container {{ width: 100%; max-width: 460px; padding: 0 16px; margin: 0 auto; }}
            .hero {{ flex-direction: column-reverse; text-align: center; gap: 28px; padding: 48px 0; }}
            .grid {{ grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }}
            .glass-card {{ padding: 22px; }}
        }}
        @media (min-width: 768px) and (max-width: 1023px) {{
            .navbar {{ padding: 16px 32px; }}
            .container {{ width: 100%; max-width: 750px; padding: 0 24px; margin: 0 auto; }}
            .grid {{ grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; }}
        }}
    </style>
</head>
<body>
    <div class="bg-mesh"></div>
    <nav class="navbar">
        <div class="nav-inner">
            <a href="#" class="brand"><i class="fas fa-briefcase"></i> <span>{name}</span></a>
            <ul class="nav-links">
                <li><a href="#about">About</a></li>"""

        if skills:
            html += '                <li><a href="#skills">Skills</a></li>\n'
        if experience:
            html += '                <li><a href="#experience">Experience</a></li>\n'
        if projects:
            html += '                <li><a href="#projects">Projects</a></li>\n'
        if education:
            html += '                <li><a href="#education">Education</a></li>\n'

        html += """            </ul>
        </div>
    </nav>
    
    <div class="container">
        <header class="hero" id="about">
            <div class="hero-content">
                <h1>""" + name + """</h1>
                <h2>""" + role + """</h2>
                <p>""" + (summary or "Passionate professional architecting high-performance applications and delivering exceptional results.") + """</p>
                
                <div class="social-links">"""

        if email:
            html += f'                    <a href="mailto:{email}" title="Email" class="icon-btn"><i class="fas fa-envelope"></i></a>\n'
        if phone:
            html += f'                    <a href="tel:{phone}" title="Phone" class="icon-btn"><i class="fas fa-phone"></i></a>\n'
        if socials.get('linkedin'):
            link = socials.get('linkedin') if 'http' in socials.get('linkedin') else f"https://linkedin.com/in/{socials.get('linkedin')}"
            html += f'                    <a href="{link}" target="_blank" title="LinkedIn" class="icon-btn"><i class="fab fa-linkedin-in"></i></a>\n'
        if socials.get('github'):
            link = socials.get('github') if 'http' in socials.get('github') else f"https://github.com/{socials.get('github')}"
            html += f'                    <a href="{link}" target="_blank" title="GitHub" class="icon-btn"><i class="fab fa-github"></i></a>\n'
        if socials.get('portfolio'):
            link = socials.get('portfolio') if 'http' in socials.get('portfolio') else f"https://{socials.get('portfolio')}"
            html += f'                    <a href="{link}" target="_blank" title="Website" class="icon-btn"><i class="fas fa-globe"></i></a>\n'
            
        if resume_url:
            html += f'                    <a href="{resume_url}" target="_blank" class="resume-btn"><i class="fas fa-file-pdf"></i> Resume</a>\n'
            
        html += """                </div>
            </div>"""

        if photo_url:
            primary_src, fallback_src = self.normalize_image(photo_url)
            err_attr = f' onerror="if(!this.dataset.retried){{this.dataset.retried=true;this.src=\'{fallback_src}\';}}"' if fallback_src else ''
            html += f'\n            <img src="{primary_src}" class="hero-img" alt="{name}" referrerpolicy="no-referrer"{err_attr}>'

        html += """
        </header>"""

        # Skills Section
        if skills:
            html += """
        <section id="skills">
            <h2 class="section-title">Core Competencies</h2>
            <div class="skills-container">"""
            for skill in skills:
                html += f'\n                <span class="skill-tag">{skill}</span>'
            html += """
            </div>
        </section>"""

        # Experience Section
        valid_experience = [e for e in experience if any((e.get('company', '').strip(), e.get('role', '').strip(), e.get('description', '').strip()))]
        if valid_experience:
            html += """
        <section id="experience">
            <h2 class="section-title">Experience</h2>
            <div class="grid">"""
            for exp in valid_experience:
                company = exp.get('company', '').strip()
                exp_role = exp.get('role', 'Role').strip() or 'Role'
                duration = exp.get('duration', '').strip()
                desc = exp.get('description', '').strip()
                sub_parts = [p for p in [company, duration] if p]
                sub_str = f'<div class="subtitle"><i class="fas fa-building" style="margin-right:6px;"></i>{" &nbsp;|&nbsp; ".join(sub_parts)}</div>' if sub_parts else ''
                html += f"""
                <div class="glass-card">
                    <h3>{exp_role}</h3>
                    {sub_str}
                    <p>{desc}</p>
                </div>"""
            html += """
            </div>
        </section>"""

        # Projects Section
        valid_projects = [p for p in projects if any((p.get('title', '').strip(), p.get('description', '').strip(), p.get('imageUrl', '').strip(), p.get('link', '').strip()))]
        if valid_projects:
            html += """
        <section id="projects">
            <h2 class="section-title">Selected Projects</h2>
            <div class="grid">"""
            for proj in valid_projects:
                proj_title = proj.get('title', 'Project').strip() or 'Project'
                proj_desc = proj.get('description', '').strip()
                proj_link = proj.get('link', '').strip()
                raw_img = proj.get('imageUrl', '').strip() or proj.get('image', '').strip()

                if raw_img:
                    primary_src, fallback_src = self.normalize_image(raw_img)
                    err_attr = f' onerror="if(!this.dataset.retried){{this.dataset.retried=true;this.src=\'{fallback_src}\';}}"' if fallback_src else ''
                    img_html = f"""
                    <div class="project-img-wrapper">
                        <img src="{primary_src}" alt="{proj_title}" class="project-card-img" referrerpolicy="no-referrer"{err_attr}>
                    </div>"""
                else:
                    img_html = ""

                link_html = f'<a href="{proj_link}" target="_blank" class="resume-btn" style="margin-top:16px; align-self:flex-start;">View Project <i class="fas fa-arrow-right" style="margin-left:4px;"></i></a>' if proj_link else ''

                html += f"""
                <div class="glass-card">
                    {img_html}
                    <h3>{proj_title}</h3>
                    <p>{proj_desc}</p>
                    {link_html}
                </div>"""
            html += """
            </div>
        </section>"""

        # Education Section
        valid_education = [ed for ed in education if any((ed.get('institution', '').strip(), ed.get('degree', '').strip(), ed.get('year', '').strip()))]
        if valid_education:
            html += """
        <section id="education">
            <h2 class="section-title">Education</h2>
            <div class="grid">"""
            for ed in valid_education:
                degree = ed.get('degree', 'Degree').strip() or 'Degree'
                inst = ed.get('institution', '').strip()
                year = ed.get('year', '').strip()
                sub_parts = [p for p in [inst, year] if p]
                sub_str = f'<div class="subtitle"><i class="fas fa-university" style="margin-right:6px;"></i>{" &nbsp;|&nbsp; ".join(sub_parts)}</div>' if sub_parts else ''
                html += f"""
                <div class="glass-card">
                    <h3>{degree}</h3>
                    {sub_str}
                </div>"""
            html += """
            </div>
        </section>"""

        # Certificates Section
        valid_certs = [c for c in certificates if any((c.get('name', '').strip(), c.get('issuer', '').strip(), c.get('year', '').strip(), c.get('imageUrl', '').strip()))]
        if valid_certs:
            html += """
        <section>
            <h2 class="section-title">Certifications</h2>
            <div class="grid">"""
            for cert in valid_certs:
                cname = cert.get('name', 'Certificate').strip() or 'Certificate'
                issuer = cert.get('issuer', '').strip()
                cyear = cert.get('year', '').strip()
                cert_img = cert.get('imageUrl', '').strip() or cert.get('image', '').strip()

                img_html = ""
                if cert_img:
                    primary_src, fallback_src = self.normalize_image(cert_img)
                    err_attr = f' onerror="if(!this.dataset.retried){{this.dataset.retried=true;this.src=\'{fallback_src}\';}}"' if fallback_src else ''
                    img_html = f"""
                    <div class="project-img-wrapper" style="margin-bottom:14px;">
                        <img src="{primary_src}" alt="{cname}" class="project-card-img" referrerpolicy="no-referrer"{err_attr}>
                    </div>"""

                sub_parts = [p for p in [issuer, cyear] if p]
                sub_str = f'<div class="subtitle"><i class="fas fa-award" style="margin-right:6px;"></i>{" &nbsp;|&nbsp; ".join(sub_parts)}</div>' if sub_parts else ''

                html += f"""
                <div class="glass-card">
                    {img_html}
                    <h3>{cname}</h3>
                    {sub_str}
                </div>"""
            html += """
            </div>
        </section>"""

        # Achievements Section
        if achievements:
            html += f"""
        <section>
            <h2 class="section-title">Achievements</h2>
            <div class="glass-card" style="display:block;">
                <p style="white-space: pre-line; line-height: 1.7;">{achievements}</p>
            </div>
        </section>"""

        html += f"""
        <footer style="text-align:center; padding: 60px 0 40px; opacity: 0.7; font-size:0.92rem;">
            <p>&copy; {name} &bull; Powered by AI Portfolio Builder Pro</p>
        </footer>
    </div>
</body>
</html>"""
        return {
            "html": html
        }
