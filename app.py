from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from backend.chat_flow_handler import ChatFlowHandler
import os
import awsgi 

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
chat_handler = ChatFlowHandler()

@app.route('/api/ingest-chat', methods=['POST'])
def ingest_chat():
    """Endpoint to ingest a chat file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Save the uploaded file temporarily
    temp_path = 'temp_chat.txt'
    file.save(temp_path)
    
    # Process the chat file
    success = chat_handler.process_uploaded_chat(temp_path)
    
    # Clean up
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    if success:
        senders = chat_handler.get_senders()
        ## remove the last sender
        group_name = senders[-1]
        senders = senders[:-1]
        
        
        
        print(f"Senders: {senders}")
        return jsonify({
            'message': 'Chat processed successfully',
            'senders': senders,
            'group_name': group_name
        }), 200

    else:
        return jsonify({'error': 'Failed to process chat'}), 500

@app.route('/api/generate-meme', methods=['POST'])
def generate_meme():
    """Endpoint to generate a meme based on a query"""
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400
    
    query = data['query']
    result = chat_handler.generate_meme(query)
    
    if 'error' in result:
        return jsonify({'error': result['error']}), 500
    
    # Return both the meme image and context data
    if os.path.exists(result['meme_path']):
        # Read the image file
        with open(result['meme_path'], 'rb') as img_file:
            img_data = img_file.read()
        
        # Prepare the response data
        response_data = {
            'context_chunks': result['context_chunks'],
            'template_explanation': result['template_explanation'],
            'template_format': result['template_format'],
            'image_data': img_data.hex()  # Include image data in the JSON body
        }
        
        return jsonify(response_data)
    else:
        return jsonify({'error': 'Failed to generate meme'}), 500

# if __name__ == '__main__':
#     app.run(debug=True, port=5000) 

def handler(event, context):
    return awsgi.response(app, event, context)