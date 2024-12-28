from backend.whatsapp_handler import WhatsAppMessageHandler
from dotenv import load_dotenv
load_dotenv()
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
import os
import time
from typing import List
from datetime import datetime, timedelta

def process_in_batches(texts: List[str], batch_size: int = 100):
    """Process texts in batches to avoid rate limits."""
    for i in range(0, len(texts), batch_size):
        yield texts[i:i + batch_size]

def extract_timestamp(message: str) -> datetime:
    """Extract timestamp from a message in format [YYYY-MM-DD HH:MM:SS]."""
    try:
        # Extract timestamp between first [ and ]
        timestamp_str = message[message.find("[")+1:message.find("]")]
        return datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
    except (ValueError, IndexError):
        return None

def group_messages_by_conversation(messages: List[str], min_messages: int = 10, max_time_gap: int = 30) -> List[List[str]]:
    """
    Group messages into conversations based on time gaps and minimum message count.
    
    Args:
        messages (List[str]): List of messages to group
        min_messages (int): Minimum number of messages per conversation
        max_time_gap (int): Maximum time gap in minutes between messages
        
    Returns:
        List[List[str]]: List of conversation groups
    """
    if not messages:
        return []
    
    conversations = []
    current_conversation = []
    last_timestamp = None
    
    for i, message in enumerate(messages):
        current_timestamp = extract_timestamp(message)
        
        if current_timestamp is None:
            # If we can't parse timestamp, just add to current conversation
            current_conversation.append(message)
            continue
            
        if last_timestamp is None:
            current_conversation.append(message)
        else:
            time_diff = (current_timestamp - last_timestamp).total_seconds() / 60
            
            # Check if we should start a new conversation
            if time_diff > max_time_gap and len(current_conversation) >= min_messages:
                conversations.append(current_conversation)
                current_conversation = []
            
            current_conversation.append(message)
        
        last_timestamp = current_timestamp if current_timestamp else last_timestamp
        
        # Check if we're at the end of messages
        if i == len(messages) - 1:
            if len(current_conversation) >= min_messages:
                conversations.append(current_conversation)
            elif conversations:
                # If the last conversation is too small, add it to the previous one
                conversations[-1].extend(current_conversation)
    
    # Post-process conversations to ensure minimum message count
    processed_conversations = []
    temp_conversation = []
    
    for conv in conversations:
        temp_conversation.extend(conv)
        if len(temp_conversation) >= min_messages:
            processed_conversations.append(temp_conversation)
            temp_conversation = []
    
    # Handle any remaining messages
    if temp_conversation:
        if processed_conversations:
            processed_conversations[-1].extend(temp_conversation)
        elif len(temp_conversation) >= min_messages:
            processed_conversations.append(temp_conversation)
    
    return processed_conversations

def extract_unique_senders(messages: List[str]) -> List[str]:
    """Extract unique sender names from messages.
    
    Args:
        messages (List[str]): List of messages in string format
        
    Returns:
        List[str]: List of unique sender names
    """
    senders = set()
    for message in messages:
        try:
            # Extract sender name between ] and :
            parts = message.split(']', 1)
            if len(parts) > 1:
                sender = parts[1].split(':', 1)[0].strip()
                if sender:  # Only add non-empty sender names
                    senders.add(sender)
        except (IndexError, AttributeError):
            continue
    return sorted(list(senders))

def main():
    # Load and parse chat
    handler = WhatsAppMessageHandler()
    chat_path = os.environ.get("CHAT_FILE_PATH", "/Users/guy.asulin/PersonalCodeBase/whatsapp_meme_maker/backend/_chat.txt")
    messages = handler.parse_chat_file(chat_path)
    
    # Convert WhatsAppMessage objects to strings
    message_strings = [str(message) for message in messages]
    
    # Extract unique senders
    unique_senders = extract_unique_senders(message_strings)
    print(f"\nFound {len(unique_senders)} unique senders in the chat:")
    for sender in unique_senders:
        print(f"- {sender}")
    
    # Group messages into conversations with minimum 10 messages
    conversations = group_messages_by_conversation(message_strings, min_messages=10)
    
    # Create text splitter optimized for conversation context
    text_splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n"],  # Simplified separators to keep more context
        chunk_size=2000,  # Much larger chunks to keep conversations together
        chunk_overlap=200,  # Increased overlap
        length_function=len,
        is_separator_regex=False
    )
    
    # Process each conversation group
    all_chunks = []
    for conv in conversations:
        if len(conv) > 0:
            text = "\n".join(conv)
            chunks = text_splitter.split_text(text)
            
            # Get first and last timestamp for each chunk
            for chunk in chunks:
                chunk_messages = chunk.split("\n")
                first_timestamp = extract_timestamp(chunk_messages[0])
                last_timestamp = extract_timestamp(chunk_messages[-1])
                
                metadata = {
                    "chunk_type": "conversation",
                    "message_count": len(chunk_messages),
                    "length": len(chunk),
                    "start_time": first_timestamp.strftime("%Y-%m-%d %H:%M:%S") if first_timestamp else "unknown",
                    "end_time": last_timestamp.strftime("%Y-%m-%d %H:%M:%S") if last_timestamp else "unknown"
                }
                all_chunks.append((chunk, metadata))
    
    print(f"Split into {len(all_chunks)} conversation chunks")
    print("\nFirst 5 chunks:")
    for chunk, metadata in all_chunks[:5]:
        print(f"\n--- Chunk (Messages: {metadata['message_count']}, Time: {metadata['start_time']} to {metadata['end_time']}) ---\n{chunk}")
    
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Process in batches and create FAISS index
    texts, metadatas = zip(*all_chunks)
    vector_store = FAISS.from_texts(
        texts=texts,
        embedding=embeddings,
        metadatas=list(metadatas)
    )
    
    # Save the FAISS index locally
    vector_store.save_local("backend/vector_store")
    
    print(f"Successfully saved {len(all_chunks)} conversation chunks to local FAISS index")
    return unique_senders

if __name__ == "__main__":
    main() 