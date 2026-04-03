from dotenv import load_dotenv
load_dotenv()
import os
from groq import Groq
from ai_service.prompts import build_prompt

_client = None

def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    return _client


async def generate_explanation(media_type: str, ai_result: dict) -> str:
    prompt = build_prompt(media_type, ai_result)

    try:
        completion = get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=180,
            temperature=0.4,
        )
        return completion.choices[0].message.content.strip()

    except Exception as e:
        print(f"[groq] API error: {e}")
        pct = f"{ai_result.get('confidence', 0) * 100:.1f}"
        return f"The media was classified as {ai_result.get('label', 'unknown')} with {pct}% confidence."