from ai_service.groq_service import generate_explanation

async def get_explanation(media_type: str, ai_result: dict) -> str:
    return await generate_explanation(media_type, ai_result)