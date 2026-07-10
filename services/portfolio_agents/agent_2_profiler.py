class PortfolioIntelligenceAgent:
    """
    Analyzes the user's information to determine profession, industry, skill level,
    and best portfolio layout/hierarchy.
    """
    def execute(self, data):
        personal = data.get('personal', {})
        role = personal.get('role', '').lower()
        
        # Simple heuristic profiling
        industry = "Technology"
        if "design" in role or "ux" in role or "ui" in role:
            industry = "Design"
        elif "market" in role or "sales" in role:
            industry = "Marketing"
            
        exp_count = len(data.get('experience', []))
        skill_level = "Junior"
        if exp_count > 5:
            skill_level = "Senior"
        elif exp_count > 2:
            skill_level = "Mid-Level"
            
        return {
            "industry": industry,
            "skill_level": skill_level,
            "recommended_layout": "standard"
        }
