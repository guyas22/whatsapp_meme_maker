from backend.local_ingestion import main as process_chat
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from backend.meme_parser import MemeOutputParser
from backend.meme_generator import MemeGenerator
import os

# Constants
MEME_TEMPLATE_PATH = "utils/9au02y.jpg"  # Default meme template
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

class ChatFlowHandler:
    def __init__(self):
        self.vector_store = None
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.llm = ChatOpenAI(
            temperature=0.1,
            model="gpt-4o-mini",
            presence_penalty=0.0,
            frequency_penalty=0.0,
            response_format={"type": "json_object"}
        )
    
    def process_uploaded_chat(self, chat_file_path: str) -> bool:
        """
        Process an uploaded chat file and create FAISS index
        Returns True if successful, False otherwise
        """
        try:
            # Save the chat file path to environment
            os.environ["CHAT_FILE_PATH"] = chat_file_path
            
            # Process the chat file
            process_chat()
            
            # Load the created vector store
            self.load_vector_store()
            
            return True
        except Exception as e:
            print(f"Error processing chat: {str(e)}")
            return False
    
    def load_vector_store(self) -> bool:
        """
        Load the FAISS vector store from disk
        Returns True if successful, False otherwise
        """
        try:
            if os.path.exists("backend/vector_store"):
                self.vector_store = FAISS.load_local(
                    "backend/vector_store",
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                return True
            return False
        except Exception as e:
            print(f"Error loading vector store: {str(e)}")
            return False
    
    def search_similar_conversations(self, query: str, k: int = 5):
        """
        Search for similar conversations in the vector store
        """
        if not self.vector_store:
            if not self.load_vector_store():
                return []
        
        try:
            results = self.vector_store.similarity_search_with_score(
                query,
                k=k
            )
            return [(doc.page_content, doc.metadata, score) for doc, score in results]
        except Exception as e:
            print(f"Error searching conversations: {str(e)}")
            return []
            
    def create_meme_chain(self):
        """
        Creates a chain for generating memes using the local FAISS store
        """
        if not self.vector_store:
            if not self.load_vector_store():
                raise Exception("Vector store not loaded")
        
        retriever = self.vector_store.as_retriever(
            search_kwargs={"k": 5}
        )
        
        chain = (
            {
                "context": retriever,
                "question": RunnablePassthrough()
            }
            | prompt
            | self.llm
            | MemeOutputParser()
        )
        
        return chain
    
    def get_context_for_query(self, query: str, k: int = 5):
        """Get relevant context and metadata for a query"""
        if not self.vector_store:
            if not self.load_vector_store():
                return []
        
        results = self.vector_store.similarity_search_with_score(
            query,
            k=k
        )
        return [(doc.page_content, doc.metadata) for doc, score in results]
    
    def generate_meme(self, query: str) -> dict:
        """
        Generate a meme based on the query using the chat context
        
        Args:
            query (str): The query/prompt for meme generation
            
        Returns:
            dict: Contains the query, meme text, path to generated meme, and context chunks
        """
        try:
            # First get the context that will be used
            context_chunks = self.get_context_for_query(query)
            
            # Generate the meme
            chain = self.create_meme_chain()
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
            
            return {
                "query": query,
                "answer": response,
                "meme_path": meme_path,
                "context_chunks": context_chunks  # Include both content and metadata
            }
        except Exception as e:
            print(f"Error generating meme: {str(e)}")
            return {
                "query": query,
                "error": str(e)
            } 