import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS
from openai import OpenAI  # Import the OpenAI library
# import google.generativeai as genai # Comment out or remove Gemini import
import requests
import logging
# No longer importing Google Cloud speech/texttospeech as we're focusing on GitHub Inference API
# from google.cloud import speech
# from google.cloud import texttospeech
from werkzeug.security import generate_password_hash, check_password_hash

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = 'your-very-secret-key'  # Use a strong, random value in production!
CORS(app)

# Load GitHub Token from environment variable
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if not GITHUB_TOKEN:
    raise ValueError("⚠️ GitHub Token is missing! Set GITHUB_TOKEN as an environment variable.")

# Configure the OpenAI API client for GitHub Inference
client = OpenAI(
    base_url="https://models.github.ai/inference",
    api_key=GITHUB_TOKEN,
)

# In-memory user storage (replace with a database in production)
users = {}

@app.route('/')
def login_entry():
    return render_template('login.html')

@app.route('/home')
def home():
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if email in users:
            return jsonify({"error": "Email already registered"}), 400
            
        users[email] = {
            'password': generate_password_hash(password),
            'biometric_data': None
        }
        
        return jsonify({"message": "Signup successful"}), 200
        
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if email not in users or not check_password_hash(users[email]['password'], password):
            return jsonify({"error": "Invalid credentials"}), 401
            
        return jsonify({"message": "Login successful"}), 200
        
    return render_template('login.html')

@app.route('/contact', methods=['POST'])
def contact():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        message = data.get('message')
        
        # Here you would typically send an email or store the message
        # For now, we'll just log it
        logger.info(f"Contact form submission from {name} ({email}): {message}")
        
        return jsonify({"message": "Message received! We'll get back to you soon."}), 200
    except Exception as e:
        logger.error(f"Error processing contact form: {str(e)}")
        return jsonify({"error": "Failed to process your message"}), 500

@app.route('/tutorial')
def tutorial():
    return render_template('tutorial.html')

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Handles text-based chatbot queries."""
    user_message = request.json.get('message', '').strip()

    if not user_message:
        return jsonify({"response": "⚠️ I didn't receive a message! Please enter your query."})

    try:
        # Using OpenAI Chat Completion via GitHub Inference
        response = client.chat.completions.create(
            model="openai/gpt-4o",  # Correct model name for GitHub Inference
            messages=[
                {"role": "system", "content": "You are a professional and concise banking assistant."},
                {"role": "user", "content": user_message}
            ],
            temperature=1,
            max_tokens=4096,
            top_p=1
        )
        bot_response = response.choices[0].message.content.strip()

        # Improved response formatting
        formatted_response = (
            f"📌 **Your Query:** {user_message}\n\n"
            f"📝 **Response:**\n{bot_response}\n\n"
            "👉 Need more details? Just ask!"
        )
    except Exception as e:
        formatted_response = f"❌ An unexpected error occurred: {str(e)}. Please try again."

    return jsonify({"response": formatted_response})

@app.route('/translate', methods=['POST'])
def translate():
    """Handles text translation."""
    try:
        text = request.json.get('text')
        target_lang = request.json.get('target_lang')
        api_key = '051fa4d0ab92a6b2e006' # Keep this as is for now
        
        url = 'https://api.mymemory.translated.net/get'
        params = {
            'q': text,
            'langpair': f'en|{target_lang}',
            'key': api_key
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if response.status_code == 200 and data['responseStatus'] == 200:
            translated_text = data['responseData']['translatedText']
            return jsonify({'translation': translated_text})
        else:
            return jsonify({'error': '❌ Translation failed. Please try again.'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice-navigation', methods=['GET', 'POST'])
def voice_navigation():
    if request.method == 'POST':
        state = request.json.get('enabled', False)
        session['voice_navigation'] = state
        return jsonify({'enabled': state})
    else:
        return jsonify({'enabled': session.get('voice_navigation', False)})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='localhost') 