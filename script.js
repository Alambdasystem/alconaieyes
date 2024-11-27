document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // Function to call the Azure Function to list blobs
    async function listBlobs() {
        const functionUrl = 'https://backendeyes.azurewebsites.net/api/listBlobs';  // Replace with your Azure Function URL
        try {
            const response = await fetch(functionUrl, {
                method: 'GET',  // Make sure to use the correct HTTP method (GET)
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch blobs');
            }
            
            const blobs = await response.json();
            console.log(blobs);  // Log the blob names

            // Optionally display blob names in the web page
            const blobListDiv = document.getElementById('blobList');
            blobListDiv.innerHTML = '';  // Clear any previous list
            blobs.forEach(blob => {
                const blobItem = document.createElement('div');
                blobItem.textContent = blob;  // Display blob name
                blobListDiv.appendChild(blobItem);
            });
        } catch (error) {
            console.error("Error fetching blobs:", error);
        }
    }

    // Call listBlobs on page load
    window.addEventListener('DOMContentLoaded', listBlobs);

    // Add message to chatbox
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = content;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Handle user input and send message to the chatbot
    async function handleUserInput(prompt) {
        addMessage(prompt, true);  // Show user message

        // Extract keywords and find a relevant blob (PDF, etc.)
        const keywords = prompt.toLowerCase().split(" ").filter(word => word.length > 3);
        const relevantBlob = await findRelevantBlob(keywords);
        if (relevantBlob) {
            const blobContent = await downloadBlob(relevantBlob);
            addMessage(blobContent, false); // Show bot response with content
        } else {
            const aiResponse = await queryAI(prompt); // AI response from OpenAI
            addMessage(aiResponse, false); // Show basic AI response
        }
    }

    // Function to query AI API (e.g., OpenAI)
    async function queryAI(prompt) {
        const payload = {
            messages: [
                { role: "system", content: "You are an AI assistant specializing in eyes and vision." },
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch("https://formulations-public.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": "0c0e3ba4d37a4bf181da87d417ef635b",  // Your OpenAI API key here
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    // Add event listeners for button and enter key
    sendButton.addEventListener('click', () => {
        const prompt = userInput.value.trim();
        if (prompt) {
            handleUserInput(prompt);
            userInput.value = "";
        }
    });

    userInput.addEventListener('keypress', (event) => {
        if (event.key === "Enter") {
            sendButton.click();
        }
    });
});
