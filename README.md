# Banking Chatbot

A modern, accessible banking chatbot web application with advanced voice navigation and support for users with disabilities.

## Features
- **Voice Navigation**: Navigate the app, perform actions, and interact with the chatbot using voice commands (supports English and Hindi).
- **Accessibility**: Designed for users with disabilities, including screen reader support and accessible UI.
- **Profile Management**: Edit your name, email, contact, disability info, and manage personal tasks.
- **Task Management**: Add and remove tasks via UI or voice commands.
- **Text-to-Speech**: Chatbot responses are read aloud in the appropriate language.
- **Multi-page Navigation**: Voice commands work across Home, Chatbot, Tutorial, and Profile pages.
- **Modern UI**: Clean, responsive, and visually appealing interface.

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js (for frontend if using Next.js)
- (Optional) Virtual environment for Python

### Backend Setup
1. Navigate to the `backend` directory:
   ```sh
   cd backend
   ```
2. Install Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Run the Flask server:
   ```sh
   python app.py
   ```

### Frontend Setup (if using Next.js)
1. Navigate to the root directory:
   ```sh
   cd ..
   ```
2. Install Node.js dependencies:
   ```sh
   npm install
   ```
3. Start the Next.js development server:
   ```sh
   npm run dev
   ```

## Usage
- Access the app at `http://localhost:5000` (Flask backend) or the appropriate frontend port.
- Use the microphone button or voice commands to interact with the chatbot and navigate pages.
- Edit your profile and manage tasks from the Profile page.

## Accessibility & Voice Navigation
- All major actions can be performed via voice (e.g., "go to homepage", "show my profile", "add task", "remove task").
- Chatbot supports both English and Hindi for input and output (including speech synthesis).
- UI is designed for high contrast and screen reader compatibility.

## Project Structure
```
banking-chatbot/
  backend/
    app.py
    requirements.txt
    static/
    templates/
  src/
    ... (frontend code)
  README.md
  package.json
  ...
```

## License
This project is for educational/demo purposes. Please contact the author for licensing details.

---
Feel free to contribute or suggest improvements! 