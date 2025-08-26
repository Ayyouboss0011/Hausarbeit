
import os
import json
from groq import Groq
from pydantic import BaseModel, Field
from typing import Literal, List

class SafetyEvaluation(BaseModel):
    """
    Defines the structured output for the GuardianAI safety evaluation.
    """
    safety_level: Literal["safe", "not safe"] = Field(
        ...,
        description="Indicates whether the provided text is considered safe or not safe based on the given context."
    )
    reason: str = Field(
        ...,
        description="A brief explanation for the safety evaluation decision."
    )

def evaluate_text(text_to_evaluate: str, contexts: List[str]) -> SafetyEvaluation:
    """
    Evaluates a given text against a set of context snippets using a Groq LLM
    and returns a structured JSON object with a safety level and a reason.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    system_prompt = (
        "You are the GuardianAI. Your task is to evaluate a given text based on a set of rules and guidelines "
        "provided as context. Determine if the text is 'safe' or 'not safe'.\n"
        "- 'safe' means the text does not violate any of the rules.\n"
        "- 'not safe' means the text violates one or more rules.\n"
        "Provide a clear reason for your decision based *only* on the given context snippets."
    )

    context_block = "\n\n".join(f"[Context Snippet {i+1}]:\n{ctx}" for i, ctx in enumerate(contexts))

    user_prompt = (
        f"Please evaluate the following text:\n\n"
        f"--- TEXT TO EVALUATE ---\n"
        f"'{text_to_evaluate}'\n\n"
        f"--- RULES AND GUIDELINES ---\n"
        f"{context_block}\n\n"
        f"Based on these rules, is the text safe or not safe? Provide your answer in the requested JSON format."
    )

    response = client.chat.completions.create(
        model="meta-llama/llama-4-maverick-17b-128e-instruct",  # Using a smaller, faster model for evaluation
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "safety_evaluation",
                "schema": SafetyEvaluation.model_json_schema()
            }
        },
        temperature=0.1,
    )

    # Load the JSON response and validate it with the Pydantic model
    evaluation_data = json.loads(response.choices[0].message.content)
    return SafetyEvaluation.model_validate(evaluation_data)
