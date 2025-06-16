from openai import OpenAI
import os

api_key = os.getenv("OPENAI_API_KEY")  # Ensure the API key is set
client = OpenAI(api_key=api_key)

try:
    models = client.models.list()
    print("✅ Available models:")
    for model in models:
        print(model.id)
except Exception as e:
    print(f"❌ Error fetching models: {e}")
