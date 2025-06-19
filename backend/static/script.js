console.log("script.js loaded and executing...");

let recognition; // Declare globally for continuous use
let isVoiceNavigationEnabled = false; // Manages the continuous voice navigation feature

// Add a new variable to track if the "Speak" button has initiated recognition
let isSpeakButtonActive = false;

// New flag to indicate if the bot is currently speaking
let isBotSpeaking = false;

// Variable to hold the timeout ID for recognition restart
let recognitionRestartTimeoutId = null;

let chatFontSize = 16; // Default font size in px

function sendMessage(message) {
    let userInput = message || document.getElementById("user-input").value;
    if (!userInput) return;

    let chatBox = document.getElementById("chat-box");
    // Add user message with class
    const userMsgElem = document.createElement('p');
    userMsgElem.className = 'user-message';
    userMsgElem.innerHTML = `<strong>You:</strong> ${userInput}`;
    userMsgElem.style.fontSize = chatFontSize + 'px'; // Use dynamic font size
    chatBox.appendChild(userMsgElem);

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput })
    })
    .then(response => response.json())
    .then(data => {
        // Add bot message with class
        const botMsgElem = document.createElement('p');
        botMsgElem.className = 'bot-message';
        botMsgElem.innerHTML = `<strong>Bot:</strong> ${data.response}`;
        botMsgElem.style.fontSize = chatFontSize + 'px'; // Use dynamic font size
        chatBox.appendChild(botMsgElem);
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => {
        console.error('Error sending message:', error);
        const botMsgElem = document.createElement('p');
        botMsgElem.className = 'bot-message';
        botMsgElem.innerHTML = `<strong>Bot (Error):</strong> An error occurred while sending your message.`;
        botMsgElem.style.fontSize = chatFontSize + 'px';
        chatBox.appendChild(botMsgElem);
    });

    if (!message) { // Only clear if not sent via voice auto-send
        document.getElementById("user-input").value = "";
    }
}

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    isBotSpeaking = true; // Set flag to true when bot starts speaking

    // Clear any pending recognition restarts before speaking
    if (recognitionRestartTimeoutId) {
        clearTimeout(recognitionRestartTimeoutId);
        recognitionRestartTimeoutId = null;
    }

    if (recognition && recognition.recognizing) {
        recognition.stop(); // Temporarily stop recognition while speaking
        console.log("Recognition paused for speech output.");
    }

    utterance.onend = () => {
        console.log("Speech output finished.");
        isBotSpeaking = false; // Reset flag when bot finishes speaking

        // If continuous voice navigation is enabled, restart recognition after a short delay
        // This is the SOLE place where continuous recognition should restart after bot speech
        if (isVoiceNavigationEnabled) {
            recognitionRestartTimeoutId = setTimeout(() => {
                if (recognition && !recognition.recognizing) { // Check if recognition is truly not active
                    recognition.start();
                    console.log("Continuous recognition resumed after bot speech.");
                } else {
                    console.log("Not restarting continuous recognition after bot speech (already active).");
                }
                recognitionRestartTimeoutId = null;
            }, 500); // Increased delay for more robustness and to ensure onend has fired
        }
    };

    window.speechSynthesis.speak(utterance);
}

// Function to toggle continuous voice navigation
function toggleVoiceNavigation() {
    const voiceNavigationToggle = document.getElementById('voiceNavigationToggle');
    isVoiceNavigationEnabled = voiceNavigationToggle.checked;

    if (isVoiceNavigationEnabled) {
        // Stop any existing recognition before starting a new one
        if (recognition) {
            recognition.stop();
        }
        
        // Start continuous recognition for voice navigation
        startVoiceRecognition(null, true); // Pass null for speakButton as it's not directly tied to the button
        // Delay the initial prompt to avoid immediate start-stop conflict
        setTimeout(() => {
            speakText("Voice navigation enabled. Say things like: go to home, open chat, enable high contrast.");
        }, 500); // Short delay
    } else {
        if (recognition) {
            recognition.stop(); // Stop microphone
            // Immediately stop any ongoing speech from the bot
            window.speechSynthesis.cancel();
        }
        console.log("Voice navigation disabled.");
    }
}

