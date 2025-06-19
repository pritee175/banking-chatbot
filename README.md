# Banking Chatbot

A modern banking chatbot application with biometric authentication and AI-powered assistance.

## Features

- 🤖 AI-powered banking assistant
- 🔐 Multiple authentication methods:
  - Traditional email/password
  - Voice recognition
  - Face recognition
  - Fingerprint authentication
- 🌐 Multi-language support
- ♿ Accessibility features
- 💬 Real-time chat interface

## Tech Stack

- Frontend: Next.js
- Backend: Flask (Python)
- AI: GitHub Inference API
- Authentication: Custom biometric system

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/banking-chatbot.git
cd banking-chatbot
```

2. Set up the backend:
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Set environment variables
export GITHUB_TOKEN="your_github_token"  # On Windows: $env:GITHUB_TOKEN="your_github_token"
```

3. Set up the frontend:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

4. Access the application:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api

## Environment Variables

- `GITHUB_TOKEN`: Your GitHub token for AI inference
- `GEMINI_API_KEY`: Your Gemini API key (optional)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 