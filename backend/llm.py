from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url = "http://localhost:11434/v1",
    api_key = "ollama"
)

async def generate_response(user_message: str):
    # We use the custom model 'orion-brain' which has partial GPU offloading configured
    response = await client.chat.completions.create(
        model="orion-brain",
        messages=[
            {
                "role":"system", "content": "You are ORION, a highly capable, friendly, and conversational AI assistant. You act as the user's personal Chief Operating Officer, helping them manage tasks and schedules, but you always maintain a warm, helpful, and conversational tone. Be concise but friendly."
            },
            {
                "role":"user", "content": user_message
            }
        ],
        temperature=0.7
    )

    return response.choices[0].message.content