// Modified to accept speakButton and a flag for continuous recognition
function startVoiceRecognition(speakButton, isContinuous = false) {
    console.log("startVoiceRecognition() called. isContinuous:", isContinuous);

    // Prevent starting if recognition is already active and not explicitly a speak button action needing restart
    if (recognition && recognition.recognizing && (isContinuous || !speakButton)) {
        console.log("Recognition already active. Not starting new instance.");
        return; // Do not proceed if already recognizing, especially for continuous mode
    }

    if (!('webkitSpeechRecognition' in window)) {
        alert("Sorry, your browser doesn't support speech recognition. Please use Google Chrome.");
        console.error("Browser does not support webkitSpeechRecognition.");
        return;
    }

    console.log("webkitSpeechRecognition supported by browser.");

    // If a recognition instance is already active, stop it before starting a new one.
    // This prevents multiple recognition sessions from running simultaneously.
    if (recognition && recognition.recognizing) {
        console.log("Stopping active recognition instance before starting new one.");
        recognition.stop();
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = isContinuous; // Set continuous based on parameter
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const userInputElement = document.getElementById("user-input");

    recognition.onstart = function() {
        console.log("Voice recognition started...");
        if (speakButton) { // Only update button if it's the trigger
            speakButton.textContent = '🔴 Recording...';
            speakButton.classList.add('recording');
            isSpeakButtonActive = true; // Indicate that speak button started recognition
        } else {
            // If continuous voice navigation started it, ensure UI reflects it if needed
            console.log("Continuous voice recognition started.");
        }
    };

    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // ONLY update the input box for the manual 'Speak' button (isContinuous is false)
        if (!isContinuous) {
            userInputElement.value = finalTranscript || interimTranscript;
        }

        if (finalTranscript) {
            console.log('Voice input recognized (final):', finalTranscript);

            // If speak button initiated this, send the message to the chatbot
            if (speakButton && isSpeakButtonActive) {
                sendMessage(finalTranscript); // Send to chatbot
                // Optionally, stop recognition after sending if it's a one-off speak button use
                if (!isContinuous) {
                    recognition.stop();
                }
            } else if (isContinuous) {
                // For continuous voice navigation, process as a command (navigation/accessibility)
                // Do NOT update userInputElement or send to main chatbot
                if (finalTranscript.trim() !== '') {
                    handleVoiceNavigationCommand(finalTranscript.toLowerCase().trim());
                } else {
                    console.log("Final transcript is empty for continuous voice navigation. Not processing.");
                }
            }
        }
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        // Only speak error for manual 'Speak' button, NOT for continuous voice navigation
        if (speakButton && isSpeakButtonActive) { // Reset button if it was active
            speakButton.textContent = '🎙️ Speak';
            speakButton.classList.remove('recording');
            isSpeakButtonActive = false;
            // For single-shot speak button, it's okay to give feedback immediately
            speakText("Sorry, I didn't catch that. Please try again.");
        } else if (isContinuous) {
            console.log("Continuous voice navigation error. Attempting to restart...");
            if (recognition) { // Ensure recognition object exists
                recognition.stop(); // Stop recognition on error to prevent continuous errors
            }
            // Attempt to restart continuous recognition after a delay if still enabled
            if (isVoiceNavigationEnabled && event.error !== 'not-allowed') { // Don't restart if permission denied
                 recognitionRestartTimeoutId = setTimeout(() => {
                    if (recognition && !recognition.recognizing) {
                        recognition.start();
                        console.log("Continuous recognition restarted after error.");
                    }
                    recognitionRestartTimeoutId = null;
                }, 1000); // Longer delay after error
            }
        }
    };

    recognition.onend = function() {
        console.log("Voice recognition ended.");
        if (speakButton && isSpeakButtonActive) {
            speakButton.textContent = '🎙️ Speak';
            speakButton.classList.remove('recording');
            isSpeakButtonActive = false;
        }

        // For continuous voice navigation, restart recognition if it's still enabled
        // and the bot is not currently speaking (to avoid interrupting bot speech).
        // This handles cases where a voice command is processed without immediate bot speech.
        if (isContinuous && isVoiceNavigationEnabled && !isBotSpeaking) {
            console.log("Continuous recognition ended without bot speech. Restarting...");
            recognitionRestartTimeoutId = setTimeout(() => {
                if (recognition && !recognition.recognizing) {
                    recognition.start();
                    console.log("Continuous recognition resumed directly from onend.");
                } else {
                    console.log("Not restarting continuous recognition directly from onend (already active).");
                }
                recognitionRestartTimeoutId = null;
            }, 200); // Short delay before restarting
        } else if (!isContinuous) {
            console.log("Single recognition session ended (not continuous).");
        }
    };

    recognition.start();
}

