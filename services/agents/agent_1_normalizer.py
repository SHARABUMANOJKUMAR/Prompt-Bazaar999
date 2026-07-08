"""
Prompt Bazaar V7 — Agent 1: Input Normalization Agent
Cleans messy, mixed-language, abbreviated, broken user input
into clean semantic text while preserving intent.
"""
import re
import logging
from services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

# Common abbreviations (English + Hinglish + mixed)
ABBREVIATION_MAP = {
    "plz": "please", "pls": "please", "u": "you", "ur": "your",
    "r": "are", "msg": "message", "info": "information", "govt": "government",
    "mgmt": "management", "dev": "development", "devs": "developers",
    "env": "environment", "config": "configuration", "auth": "authentication",
    "db": "database", "ui": "user interface", "ux": "user experience",
    "api": "API", "apis": "APIs", "ml": "machine learning",
    "ai": "artificial intelligence", "dl": "deep learning",
    "llm": "large language model", "llms": "large language models",
    "seo": "search engine optimization", "sem": "search engine marketing",
    "crm": "customer relationship management", "erp": "enterprise resource planning",
    "hr": "human resources", "qty": "quantity", "approx": "approximately",
    "dept": "department", "org": "organization", "docs": "documentation",
    "repo": "repository", "repos": "repositories", "impl": "implementation",
    "func": "function", "funcs": "functions", "param": "parameter",
    "params": "parameters", "args": "arguments", "req": "requirement",
    "reqs": "requirements", "spec": "specification", "specs": "specifications",
    "perf": "performance", "sec": "security", "prod": "production",
    "infra": "infrastructure", "k8s": "Kubernetes", "tf": "Terraform",
    "mktg": "marketing", "biz": "business", "cust": "customer",
    "w/": "with", "w/o": "without", "b/w": "between",
    "thx": "thanks", "thnx": "thanks", "asap": "as soon as possible",
    "fyi": "for your information", "btw": "by the way",
    "imo": "in my opinion", "tbh": "to be honest",
    "wrt": "with respect to", "eg": "for example", "ie": "that is",
    "etc": "and so on", "vs": "versus",
    # Common Telugu/Hindi transliterations
    "karo": "do", "banao": "create", "chahiye": "need", "kaise": "how",
    "kya": "what", "hai": "is", "nahi": "not", "aur": "and",
    "ek": "one", "do": "two", "accha": "good", "theek": "okay",
    "website": "website", "app": "application",
}

# Common misspellings
SPELLING_CORRECTIONS = {
    "websit": "website", "webiste": "website", "aplication": "application",
    "applicaiton": "application", "developement": "development",
    "managment": "management", "managemnt": "management",
    "restarant": "restaurant", "resturant": "restaurant", "restraunt": "restaurant",
    "buisness": "business", "bussiness": "business", "busines": "business",
    "marketting": "marketing", "marketng": "marketing",
    "programing": "programming", "programmin": "programming",
    "analisis": "analysis", "anlaysis": "analysis",
    "heathcare": "healthcare", "helthcare": "healthcare",
    "securty": "security", "securtiy": "security",
    "educaton": "education", "educaiton": "education",
    "optimze": "optimize", "optimise": "optimize",
    "databse": "database", "datbase": "database",
    "autentication": "authentication", "athentication": "authentication",
    "respnsive": "responsive", "responsve": "responsive",
    "ecommerce": "e-commerce", "ecomerce": "e-commerce",
    "performace": "performance", "perfomance": "performance",
    "accesibility": "accessibility", "accessiblity": "accessibility",
    "integation": "integration", "integraton": "integration",
    "architecure": "architecture", "archetecture": "architecture",
    "deployement": "deployment", "deploymnt": "deployment",
}


class InputNormalizationAgent(BaseAgent):
    """
    Agent 1: Normalizes messy user input into clean semantic text.
    Handles grammar, spelling, abbreviations, mixed language,
    duplicate words, and broken sentences.
    """

    name = "Agent 1: Input Normalization"

    def execute(self, context: dict) -> dict:
        raw_input = context.get("raw_input", "")
        if not raw_input or not raw_input.strip():
            return {"normalized_input": "", "normalization_applied": []}

        text = raw_input.strip()
        changes = []

        # Step 1: Fix encoding artifacts
        text = text.replace("\u200b", "").replace("\u00a0", " ")
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

        # Step 2: Normalize whitespace
        original = text
        text = re.sub(r"\s+", " ", text).strip()
        if text != original:
            changes.append("normalized_whitespace")

        # Step 3: Fix spelling errors
        words = text.split()
        corrected_words = []
        for w in words:
            lower = w.lower().strip(".,!?;:")
            if lower in SPELLING_CORRECTIONS:
                corrected = SPELLING_CORRECTIONS[lower]
                # Preserve the original casing pattern for the replacement
                if w[0].isupper():
                    corrected = corrected.capitalize()
                corrected_words.append(corrected)
                changes.append(f"spelling:{lower}→{corrected}")
            else:
                corrected_words.append(w)
        text = " ".join(corrected_words)

        # Step 4: Expand abbreviations (only standalone words)
        words = text.split()
        expanded_words = []
        for w in words:
            lower = w.lower().strip(".,!?;:")
            punct_suffix = ""
            if w and w[-1] in ".,!?;:":
                punct_suffix = w[-1]
                w = w[:-1]
            if lower in ABBREVIATION_MAP:
                expanded = ABBREVIATION_MAP[lower]
                expanded_words.append(expanded + punct_suffix)
                changes.append(f"abbrev:{lower}→{expanded}")
            else:
                expanded_words.append(w + punct_suffix)
        text = " ".join(expanded_words)

        # Step 5: Remove consecutive duplicate words
        original = text
        text = re.sub(r"\b(\w+)(\s+\1\b)+", r"\1", text, flags=re.IGNORECASE)
        if text != original:
            changes.append("removed_duplicates")

        # Step 6: Fix broken sentence fragments (ensure first letter capitalized)
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
            changes.append("capitalized_start")

        # Step 7: Ensure the text ends with a period if it's a complete thought
        if text and text[-1] not in ".!?":
            text += "."
            changes.append("added_period")

        # Step 8: Clean up extra punctuation
        text = re.sub(r"\.{2,}", ".", text)
        text = re.sub(r"\!{2,}", "!", text)
        text = re.sub(r"\?{2,}", "?", text)

        return {
            "normalized_input": text,
            "normalization_applied": list(set(changes)),
            "normalization_count": len(set(changes)),
        }
