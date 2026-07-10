class PortfolioDesignAgent:
    """
    Selects theme, layout, color palette, typography based on user preferences.
    """
    def execute(self, data):
        theme = data.get('theme', 'Minimal')
        
        # Define design tokens based on theme
        tokens = {
            "Minimal": {
                "bg_color": "#ffffff",
                "text_color": "#111827",
                "primary_color": "#000000",
                "font_family": "'Inter', sans-serif"
            },
            "Dark Pro": {
                "bg_color": "#0f172a",
                "text_color": "#f8fafc",
                "primary_color": "#6366f1",
                "font_family": "'Inter', sans-serif"
            },
            "Gradient": {
                "bg_color": "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
                "text_color": "#333333",
                "primary_color": "#ec4899",
                "font_family": "'Outfit', sans-serif"
            },
            "Glassmorphism": {
                "bg_color": "#e0c3fc",
                "text_color": "#1e1e1e",
                "primary_color": "#8ec5fc",
                "font_family": "'Roboto', sans-serif"
            },
            "Terminal": {
                "bg_color": "#000000",
                "text_color": "#00ff00",
                "primary_color": "#00ff00",
                "font_family": "monospace"
            }
        }
        
        selected_tokens = tokens.get(theme, tokens["Minimal"])
        
        return {
            "design_tokens": selected_tokens
        }
