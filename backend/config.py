import os
from typing import Dict, Any

class Config:
    # AI Model Settings
    AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")  # Default to OpenAI
    
    # Model names
    CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")  # For chat/text generation
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")  # For embeddings
    
    # Model parameters - common across most LLM providers
    MODEL_TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "0.1"))
    MODEL_PRESENCE_PENALTY = float(os.getenv("MODEL_PRESENCE_PENALTY", "0.0"))
    MODEL_FREQUENCY_PENALTY = float(os.getenv("MODEL_FREQUENCY_PENALTY", "0.0"))
    MODEL_MAX_TOKENS = int(os.getenv("MODEL_MAX_TOKENS", "2000"))
    MODEL_TOP_P = float(os.getenv("MODEL_TOP_P", "1.0"))
    
    # Vector Store Settings
    VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "backend/vector_store")
    VECTOR_STORE_TOP_K = int(os.getenv("VECTOR_STORE_TOP_K", "5"))
    
    # Meme Generation Settings
    MEME_TEMPLATE_PATH = os.getenv("MEME_TEMPLATE_PATH", "utils/9au02y.jpg")
    MEME_OUTPUT_PATH = os.getenv("MEME_OUTPUT_PATH", "output_meme.jpg")
    MEME_FONT_PATH = os.getenv("MEME_FONT_PATH", "utils/fonts/Arial_Unicode.ttf")
    
    # Text Settings
    MEME_TEXT_MAX_WIDTH_RATIO = float(os.getenv("MEME_TEXT_MAX_WIDTH_RATIO", "0.9"))
    MEME_TEXT_MARGIN_RATIO = float(os.getenv("MEME_TEXT_MARGIN_RATIO", "0.1"))
    
    # File Processing Settings
    CHAT_FILE_PATH = os.getenv("CHAT_FILE_PATH", "")
    
    @classmethod
    def get_model_config(cls) -> Dict[str, Any]:
        """Get model configuration as a dictionary"""
        config = {
            "temperature": cls.MODEL_TEMPERATURE,
            "model": cls.CHAT_MODEL,
            "presence_penalty": cls.MODEL_PRESENCE_PENALTY,
            "frequency_penalty": cls.MODEL_FREQUENCY_PENALTY,
            "max_tokens": cls.MODEL_MAX_TOKENS,
            "top_p": cls.MODEL_TOP_P
        }
        
        # Add OpenAI-specific config when using OpenAI
        if cls.AI_PROVIDER == "openai":
            config["response_format"] = {"type": "json_object"}
        
        return config
    
    @classmethod
    def get_embedding_config(cls) -> Dict[str, Any]:
        """Get embedding model configuration as a dictionary"""
        return {
            "model": cls.EMBEDDING_MODEL
        }
    
    @classmethod
    def get_meme_config(cls) -> Dict[str, Any]:
        """Get meme generation configuration as a dictionary"""
        return {
            "max_width_ratio": cls.MEME_TEXT_MAX_WIDTH_RATIO,
            "top_bottom_margin_ratio": cls.MEME_TEXT_MARGIN_RATIO,
            "font_path": cls.MEME_FONT_PATH
        } 