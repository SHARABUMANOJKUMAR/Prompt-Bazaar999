from .agent_1_validator import InputValidationAgent
from .agent_2_profiler import PortfolioIntelligenceAgent
from .agent_3_content import ContentEnhancementAgent
from .agent_4_design import PortfolioDesignAgent
from .agent_5_generator import PortfolioGenerationAgent
from .google_integration import save_portfolio_data
import logging
import threading

logger = logging.getLogger(__name__)

class PortfolioOrchestrator:
    """
    Coordinates the 5-Agent Architecture to generate a portfolio.
    """
    def __init__(self):
        self.validator = InputValidationAgent()
        self.profiler = PortfolioIntelligenceAgent()
        self.content_agent = ContentEnhancementAgent()
        self.design_agent = PortfolioDesignAgent()
        self.generator = PortfolioGenerationAgent()
        
    def generate(self, user_id, username, data):
        # 1. Validation
        validation_result = self.validator.execute(data)
        if not validation_result["is_valid"]:
            return {
                "success": False,
                "message": "Validation Failed: " + ", ".join(validation_result["errors"])
            }
            
        validated_data = validation_result["validated_data"]
        
        # 2. Intelligence/Profiling
        profile_data = self.profiler.execute(validated_data)
        
        # 3. Content Enhancement
        content_data = self.content_agent.execute(validated_data)
        
        # 4. Design
        design_data = self.design_agent.execute(validated_data)
        
        # 5. Generation
        gen_result = self.generator.execute(validated_data, profile_data, content_data, design_data)
        html_content = gen_result["html"]
        
        # 6. Save & Deploy (to Apps Script -> Sheets -> Drive / Netlify simulation)
        # Run Apps Script webhook in a background thread to significantly speed up API response
        threading.Thread(target=save_portfolio_data, args=(user_id, username, validated_data, html_content), daemon=True).start()
        
        # Return the generated URL pattern
        # Assume it will be accessible at /p/<username> via dynamic routing
        return {
            "success": True,
            "url": f"/p/{username}",
            "html": html_content
        }
