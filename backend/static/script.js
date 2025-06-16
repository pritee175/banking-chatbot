console.log("script.js loaded and executing...");

let recognition; // Declare globally for continuous use
let isVoiceCommandsEnabled = false; // Manages the continuous voice command feature

// Add a new variable to track if the "Speak" button has initiated recognition
let isSpeakButtonActive = false;

// New flag to indicate if the bot is currently speaking
let isBotSpeaking = false;

// Variable to hold the timeout ID for recognition restart
let recognitionRestartTimeoutId = null;

function sendMessage(message) {
    let userInput = message || document.getElementById("user-input").value;
    if (!userInput) return;

    let chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput })
    })
    .then(response => response.json())
    .then(data => {
        chatBox.innerHTML += `<p><strong>Bot:</strong> ${data.response}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => {
        console.error('Error sending message:', error);
        chatBox.innerHTML += `<p><strong>Bot (Error):</strong> An error occurred while sending your message.</p>`;
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

        // If continuous voice commands are enabled, restart recognition after a short delay
        // This is the SOLE place where continuous recognition should restart after bot speech
        if (isVoiceCommandsEnabled) {
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

// Function to toggle continuous voice commands
function toggleVoiceCommands() {
    const voiceCommandsToggle = document.getElementById('voiceCommandsToggle');
    isVoiceCommandsEnabled = voiceCommandsToggle.checked;

    if (isVoiceCommandsEnabled) {
        // Start continuous recognition for voice commands
        startVoiceRecognition(null, true); // Pass null for speakButton as it's not directly tied to the button
        // Delay the initial prompt to avoid immediate start-stop conflict
        setTimeout(() => {
            speakText("Voice commands enabled. Give voice command to navigate screen.");
        }, 500); // Short delay
    } else {
        if (recognition) {
            recognition.stop(); // Stop microphone
            // Immediately stop any ongoing speech from the bot
            window.speechSynthesis.cancel();
        }
        console.log("Voice commands disabled.");
        // Removed: speakText("Voice commands disabled."); to prevent further speech
    }
}

// Add event listener for the voice commands toggle
document.addEventListener('DOMContentLoaded', () => {
    const voiceCommandsToggle = document.getElementById('voiceCommandsToggle');
    if (voiceCommandsToggle) {
        voiceCommandsToggle.addEventListener('change', toggleVoiceCommands);
        // Initial load check for voice commands
        isVoiceCommandsEnabled = localStorage.getItem('voiceCommands') === 'true';
        voiceCommandsToggle.checked = isVoiceCommandsEnabled;
        if (isVoiceCommandsEnabled) {
            setTimeout(() => {
                startVoiceRecognition(null, true); // Start continuous recognition on load if enabled
                console.log("Voice commands enabled from localStorage.");
            }, 500); // Small delay to ensure everything is ready
        }
    }
});

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
            // If continuous voice commands started it, ensure UI reflects it if needed
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
                // For continuous voice commands, process as a command (navigation/accessibility)
                // Do NOT update userInputElement or send to main chatbot
                if (finalTranscript.trim() !== '') {
                    fetch('/voice_chat', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({message: finalTranscript.toLowerCase().trim()})
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Backend response for voice command:", data);
                        if (data.response) {
                            speakText(data.response); // Speak ONLY if backend provides a specific confirmation/response
                        }
                        if (data.command) {
                            handleVoiceCommand(data.command, data.action);
                        }
                        // DO NOT call sendMessage() here for continuous voice commands
                    })
                    .catch(error => {
                        console.error('Error sending voice command to backend:', error);
                        // For continuous voice commands, remain silent on backend errors to avoid loops
                        console.log("Voice command backend error. Remaining silent.");
                    });
                } else {
                    console.log("Final transcript is empty for continuous voice commands. Not sending to backend and remaining silent.");
                    // Remain silent for empty input in continuous mode
                }
            }
        }
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        // Only speak error for manual 'Speak' button, NOT for continuous voice commands
        if (speakButton && isSpeakButtonActive) { // Reset button if it was active
            speakButton.textContent = '🎙️ Speak';
            speakButton.classList.remove('recording');
            isSpeakButtonActive = false;
            // For single-shot speak button, it's okay to give feedback immediately
            speakText("Sorry, I didn't catch that. Please try again.");
        } else if (isContinuous) {
            console.log("Continuous voice command error. Remaining silent."); // Remain silent for errors in continuous mode
        }
        if (recognition) { // Ensure recognition object exists
            recognition.stop(); // Stop recognition on error to prevent continuous errors
        }
    };

    recognition.onend = function() {
        console.log("Voice recognition ended.");
        if (speakButton && isSpeakButtonActive) {
            speakButton.textContent = '🎙️ Speak';
            speakButton.classList.remove('recording');
            isSpeakButtonActive = false;
        }

        // In continuous mode, do NOT restart recognition here directly.
        // The restart (after bot speech or initial enable) is handled elsewhere (speakText's utterance.onend).
        if (isContinuous) {
            console.log("Continuous recognition ended. Restart handled externally.");
        } else {
            console.log("Single recognition session ended (not continuous).");
        }
    };

    recognition.start();
}

// Handle the 'Speak' button click - now only for single-shot voice input
function toggleSpeak(speakButton) {
    console.log("toggleSpeak() called.");

    // If recognition is currently active and was started by this button, stop it.
    // Otherwise, start a new (non-continuous) recognition session.
    if (recognition && recognition.recognizing && isSpeakButtonActive) {
        console.log("Speak button: Recognition active, stopping it.");
        recognition.stop();
        speakButton.textContent = '🎙️ Speak';
        speakButton.classList.remove('recording');
        isSpeakButtonActive = false; // Reset flag
    } else {
        console.log("Speak button: Recognition not active or not started by button, starting a single session.");
        startVoiceRecognition(speakButton, false); // Start non-continuous recognition
    }
}

// Update the event listener for the speak button
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired, attempting to assign speak button handler.");
    const speakButton = document.getElementById('speak-button');
    if (speakButton) {
        speakButton.onclick = () => toggleSpeak(speakButton); // Pass speakButton to toggleSpeak
        console.log("Speak button handler assigned.");
    } else {
        console.error("Speak button with ID 'speak-button' not found!");
    }

    // Initial setup of other event listeners (Send, Translate, Tutorial, Chat)
    const sendButton = document.getElementById("send-button");
    if (sendButton) {
        sendButton.addEventListener("click", () => sendMessage());
    }

    const userInputField = document.getElementById("user-input");
    if (userInputField) {
        userInputField.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                // If continuous voice commands are enabled and recognition is active, stop it
                if (isVoiceCommandsEnabled && recognition && recognition.recognizing) {
                    console.log("Enter key pressed: Stopping continuous recognition.");
                    recognition.stop();
                }
                sendMessage();
            }
        });
    }

    const translateButton = document.getElementById('translate-button');
    if (translateButton) {
        translateButton.addEventListener('click', translateChat);
    }

    const tutorialButton = document.getElementById('tutorial-button');
    if (tutorialButton) {
        tutorialButton.addEventListener('click', showTutorial);
    }

    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
        chatButton.addEventListener('click', showChat);
    }

    const closeChatButton = document.getElementById('close-chat');
    if (closeChatButton) {
        closeChatButton.addEventListener('click', hideChat);
    }

    // Accessibility feature event listeners and localStorage persistence
    const highContrastToggle = document.getElementById('highContrastToggle');
    const screenReaderToggle = document.getElementById('screenReaderToggle');
    const voiceCommandsToggle = document.getElementById('voiceCommandsToggle');
    const increaseTextButton = document.getElementById('increaseText');
    const decreaseTextButton = document.getElementById('decreaseText');

    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', () => {
            toggleHighContrast();
            localStorage.setItem('highContrast', highContrastToggle.checked);
        });
        // Apply saved state on load
        const savedHighContrast = localStorage.getItem('highContrast');
        if (savedHighContrast !== null) {
            highContrastToggle.checked = (savedHighContrast === 'true');
            toggleHighContrast(); // Apply the state
        }
    }

    if (screenReaderToggle) {
        screenReaderToggle.addEventListener('change', () => {
            toggleScreenReader();
            localStorage.setItem('screenReader', screenReaderToggle.checked);
        });
        // Apply saved state on load
        const savedScreenReader = localStorage.getItem('screenReader');
        if (savedScreenReader !== null) {
            screenReaderToggle.checked = (savedScreenReader === 'true');
            toggleScreenReader(); // Apply the state
        }
    }

    if (voiceCommandsToggle) {
        voiceCommandsToggle.addEventListener('change', () => {
            toggleVoiceCommands();
            localStorage.setItem('voiceCommands', voiceCommandsToggle.checked);
        });
        // Apply saved state on load
        isVoiceCommandsEnabled = localStorage.getItem('voiceCommands') === 'true';
        voiceCommandsToggle.checked = isVoiceCommandsEnabled;
        if (isVoiceCommandsEnabled) {
            setTimeout(() => {
                startVoiceRecognition(null, true); // Start continuous recognition on load if enabled
                console.log("Voice commands enabled from localStorage.");
            }, 500); // Small delay to ensure everything is ready
        }
    }

    if (increaseTextButton) {
        increaseTextButton.addEventListener('click', () => {
            adjustTextSize('increase');
            localStorage.setItem('textSize', document.body.style.fontSize);
        });
    }

    if (decreaseTextButton) {
        decreaseTextButton.addEventListener('click', () => {
            adjustTextSize('decrease');
            localStorage.setItem('textSize', document.body.style.fontSize);
        });
    }

    // Apply saved text size on load
    const savedTextSize = localStorage.getItem('textSize');
    if (savedTextSize) {
        document.body.style.fontSize = savedTextSize;
    }
});

function handleVoiceCommand(command, action) {
    console.log(`Handling voice command: ${command}, action: ${action}`);
    switch (command) {
        case "start_chat":
            showChat();
            speakText("Chat opened.");
            break;
        case "go_to_home":
            window.location.href = '/';
            speakText("Navigating to home page.");
            break;
        case "toggle_high_contrast":
            const highContrastToggle = document.getElementById('highContrastToggle');
            if (highContrastToggle) {
                highContrastToggle.checked = (action === "enable");
                toggleHighContrast();
                speakText(`High contrast mode ${action === "enable" ? "enabled" : "disabled"}.`);
            }
            break;
        case "toggle_screen_reader":
            const screenReaderToggle = document.getElementById('screenReaderToggle');
            if (screenReaderToggle) {
                screenReaderToggle.checked = (action === "enable");
                toggleScreenReader();
                speakText(`Screen reader optimization ${action === "enable" ? "enabled" : "disabled"}.`);
            }
            break;
        case "adjust_text_size":
            adjustTextSize(action);
            speakText(`Text size ${action === "increase" ? "increased" : "decreased"}.`);
            break;
        case "toggle_voice_commands":
            const voiceCommandsToggle = document.getElementById('voiceCommandsToggle');
            if (voiceCommandsToggle) {
                voiceCommandsToggle.checked = false; // Always disable for this command
                toggleVoiceCommands();
                speakText("Voice commands disabled.");
            }
            break;
        case "focus_input":
            const userInput = document.getElementById("user-input");
            if (userInput) {
                userInput.focus();
                speakText("Input field focused.");
            }
            break;
        default:
            console.log("Unknown voice command.");
            speakText("I didn't understand that voice command.");
            break;
    }
}

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

    document.body.style.fontSize = `${newSize}px`;
}

// Function for translation
function translateChat() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input').value;
    const translateLang = document.getElementById('translate-lang').value; // Get selected language

    // Check if there's content to translate
    const contentToTranslate = userInput.trim(); // Prioritize user input

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
