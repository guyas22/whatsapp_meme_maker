from typing import Dict, Any
from langchain_core.output_parsers import BaseOutputParser
from pydantic import BaseModel, Field

class MemeFormat(BaseModel):
    top_text: str = Field(description="The text that appears at the top of the meme")
    bottom_text: str = Field(description="The text that appears at the bottom of the meme")

class MemeOutputParser(BaseOutputParser):
    """Parser for meme format with top and bottom text."""
    
    def get_format_instructions(self) -> str:
        return """Your response should be formatted as a meme with a top text and bottom text. 
        Use the following JSON format:
        {
            "top_text": "text that goes on top",
            "bottom_text": "text that goes on bottom"
        }
        """

    def parse(self, text: str) -> MemeFormat:
        """Parse the output into a MemeFormat object."""
        try:
            # Debug print
            print("Raw text received:", text)
            
            # Clean up the text and parse as JSON
            import json
            cleaned_text = text.strip()
            
            # Handle different JSON code block formats
            if "```json" in cleaned_text:
                start = cleaned_text.find("```json") + 7
                end = cleaned_text.rfind("```")
                cleaned_text = cleaned_text[start:end].strip()
            elif "```" in cleaned_text:
                start = cleaned_text.find("```") + 3
                end = cleaned_text.rfind("```")
                cleaned_text = cleaned_text[start:end].strip()
            
            print("Cleaned text:", cleaned_text)
            
            try:
                json_object = json.loads(cleaned_text)
            except json.JSONDecodeError as e:
                print(f"JSON decode error at position {e.pos}: {e.msg}")
                print(f"Problem portion: {cleaned_text[max(0, e.pos-20):min(len(cleaned_text), e.pos+20)]}")
                raise
            
            # Convert to MemeFormat
            return MemeFormat(
                top_text=json_object["top_text"],
                bottom_text=json_object["bottom_text"]
            )
        except Exception as e:
            print(f"Full error details: {str(e)}")
            raise ValueError(f"Failed to parse meme output: {str(e)}")

    def parse_with_debug(self, text: str) -> str:
        """Parse the output and return a debug string representation."""
        try:
            meme_format = self.parse(text)
            return f"TOP TEXT: {meme_format.top_text}\nBOTTOM TEXT: {meme_format.bottom_text}"
        except Exception as e:
            return f"Error parsing meme: {str(e)}\nRaw text was: {text}" 