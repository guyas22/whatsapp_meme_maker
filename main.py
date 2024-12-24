import streamlit as st
import os
import sys
import tempfile
from PIL import Image
from datetime import datetime
import zipfile
import io

# Add backend to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.chat_flow_handler import ChatFlowHandler

st.set_page_config(
    page_title="WhatsApp Meme Generator",
    page_icon="🎭",
    layout="wide"
)

def format_chat_message(message):
    """Format a single chat message in WhatsApp style"""
    try:
        # Extract timestamp and content
        timestamp_end = message.find("]") + 1
        timestamp_str = message[1:timestamp_end-1]  # Remove brackets
        
        # Extract name and content
        remaining = message[timestamp_end:].strip()
        name_end = remaining.find(":")
        if name_end == -1:
            return None
            
        name = remaining[:name_end].strip()
        content = remaining[name_end+1:].strip()
        
        # Format timestamp for display
        timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        display_time = timestamp.strftime("%H:%M")
        
        return {
            "timestamp": timestamp,
            "display_time": display_time,
            "name": name,
            "content": content
        }
    except:
        return None

def display_chat_chunk(chunk_content, metadata, index):
    """Display a conversation chunk in WhatsApp style"""
    st.markdown(f"**Conversation {index}**")
    st.markdown(f"*{metadata.get('start_time')} - {metadata.get('end_time')}*")
    
    # Create a container with custom CSS for chat-like appearance
    chat_container = st.container()
    with chat_container:
        st.markdown("""
        <style>
        .chat-message {
            padding: 10px;
            margin: 5px;
            border-radius: 15px;
            max-width: 90%;
        }
        .chat-message.received {
            background-color: #077c26;
            margin-right: 20%;
        }
        .chat-message-header {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .chat-message-time {
            float: right;
            color: #666;
            font-size: 0.8em;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Split into individual messages and format each
        messages = chunk_content.split('\n')
        for msg in messages:
            if not msg.strip():
                continue
                
            formatted = format_chat_message(msg)
            if formatted:
                st.markdown(f"""
                <div class="chat-message received">
                    <div class="chat-message-header">
                        {formatted['name']}
                        <span class="chat-message-time">{formatted['display_time']}</span>
                    </div>
                    {formatted['content']}
                </div>
                """, unsafe_allow_html=True)
    
    st.markdown("---")

def extract_txt_from_zip(zip_content):
    """Extract the first .txt file found in the zip archive"""
    with zipfile.ZipFile(io.BytesIO(zip_content)) as zip_ref:
        txt_files = [f for f in zip_ref.namelist() if f.lower().endswith('.txt')]
        if not txt_files:
            return None
        return zip_ref.read(txt_files[0])

def main():
    st.title("🎭 WhatsApp Meme Generator")
    
    # Initialize session state
    if 'chat_handler' not in st.session_state:
        st.session_state.chat_handler = ChatFlowHandler()
    if 'processing_complete' not in st.session_state:
        st.session_state.processing_complete = False
    
    # File upload section
    st.header("1. Upload Chat File")
    uploaded_file = st.file_uploader("Choose a WhatsApp chat export file", type=['txt', 'zip'])
    
    if uploaded_file:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as tmp_file:
            if uploaded_file.type == "application/zip":
                # Extract text content from zip
                txt_content = extract_txt_from_zip(uploaded_file.read())
                if txt_content is None:
                    st.error("No text file found in the zip archive")
                else:
                    tmp_file.write(txt_content)
                    temp_path = tmp_file.name
            else:
                # Handle regular text file
                tmp_file.write(uploaded_file.getvalue())
                temp_path = tmp_file.name
            
            if st.button("Process Chat"):
                with st.spinner("Processing chat file..."):
                    success = st.session_state.chat_handler.process_uploaded_chat(temp_path)
                    if success:
                        st.session_state.processing_complete = True
                        st.success("Chat processed successfully!")
                    else:
                        st.error("Error processing chat file")
            
            # Clean up the temporary file
            os.unlink(temp_path)
    
    # Meme generation section
    if st.session_state.processing_complete:
        st.header("2. Generate Meme")
        
        # Add some example prompts
        st.markdown("""
        **Example prompts:**
        - תעשה מם על זה שדני תמיד מאחר
        - תעשה מם על הבדיחות של יוסי
        - תעשה מם על הפיצות שאנחנו מזמינים
        """)
        
        meme_prompt = st.text_input("Enter your meme prompt (in Hebrew)")
        
        if meme_prompt:
            with st.spinner("Generating meme..."):
                result = st.session_state.chat_handler.generate_meme(meme_prompt)
                
                if "error" in result:
                    st.error(f"Error generating meme: {result['error']}")
                else:
                    st.success("Meme generated successfully!")
                    
                    col1, col2 = st.columns([1, 2])
                    
                    # Display generated meme
                    with col1:
                        st.subheader("Generated Meme")
                        image = Image.open(result['meme_path'])
                        st.image(image, caption="Generated Meme", use_container_width=True)
                        
                        # Add download button
                        with open(result['meme_path'], "rb") as file:
                            btn = st.download_button(
                                label="⬇️ Download Meme",
                                data=file,
                                file_name="generated_meme.jpg",
                                mime="image/jpeg"
                            )
                        
                    # Display context and conversations
                    with col2:
                        st.subheader("AI Context Used")
                        # Display each conversation chunk in chat style
                        for idx, (content, metadata) in enumerate(result.get('context_chunks', []), 1):
                            display_chat_chunk(content, metadata, idx)
                        

if __name__ == "__main__":
    main()