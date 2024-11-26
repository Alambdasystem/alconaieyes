document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const storageKey = process.env.STORAGE_KEY;
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=formulationscondensed;AccountKey=${storageKey};EndpointSuffix=core.windows.net`;
    
    const containerName = "input";

    
    // Azure Blob Storage: List all blobs in the container
    async function listBlobs() {
        const blobServiceClient = AzureStorageBlob.BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobs = [];

        for await (const blob of containerClient.listBlobsFlat()) {
            blobs.push(blob.name);
        }

        return blobs;
    }

    // Azure Blob Storage: Download the content of a blob
    async function downloadBlob(blobName) {
        const blobServiceClient = AzureStorageBlob.BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadResponse = await blobClient.download();
        const downloadedContent = await new Response(downloadResponse.readableStreamBody).text();
        return downloadedContent;
    }

    // Add a message to the chatbox
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = content;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Extract keywords from the user prompt
    function extractKeywords(prompt) {
        return prompt.toLowerCase().split(" ").filter(word => word.length > 3);
    }

    // Find relevant PDF based on keywords
    async function findRelevantPDF(keywords) {
        const blobs = await listBlobs();
        const matchingBlobs = blobs.filter(blob =>
            keywords.some(keyword => blob.toLowerCase().includes(keyword))
        );
        return matchingBlobs.length > 0 ? matchingBlobs[0] : null;
    }

    // Handle user input
    async function handleUserInput(prompt) {
        addMessage(prompt, true); // Show user message

        // Extract keywords and find a relevant PDF
        const keywords = extractKeywords(prompt);
        const relevantPDF = await findRelevantPDF(keywords);

        if (relevantPDF) {
            const pdfContent = await downloadBlob(relevantPDF);
            const enhancedResponse = await queryAI(prompt, pdfContent);
            addMessage(enhancedResponse, false); // Show AI-enhanced response
        } else {
            const aiResponse = await queryAI(prompt);
            addMessage(aiResponse, false); // Show basic AI response
        }
    }

    // Query AI with optional context
    async function queryAI(prompt, context = "") {
        const payload = {
            messages: [
                { role: "system", content: "You are an AI assistant specializing in eyes and vision." },
                { role: "user", content: context ? `${context}\n\n${prompt}` : prompt },
            ],
        };

        const response = await fetch("https://formulations-public.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": "0c0e3ba4d37a4bf181da87d417ef635b",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    // Add event listeners
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
async function getOpenAIResponse(userMessage) {
    try {
        const response = await fetch("https://formulations-public.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": "0c0e3ba4d37a4bf181da87d417ef635b",
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
