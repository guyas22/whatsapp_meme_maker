from deprecated.core import query_chain
import streamlit as st
from streamlit_chat import message
from dotenv import load_dotenv
from PIL import Image
load_dotenv()

# Add sidebar with user info

# Main content
st.header("Water Asulin Meme Generator")

prompt = st.text_input("Enter your meme idea (in Hebrew)")

if "user_prompt_history" not in st.session_state:
    st.session_state.user_prompt_history = []

if "chat_answer_history" not in st.session_state:
    st.session_state.chat_answer_history = []

if "meme_history" not in st.session_state:
    st.session_state.meme_history = []

if prompt:
    with st.spinner("Generating your meme..."):
        response = query_chain(prompt)
        answer = response["answer"]
        meme_path = response["meme_path"]
        
        st.session_state["user_prompt_history"].append(prompt)
        st.session_state["chat_answer_history"].append(answer)
        st.session_state["meme_history"].append(meme_path)

if st.session_state["user_prompt_history"]:
    for i, (prompt, answer, meme_path) in enumerate(zip(
        st.session_state["user_prompt_history"], 
        st.session_state["chat_answer_history"],
        st.session_state["meme_history"]
    )):
        message(prompt, is_user=True)
        message(f"Top text: {answer.top_text}\nBottom text: {answer.bottom_text}")
        
        # Display the generated meme
        try:
            meme_image = Image.open(meme_path)
            st.image(meme_image, caption="Generated Meme", use_container_width=True)
        except Exception as e:
            st.error(f"Error displaying meme: {str(e)}")
