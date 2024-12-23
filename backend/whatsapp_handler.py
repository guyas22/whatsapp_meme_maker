import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from langchain.schema import Document

@dataclass
class WhatsAppMessage:
    """A WhatsApp message with timestamp, sender and content"""
    timestamp: datetime
    sender: str
    content: str
    message_type: str = "text"
    
    def __str__(self):
        return f"[{self.timestamp}] {self.sender}: {self.content}"
    
    def to_document(self) -> Document:
        """Convert WhatsAppMessage to Langchain Document"""
        return Document(
            page_content=self.content,
            metadata={
                "sender": self.sender,
                "timestamp": str(self.timestamp)
            }
        )

class WhatsAppMessageHandler:
    """Handles parsing of WhatsApp chat messages"""
    def __init__(self):
        self.message_pattern = re.compile(
            r'\[(\d{2}/\d{2}/\d{4}, \d{2}:\d{2}:\d{2})\] ([^:]+): (.*)',
            re.MULTILINE
        )
        self.media_pattern = re.compile(
            r'(?:image|video|audio|sticker|GIF) omitted',
            re.IGNORECASE
        )
    
    def parse_message(self, line: str) -> Optional[WhatsAppMessage]:
        """Parse a single message line"""
        match = self.message_pattern.match(line.strip())
        if not match:
            return None
            
        timestamp_str, sender, content = match.groups()
        
        # Check if it's a media message
        media_match = self.media_pattern.search(content)
        message_type = "text"
        if media_match:
            message_type = media_match.group().lower().split()[0]
            
        return WhatsAppMessage(
            timestamp=datetime.strptime(timestamp_str, "%d/%m/%Y, %H:%M:%S"),
            sender=sender.strip(),
            content=content.strip(),
            message_type=message_type
        )
    
    def parse_chat_file(self, file_path: str) -> List[WhatsAppMessage]:
        """Parse a WhatsApp chat export file"""
        messages = []
        with open(file_path, 'r', encoding='utf-8') as f:
            current_message = []
            for line in f:
                line = line.strip()
                if self.message_pattern.match(line):
                    if current_message:
                        msg = self.parse_message(" ".join(current_message))
                        if msg:
                            messages.append(msg)
                        current_message = []
                    current_message.append(line)
                elif line:  # Handle multi-line messages
                    current_message.append(line)
            
            # Handle last message
            if current_message:
                msg = self.parse_message(" ".join(current_message))
                if msg:
                    messages.append(msg)
                    
        return messages
        