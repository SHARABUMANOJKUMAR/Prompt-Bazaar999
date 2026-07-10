class ContentEnhancementAgent:
    """
    Improves biography, project summaries, experience summaries using prompt engineering.
    For this implementation, it uses simple heuristic enhancements unless hooked up to an LLM.
    """
    def execute(self, data):
        summary = data.get('summary', '').strip()
        if summary:
            enhanced_summary = summary
        else:
            enhanced_summary = "Innovative professional dedicated to building high-quality, scalable solutions and delivering exceptional results."
            
        return {
            "enhanced_summary": enhanced_summary,
        }