function handleVoiceNavigationCommand(command) {
    console.log(`Handling voice navigation command: ${command}`);

    if (command.includes("go to home") || command.includes("home page")) {
        // Ensure voice navigation state is preserved
        localStorage.setItem('voiceNavigation', 'true');
        // Stop current recognition before navigation
        if (recognition) {
            recognition.stop();
        }
        window.location.href = '/home';
        speakText("Navigating to home page.");
    } else if (command.includes("open chat") || command.includes("go to chatbot")) {
        // Ensure voice navigation state is preserved
        localStorage.setItem('voiceNavigation', 'true');
        // Stop current recognition before navigation
        if (recognition) {
            recognition.stop();
        }
        window.location.href = '/chatbot';
        speakText("Opening chat.");
    } else if (command.includes("enable high contrast")) {
        const highContrastToggle = document.getElementById('highContrastToggle');
        if (highContrastToggle) {
            highContrastToggle.checked = true;
            toggleHighContrast();
            speakText("High contrast mode enabled.");
        }
    } else if (command.includes("disable high contrast")) {
        const highContrastToggle = document.getElementById('highContrastToggle');
        if (highContrastToggle) {
            highContrastToggle.checked = false;
            toggleHighContrast();
            speakText("High contrast mode disabled.");
        }
    } else if (command.includes("enable screen reader")) {
        const screenReaderToggle = document.getElementById('screenReaderToggle');
        if (screenReaderToggle) {
            screenReaderToggle.checked = true;
            toggleScreenReader();
            speakText("Screen reader optimization enabled.");
        }
    } else if (command.includes("disable screen reader")) {
        const screenReaderToggle = document.getElementById('screenReaderToggle');
        if (screenReaderToggle) {
            screenReaderToggle.checked = false;
            toggleScreenReader();
            speakText("Screen reader optimization disabled.");
        }
    } else if (command.includes("increase text size")) {
        adjustTextSize('increase');
        speakText("Increasing text size.");
    } else if (command.includes("decrease text size")) {
        adjustTextSize('decrease');
        speakText("Decreasing text size.");
    } else if (command.includes("focus input") || command.includes("type here")) {
        const userInput = document.getElementById("user-input");
        if (userInput && typeof userInput.focus === 'function') {
            userInput.focus();
            speakText("Input field focused.");
        }
    } else if (command.includes("go back")) {
        window.history.back();
        speakText("Going back.");
    } else {
        speakText("I didn't understand that navigation command.");
    }
}

// Existing toggleSpeak function
function toggleSpeak(speakButton) {
    if (recognition && recognition.recognizing) {
        recognition.stop();
        speakButton.textContent = '🎙️ Speak';
        speakButton.classList.remove('recording');
        isSpeakButtonActive = false;
    } else {
        startVoiceRecognition(speakButton, false); // Start as non-continuous for button
    }
}

