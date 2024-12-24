from typing import Any, Dict, List
import os
from dotenv import load_dotenv

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from backend.meme_parser import MemeOutputParser
from backend.meme_generator import MemeGenerator
import json

# Load environment variables
load_dotenv()

# Constants
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "whatsapp-memes")
MEME_TEMPLATE_PATH = "backend/9au02y.jpg"  # Default meme template
OUTPUT_PATH = "output_meme.jpg"  # Where to save the generated meme

# Initialize meme generator
meme_generator = MemeGenerator()

# Define the prompt template
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
        You are a skilled meme creator specializing in generating memes from WhatsApp group chat context. Your job is to take the given chat context and question, and transform them into a funny meme **in Hebrew** that references the group's inside jokes and conversations.

        Guidelines:
        1. Analyze the chat context carefully to identify:
           - Inside jokes and recurring themes
           - Group-specific slang and expressions
           - Memorable moments or conversations
           - Common interactions between group members
        2. Use these elements to create a meme that will resonate with the group
        3. You should use RTL text - right to left text
        3. Keep the text short, punchy, and funny
        4. Prioritize references that appeared multiple times in the chat
        5. Consider the timing and relevance of the jokes (recent ones may be more impactful)
        6. You can use irony, sarcasm, or local Israeli humor

        Your response MUST be a valid JSON object with exactly these two fields:
        - top_text: string in Hebrew for the top text of the meme
        - bottom_text: string in Hebrew for the bottom text of the meme

        General example of a message from the context:
        [YYYY-MM-DD HH:MM:SS] [name]: [message]
        Example response:
        {{
            "top_text": "הטקסט העליון של המם",
            "bottom_text": "הטקסט התחתון של המם"
        }}

        DO NOT include any other text, markdown formatting, or code blocks in your response.
        """
    ),
    ("human", "Context: {context}"),
    ("human", "Question: {question}")
])

def create_qa_chain():
    """
    Creates a question-answering chain using Pinecone for vector storage and OpenAI for embeddings and chat.
    
    Returns:
        chain: A LangChain chain for question answering
    """
    # Initialize embeddings and vector store
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings
    )
    
    # Initialize retriever with search parameters
    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 5  # Number of documents to retrieve
        }
    )
    
    # Initialize the language model with higher temperature for creativity
    llm = ChatOpenAI(
        temperature=0.1,  # Higher temperature for more creative memes
        model="gpt-4o-mini",  
        presence_penalty=0.0,
        frequency_penalty=0.0,
        response_format={"type": "json_object"}  # Enforce JSON response format
    )
    
    # Create the chain with meme output parser
    chain = (
        {
            "context": retriever,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | MemeOutputParser()
    )
    
    return chain

def query_chain(query: str, chat_history: List[Dict[str, Any]] = None) -> Dict[str, Dict]:
    """
    Query the QA chain with a question and get a meme response.
    
    Args:
        query (str): The question to ask
        chat_history (List[Dict[str, Any]], optional): Chat history for context
        
    Returns:
        Dict[str, Any]: The response containing the meme format and generated image path
    """
    chain = create_qa_chain()
    print("Sending query:", query)
    response = chain.invoke(query)
    print("Raw response from LLM:", response)
    
    # Generate the meme image
    meme_path = meme_generator.create_meme(
        MEME_TEMPLATE_PATH,
        response.top_text,
        response.bottom_text,
        OUTPUT_PATH
    )
    
    # Return both the text response and the generated meme path
    return {
        "query": query,
        "answer": response,
        "meme_path": meme_path
    }

if __name__ == "__main__":
    query = "תעשה ממ על זה שניצן גרוש"
    result = query_chain(query)
    print("##########################")
    print(f"Top text: {result['answer'].top_text}")
    print(f"Bottom text: {result['answer'].bottom_text}")
    print(f"Meme saved to: {result['meme_path']}")
    
