/*
    Roblox AI Proxy Server (Node.js & Express)
*/

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors()); // Enable Cross-Origin Resource Sharing

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// A simple conversation history (in-memory, will reset on server restart)
const conversationHistory = {};

app.get('/', (req, res) => {
  res.send('Roblox AI Proxy is running!');
});


// The main endpoint that Roblox will send requests to.
app.post('/chat', async (req, res) => {
    const { prompt, user } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!GEMINI_API_KEY) {
        console.error('Gemini API Key is not configured.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Initialize history for a new user
    if (!conversationHistory[user]) {
        conversationHistory[user] = [];
    }

    // Add the user's new message to their history
    conversationHistory[user].push({ role: "user", parts: [{ text: prompt }] });

    const payload = {
        contents: conversationHistory[user],
    };

    try {
        const apiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Gemini API Error:', errorText);
            throw new Error(`API request failed with status ${apiResponse.status}`);
        }

        const result = await apiResponse.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {

            const aiResponseText = result.candidates[0].content.parts[0].text;

            // Add the model's response to the history
            conversationHistory[user].push({ role: "model", parts: [{ text: aiResponseText }] });

            // Send the response back to Roblox
            res.json({ response: aiResponseText });

        } else {
            console.warn("Received an empty or malformed response from Gemini API:", result);
            res.json({ response: "I'm not quite sure what to say." });
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to get a response from the AI.' });
    }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
