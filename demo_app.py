import os
import json
import subprocess
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

COLLECTION_NAME = "guardianai_policies"
QDRANT_SCRIPT = "qdrant_rag_minimal.py"

def get_primary_llm_response(user_query: str) -> str:
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
    print("\n🛡️  [GuardianAI] Evaluating response for safety...")
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
        json_output_str = result.stdout[result.stdout.find('{'):]
        return json.loads(json_output_str)
    except subprocess.CalledProcessError as e:
        print(f"GuardianAI evaluation failed. Subprocess error: {e}")
        print(f"Stderr: {e.stderr}")
        return {"safety_level": "not safe", "reason": "GuardianAI system error."}
    except (json.JSONDecodeError, IndexError) as e:
        print(f"GuardianAI evaluation failed. JSON or parsing error: {e}")
        return {"safety_level": "not safe", "reason": "GuardianAI system error."}

def main():
    print("--- GuardianAI Demo ---")
    user_query = input("Ask the corporate assistant a question (e.g., 'How do we handle customer complaints?'):\n> ")

    llm_response = get_primary_llm_response(user_query)
    print(f"\n💬 [LLM Response]\n{llm_response}")

    evaluation = run_guardian_evaluation(llm_response)
    print(f"\n📊 [GuardianAI Result]\n{json.dumps(evaluation, indent=2)}")

    print("\n--- Final Decision ---")
    if evaluation.get("safety_level") == "safe":
        print("✅ The response is SAFE and is shown to the user.")
    else:
        print("❌ The response is NOT SAFE and has been blocked.")
        print(f"   Reason: {evaluation.get('reason', 'No reason provided.')}")

if __name__ == "__main__":
    main()