// Event listener for the Speak button and accessibility settings
document.addEventListener('DOMContentLoaded', function() {
    const speakButton = document.getElementById('speak-button');
    if (speakButton) {
        speakButton.addEventListener('click', () => toggleSpeak(speakButton));
    }

    const translateButton = document.getElementById('translate-button');
    if (translateButton) {
        translateButton.addEventListener('click', translateChat);
    }

    const userInputField = document.getElementById('user-input');
    if (userInputField) {
        userInputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Accessibility modal elements
    const accessibilityIcon = document.querySelector('.navbar ul li a[onclick="openAccessibilitySettings()"]');
    if (accessibilityIcon) {
        accessibilityIcon.addEventListener('click', openAccessibilitySettings);
    }

    const closeButton = document.querySelector('.accessibility-modal .close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closeAccessibilitySettings);
    }

    const textSizeSlider = document.getElementById('textSizeSlider');
    const currentTextSizeSpan = document.getElementById('currentTextSize');
    if (textSizeSlider && currentTextSizeSpan) {
        textSizeSlider.addEventListener('input', (event) => {
            const size = event.target.value;
            if (document.body) {
                document.body.style.fontSize = `${size}px`;
            }
            currentTextSizeSpan.textContent = `Current: ${size}px`;
        });
        textSizeSlider.addEventListener('change', () => {
            localStorage.setItem('textSize', document.body.style.fontSize);
        });

        // Set initial slider position and display
        const initialSize = parseFloat(document.body.style.fontSize) || 16; // Default to 16px if not set
        textSizeSlider.value = initialSize;
        currentTextSizeSpan.textContent = `Current: ${initialSize}px`;
    }

    const highContrastToggle = document.getElementById('highContrastToggle');
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', () => {
            toggleHighContrast();
            localStorage.setItem('highContrast', highContrastToggle.checked);
        });
        const savedHighContrast = localStorage.getItem('highContrast');
        if (savedHighContrast !== null) {
            highContrastToggle.checked = (savedHighContrast === 'true');
            toggleHighContrast();
        }
    }

    const screenReaderToggle = document.getElementById('screenReaderToggle');
    if (screenReaderToggle) {
        screenReaderToggle.addEventListener('change', () => {
            toggleScreenReader();
            localStorage.setItem('screenReader', screenReaderToggle.checked);
        });
        const savedScreenReader = localStorage.getItem('screenReader');
        if (savedScreenReader !== null) {
            screenReaderToggle.checked = (savedScreenReader === 'true');
            toggleScreenReader();
        }
    }

    // Voice Navigation: Initialize state and set up toggle listener
    // Note: voiceNavigationToggle is declared and used here only once in DOMContentLoaded
    const voiceNavigationToggle = document.getElementById('voiceNavigationToggle');
    
    fetchVoiceState(); // Always fetch from backend and start recognition if enabled
    document.querySelectorAll('.voice-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            updateVoiceState(e.target.checked);
            if (!e.target.checked) {
                sessionStorage.removeItem('voiceNavigationPersistent');
            }
        });
    });

    const increaseTextBtn = document.getElementById('increaseText');
    const decreaseTextBtn = document.getElementById('decreaseText');
    if (increaseTextBtn && decreaseTextBtn) {
        increaseTextBtn.addEventListener('click', function() {
            chatFontSize = Math.min(chatFontSize + 2, 24);
            updateChatFontSize();
        });
        decreaseTextBtn.addEventListener('click', function() {
            chatFontSize = Math.max(chatFontSize - 2, 12);
            updateChatFontSize();
        });
    }

    // Auto-enable voice navigation if persistent flag is set
    if (sessionStorage.getItem('voiceNavigationPersistent') === 'true') {
        document.querySelectorAll('.voice-toggle').forEach(toggle => {
            toggle.checked = true;
        });
        updateVoiceState(true);
        setTimeout(() => {
            startVoiceRecognition(null, true);
        }, 300);
    }

    // Add profile icon to header if on home page
    const header = document.querySelector('header');
    if (header && !document.getElementById('profileBtn')) {
        const btn = document.createElement('button');
        btn.id = 'profileBtn';
        btn.title = 'Profile';
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.marginLeft = '16px';
        btn.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Profile" style="width:36px;height:36px;border-radius:50%;">';
        btn.onclick = () => { window.location.href = '/profile'; };
        header.appendChild(btn);
    }
});

