from whatsapp_handler import WhatsAppMessageHandler

from dotenv import load_dotenv
load_dotenv()
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import ReadTheDocsLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
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

def group_messages_by_conversation(messages: List[str], max_time_gap: int = 30) -> List[List[str]]:
    """Group messages into conversations based on time gaps."""
    if not messages:
        return []
    
    conversations = []
    current_conversation = []
    last_timestamp = None
    
    for message in messages:
        current_timestamp = extract_timestamp(message)
        
        if current_timestamp is None:
            # If we can't parse timestamp, just add to current conversation
            current_conversation.append(message)
            continue
            
        if last_timestamp is None:
            current_conversation.append(message)
        else:
            time_diff = (current_timestamp - last_timestamp).total_seconds() / 60
            
            if time_diff > max_time_gap and current_conversation:
                conversations.append(current_conversation)
                current_conversation = []
            
            current_conversation.append(message)
        
        last_timestamp = current_timestamp if current_timestamp else last_timestamp
    
    if current_conversation:
        conversations.append(current_conversation)
    
    return conversations

def main():
    # Load and parse chat
    handler = WhatsAppMessageHandler()
    chat_path = "/Users/guy.asulin/PersonalCodeBase/whatsapp_meme_maker/backend/_chat.txt"
    messages = handler.parse_chat_file(chat_path)
    
    # Convert WhatsAppMessage objects to strings
    message_strings = [str(message) for message in messages]
    
    # Group messages into conversations
    conversations = group_messages_by_conversation(message_strings)
    
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
    for chunk, metadata in all_chunks[:-5]:
        print(f"\n--- Chunk (Messages: {metadata['message_count']}, Time: {metadata['start_time']} to {metadata['end_time']}) ---\n{chunk}")
    
    index_name = os.getenv("PINECONE_INDEX_NAME")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Process in batches
    total_processed = 0
    for batch in process_in_batches(all_chunks, batch_size=50):
        texts, metadatas = zip(*batch)  # Unzip the chunks and their metadata
        vector_store = PineconeVectorStore.from_texts(
            texts=texts,
            embedding=embeddings,
            index_name=index_name,
            metadatas=metadatas
        )
        total_processed += len(batch)
        print(f"Processed {total_processed}/{len(all_chunks)} chunks...")
        time.sleep(0.1)  # Add delay between batches
    
    print(f"Successfully uploaded all {len(all_chunks)} conversation chunks to Pinecone index '{index_name}'")
    

if __name__ == "__main__":
    main()
    


