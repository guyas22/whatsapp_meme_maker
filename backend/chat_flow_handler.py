from local_ingestion import main as process_chat, extract_unique_senders
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from meme_parser import MemeOutputParser, MemeFormat
from meme_generator import MemeGenerator
from imgflip_api import ImgflipAPI
import json
import os
from typing import List

# Constants
OUTPUT_PATH = "output_meme.jpg"  # Where to save the generated meme

# Initialize components
meme_generator = MemeGenerator()
imgflip_api = ImgflipAPI()

# Define the template selection prompt
template_selection_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a meme template expert. Your job is to select the most appropriate meme template based on the given context and query.
            You will be provided with a list of available templates and their metadata, along with the chat context and user's query.

            Consider the following when selecting a template:
            1. The template should match the mood and intent of the query
            2. The template should be with format of top text and bottom text, dont choose templates that have complex format
            3. The template should have the right format for the intended joke
            4. Consider how the template is typically used in meme culture
            5. Consider the chat context and the user's query
            Your response should be a JSON object with these fields:
            - template_id: string ID of the selected template
            - explanation: brief explanation of why this template was chosen and how it should be used
            - typical_format: brief description of how text is typically formatted for this template

            Example response:
            {{"template_id": "181913649", "explanation": "Selected the Drake template because the query suggests a comparison or preference scenario", "typical_format": "Top text: something, Bottom text: the punchline"}}"""
                ),
                ("human", "Available templates: {templates}"),
                ("human", "Chat context: {context}"),
                ("human", "Query: {query}")
            ])

# Define the meme text generation prompt
meme_text_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a skilled meme creator specializing in generating memes from WhatsApp group chat context. Your job is to create the perfect text for the selected meme template, using the chat context and following the template's typical format.

            Template Information:
            {template_info}

            Guidelines:

            2. Use the chat context to create relevant humor:
            - Reference inside jokes and recurring themes
            - Use group-specific slang and expressions
            - Reference memorable moments or conversations
            3. Write in the language of the query
            4. Keep the text short, punchy, and funny
            5. Use irony, sarcasm, or local Israeli humor when appropriate

            Your response MUST be a valid JSON object with exactly these two fields:
            - top_text: string in Hebrew for the top text of the meme
            - bottom_text: string in Hebrew for the bottom text of the meme
            ** includ dark and edgy humor, improvise while reflecting the group's tone and personality.**
            Example response:
            {{
                "top_text": "הטקסט העליון של המם",
                "bottom_text": "הטקסט התחתון של המם"
            }}"""
                ),
                ("human", "Context: {context}"),
                ("human", "Query: {query}")
            ])

class ChatFlowHandler:
    def __init__(self):
        self.vector_store = None
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.llm = ChatOpenAI(
            temperature=0.4,
            model="gpt-4o-mini",
            presence_penalty=0.0,
            frequency_penalty=0.0,
            response_format={"type": "json_object"}
        )
        self.unique_senders = []
    
    def process_uploaded_chat(self, chat_path: str) -> bool:
        """Process an uploaded chat file"""
        try:
            # Set the chat file path in environment
            os.environ["CHAT_FILE_PATH"] = chat_path
            
            # Process the chat file
            self.unique_senders = process_chat()
            
            # Load the vector store
            return self.load_vector_store()
        except Exception as e:
            print(f"Error processing chat: {str(e)}")
            return False
    
    def load_vector_store(self) -> bool:
        """Load the FAISS vector store from disk"""
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
    
    def get_context_for_query(self, query: str, k: int = 2) -> str:
        """Get relevant context and metadata for a query"""
        if not self.vector_store:
            if not self.load_vector_store():
                return []
        
        results = self.vector_store.similarity_search_with_score(
            query,
            k=k
        )
        return [(doc.page_content, doc.metadata) for doc, score in results]
    
    def select_template(self, query: str, context: str, templates: list) -> dict:
        """Select appropriate meme template"""
        chain = template_selection_prompt | self.llm
        response = chain.invoke({
            "templates": templates,
            "context": context,
            "query": query
        })
        return json.loads(response.content)
    
    def generate_meme_text(self, query: str, context: str, template_info: str) -> MemeFormat:
        """Generate meme text based on template and context"""
        chain = meme_text_prompt | self.llm | MemeOutputParser()
        response = chain.invoke({
            "query": query,
            "context": context,
            "template_info": template_info
        })
        return response
    
    def generate_meme(self, query: str) -> dict:
        """Generate a meme based on the query using the chat context"""
        try:
            # Get relevant context
            context = self.get_context_for_query(query)
            
            # Get available templates
            templates = imgflip_api.get_meme_templates()
            
            # Select template
            template_data = self.select_template(query, context, templates)
            selected_template = next(
                (t for t in templates if t["id"] == template_data["template_id"]),
                templates[0]
            )
            
            # Generate meme text
            template_info = {
                "name": selected_template["name"],
                "explanation": template_data["explanation"],
                "typical_format": template_data["typical_format"]
            }
            template_info_str = f"Template name: {template_info['name']}\nTemplate explanation: {template_info['explanation']}\nTemplate typical format: {template_info['typical_format']}"
            print(f"Template info: {template_info_str}")
            meme_text = self.generate_meme_text(query, context, template_info_str)
            
            # Generate meme image
            template_path = imgflip_api.download_template(selected_template["url"], "temp_template.jpg")
            meme_path = meme_generator.create_meme(
                template_path,
                meme_text.top_text,
                meme_text.bottom_text,
                OUTPUT_PATH
            )
            
            # Clean up
            if os.path.exists(template_path):
                os.remove(template_path)
            
            return {
                "query": query,
                "template": selected_template,
                "template_explanation": template_data["explanation"],
                "template_format": template_data["typical_format"],
                "meme_text": meme_text,
                "meme_path": meme_path,
                "context_chunks": context
            }
        except Exception as e:
            print(f"Error generating meme: {str(e)}")
            return {
                "query": query,
                "error": str(e)
            } 
    
    def get_senders(self) -> List[str]:
        """Return the list of unique senders in the chat"""
        return self.unique_senders 