function toggleHighContrast() {
    document.body.classList.toggle('high-contrast', document.getElementById('highContrastToggle').checked);
}

function toggleScreenReader() {
    document.body.classList.toggle('screen-reader-optimized', document.getElementById('screenReaderToggle').checked);
}

function adjustTextSize(action) {
    const currentSize = parseFloat(getComputedStyle(document.body).fontSize);
    let newSize = currentSize;

    if (action === 'increase') {
        newSize = Math.min(currentSize + 2, 24); // Max font size 24px
    } else if (action === 'decrease') {
        newSize = Math.max(currentSize - 2, 12); // Min font size 12px
    }

    if (document.body) {
        document.body.style.fontSize = `${newSize}px`;
    }
}

// Function for translation
function translateChat() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input').value;
    const translateLang = document.getElementById('translate-lang').value; // Get selected language

    // Check if there's content to translate
    let contentToTranslate = userInput.trim(); // Prioritize user input

    // If user input is empty, try to translate the last bot message
    if (!contentToTranslate && chatBox.lastElementChild) {
        const lastMessageText = chatBox.lastElementChild.textContent.trim();
        // Ensure it's a bot message to avoid translating user's previous input inadvertently
        if (lastMessageText.startsWith('Bot:')) {
            contentToTranslate = lastMessageText.replace(/^Bot:\s*/, '');
        }
    }

    if (!contentToTranslate) {
        alert("Nothing to translate! Please type a message or ensure there's a message in the chat.");
        return;
    }

    fetch('/translate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            text: contentToTranslate,
            target_lang: translateLang
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.translation) {
            // Display translated text directly in the chat box
            chatBox.innerHTML += `<p><strong>Translation (${translateLang}):</strong> ${data.translation}</p>`;
            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
        } else if (data.error) {
            alert("Translation Error: " + data.error);
        }
    })
    .catch(error => {
        console.error('Error during translation:', error);
        alert("An error occurred during translation. Please try again.");
    });
}

// Tutorial functions
function showTutorial() {
    window.location.href = '/tutorial'; // Redirect to tutorial page
}

function showChat() {
    // Redirect to the chatbot page instead of just showing/hiding elements on the current page
    window.location.href = '/chatbot';
}

function hideChat() {
    // This function is likely called from the chatbot page itself to return to the main page
    window.location.href = '/';
}

function setVoiceToggle(state) {
    document.querySelectorAll('.voice-toggle').forEach(toggle => {
        toggle.checked = state;
    });
    // Start or stop voice navigation based on state
    if (state) {
        startVoiceRecognition(null, true); // Start continuous recognition
    } else if (recognition) {
        recognition.stop();
    }
}

function fetchVoiceState() {
    fetch('/api/voice-navigation')
        .then(res => res.json())
        .then(data => setVoiceToggle(data.enabled));
}

function updateVoiceState(enabled) {
    fetch('/api/voice-navigation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({enabled})
    });
    setVoiceToggle(enabled);
}

function updateChatFontSize() {
    document.querySelectorAll('.user-message, .bot-message').forEach(elem => {
        elem.style.fontSize = chatFontSize + 'px';
    });
}

// Voice navigation: show my profile
if (window.location.pathname === '/home') {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = function(event) {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const command = event.results[i][0].transcript.trim().toLowerCase();
                    if (command.includes('show my profile')) {
                        window.location.href = '/profile';
                    }
                }
            }
        };
        recognition.onend = function() { recognition.start(); };
        recognition.start();
    }
}

