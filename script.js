const openAIKey = '0c0e3ba4d37a4bf181da87d417ef635b';

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});


async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (message) {
        addMessage(message, 'user-message');
        userInput.value = '';
        const botResponse = await getOpenAIResponse(message);
        addMessage(botResponse, 'bot-message');
    }
}

function addMessage(text, className) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function getOpenAIResponse(userMessage) {
    try {
        const response = await fetch('https://formulations-public.openai.azure.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openAIKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: userMessage }],
                temperature: 0.7,
                max_tokens: 150,
            }),
        });

        const data = await response.json();
        console.log('Full API Response:', data);

        // Check for errors in the response
        if (data.error) {
            console.error('API Error:', data.error);
            return `Error: ${data.error.message}`;
        }

        // Validate the success response structure
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error('Unexpected API response structure:', data);
            return 'Sorry, I encountered an unexpected response from the AI.';
        }
    } catch (error) {
        console.error('Error fetching response from OpenAI:', error);
        return 'Sorry, there was an error communicating with the AI.';
    }
}
