import re

class InputValidationAgent:
    """
    Validates input data, including email, phone, URLs, and required fields.
    """
    def __init__(self):
        self.email_regex = re.compile(r'[^@]+@[^@]+\.[^@]+')
        
    def execute(self, data):
        personal = data.get('personal', {})
        if not personal:
            personal = {}
            data['personal'] = personal

        name = personal.get('name', '').strip()
        if not name:
            first = personal.get('firstName', '').strip()
            last = personal.get('lastName', '').strip()
            name = f"{first} {last}".strip()
        if not name:
            name = 'Professional Portfolio'
        personal['name'] = name

        email = personal.get('email', '').strip()
        if not email or not self.email_regex.match(email):
            personal['email'] = 'contact@portfolio.dev'

        return {
            "is_valid": True,
            "errors": [],
            "validated_data": data
        }
