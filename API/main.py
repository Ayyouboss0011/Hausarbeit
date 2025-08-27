import os
import json
import subprocess
import uuid
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
COLLECTION_NAME = "guardianai_policies"
QDRANT_SCRIPT = "../qdrant_rag_minimal.py"
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf'}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_primary_llm_response(user_query: str) -> str:
    """
    Simulates a call to the primary, powerful LLM that the employees use.
    """
    print(f"🤖 [Primary LLM] Answering question: '{user_query}'")
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        resp = client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {"role": "system", "content": "You are a helpful assistant in a corporate environment."},
                {"role": "user", "content": user_query},
            ],
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling primary LLM: {e}")
        return "I am unable to answer this question at the moment."

def run_guardian_evaluation(text_to_evaluate: str) -> dict:
    """
    Runs the GuardianAI evaluation pipeline as a subprocess.
    """
    print("\n🛡️  [GuardianAI] Evaluating response for safety...")
    # Note: Adjust the path to QDRANT_SCRIPT if main.py is run from a different directory
    # Assuming it's run from the root directory for now.
    command = [
        "python",
        QDRANT_SCRIPT,
        "evaluate",
        "--collection",
        COLLECTION_NAME,
        "--text",
        text_to_evaluate,
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        # Find the JSON output block in the stdout
        json_output_str = result.stdout[result.stdout.find('{'):]
        return json.loads(json_output_str)
    except (subprocess.CalledProcessError, json.JSONDecodeError, IndexError) as e:
        print(f"GuardianAI evaluation failed: {e}")
        # Fail-safe: if GuardianAI fails, we assume the content is not safe.
        return {"safety_level": "not safe", "reason": "GuardianAI system error."}

@app.route('/upload-policy', methods=['POST'])
def upload_policy():
    """
    Endpoint to upload a policy document and add it to the Qdrant collection.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Extract metadata from the form
        policy_name = request.form.get('name', 'Unnamed Policy')
        description = request.form.get('description', '')
        keywords = request.form.get('keywords', '')
        severity = request.form.get('severity', 'medium')
        
        # Generate a unique ID for the policy
        policy_id = str(uuid.uuid4())

        # Here you would call the script to process and embed the document
        # For now, we'll just simulate it
        print(f"Embedding document: {filepath} with ID: {policy_id}")
        
        # This is where you would call the qdrant script
        command = [
            "python",
            QDRANT_SCRIPT,
            "add-document",
            "--collection",
            COLLECTION_NAME,
            "--filepath",
            filepath,
            "--metadata",
            json.dumps({"name": policy_name, "description": description, "keywords": keywords, "severity": severity, "id": policy_id})
        ]
        subprocess.run(command, check=True)

        return jsonify({"message": "Policy uploaded successfully", "id": policy_id}), 200

    return jsonify({"error": "File type not allowed"}), 400

@app.route('/delete-policy/<policy_id>', methods=['DELETE'])
def delete_policy(policy_id):
    """
    Endpoint to delete a policy's documents from the Qdrant collection.
    """
    print(f"Deleting document with ID: {policy_id}")
    
    command = [
        "python",
        QDRANT_SCRIPT,
        "delete-document",
        "--collection",
        COLLECTION_NAME,
        "--doc_id",
        policy_id
    ]
    
    try:
        subprocess.run(command, check=True)
        return jsonify({"message": "Policy deleted successfully from Qdrant"}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to delete policy from Qdrant: {e}"}), 500

@app.route('/prompt-testing', methods=['POST'])
def prompt_testing():
    """
    Endpoint to test a prompt, get an LLM response, and evaluate its safety.
    """
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({"error": "Prompt not provided"}), 400

    user_prompt = data['prompt']

    # 1. Get the initial response from the primary LLM
    llm_response = get_primary_llm_response(user_prompt)

    # 2. Evaluate the response with GuardianAI
    evaluation = run_guardian_evaluation(llm_response)

    # 3. Prepare the response
    response_data = {
        "llm_response": llm_response,
        "guardian_evaluation": evaluation
    }

    return jsonify(response_data)

if __name__ == '__main__':
    # Note: For development, you can run this script directly.
    # For production, use a proper WSGI server like Gunicorn.
    app.run(debug=True, port=8000)
