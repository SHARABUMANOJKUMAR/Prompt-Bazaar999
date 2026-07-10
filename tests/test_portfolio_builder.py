import unittest
import os
import sys

# Ensure project root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.portfolio_agents.orchestrator import PortfolioOrchestrator
from services.portfolio_agents.agent_1_validator import InputValidationAgent
from services.portfolio_agents.agent_5_generator import PortfolioGenerationAgent


class TestPortfolioBuilderPipeline(unittest.TestCase):
    def setUp(self):
        self.orchestrator = PortfolioOrchestrator()
        self.sample_data = {
            "personal": {
                "firstName": "Jane",
                "lastName": "Doe",
                "role": "Cloud AI Architect",
                "email": "jane@example.com",
                "photoUrl": "https://images.unsplash.com/photo-sample"
            },
            "skills": ["Python", "Kubernetes", "AWS", "TensorFlow"],
            "projects": [
                {
                    "title": "AI Cloud Deployer",
                    "description": "Autonomous cloud pipeline orchestrator.",
                    "link": "https://github.com/example",
                    "imageUrl": "https://images.unsplash.com/photo-proj"
                }
            ],
            "certificates": [
                {
                    "name": "AWS Certified Solutions Architect",
                    "issuer": "Amazon Web Services",
                    "year": "2025",
                    "imageUrl": "https://images.unsplash.com/photo-cert"
                }
            ],
            "theme": "Modern AI",
            "colorPalette": "#0D6EFD",
            "font": "Inter"
        }

    def test_agent_1_input_validation(self):
        validator = InputValidationAgent()
        result = validator.execute(self.sample_data)
        self.assertTrue(result["is_valid"])
        self.assertIn("validated_data", result)

    def test_orchestrator_end_to_end_generation(self):
        result = self.orchestrator.generate(
            user_id="test_user_101",
            username="janedoe",
            data=self.sample_data
        )
        self.assertTrue(result["success"])
        self.assertEqual(result["url"], "/p/janedoe")
        self.assertIn("<!DOCTYPE html>", result["html"])
        self.assertIn("Jane Doe", result["html"])
        self.assertIn("Cloud AI Architect", result["html"])
        # Ensure SEO tags are present
        self.assertIn('<meta name="description"', result["html"])
        self.assertIn('<meta name="keywords"', result["html"])

    def test_empty_section_filtering(self):
        # Data with empty certificates and achievements
        empty_section_data = {
            "personal": {"name": "Empty Test"},
            "certificates": [{"name": "", "issuer": ""}],
            "achievements": ""
        }
        result = self.orchestrator.generate(
            user_id="test_user_102",
            username="emptytest",
            data=empty_section_data
        )
        self.assertTrue(result["success"])
        self.assertNotIn("Certifications", result["html"])


if __name__ == '__main__':
    unittest.main()
