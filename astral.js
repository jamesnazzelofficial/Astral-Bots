
// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { getUserId } = require('./commands/getUserId');
const { addUser } = require('./commands/addUser');
const { handleWelcomeMessage, handleLeaveMessage } = require('./handlers/memberHandler');
const { helpCommand } = require('./commands/helpCommand');

// Environment Variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1337;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Middleware
app.use(bodyParser.json());

// Facebook Webhook Verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Webhook Endpoint to Handle Messages and Events
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message) {
                handleMessage(senderId, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderId, webhookEvent.postback);
            } else if (webhookEvent.joining_member) {
                handleWelcomeMessage(webhookEvent.joining_member);
            } else if (webhookEvent.leaving_member) {
                handleLeaveMessage(webhookEvent.leaving_member);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Handle Messages
function handleMessage(senderId, receivedMessage) {
    if (receivedMessage.text) {
        const messageText = receivedMessage.text.toLowerCase();

        // Handle different commands here
        if (messageText.startsWith('%help')) {
            helpCommand(senderId);
        } else if (messageText.startsWith('%getuserid')) {
            const profileLink = messageText.split(' ')[1];
            if (!profileLink) {
                sendMessage(senderId, 'Usage: %getuserid <profile-link>');
            } else {
                getUserId(senderId, profileLink);
            }
        } else if (messageText.startsWith('%add')) {
            const fbUserId = messageText.split(' ')[1];
            addUser(senderId, fbUserId);
        }
        // Add more command handling logic below
    }
}

// Handle Postback Messages (optional)
function handlePostback(senderId, receivedPostback) {
    const payload = receivedPostback.payload;

    // Handle postback messages if needed
    if (payload === 'GET_STARTED') {
        sendMessage(senderId, 'Welcome! Type %help for a list of commands.');
    }
}

// Send a text message using the Send API
function sendMessage(recipientId, message) {
    const messageData = {
        recipient: { id: recipientId },
        message: { text: message }
    };

    axios.post(`https://graph.facebook.com/v10.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, messageData)
        .then(response => {
            console.log('Message sent successfully:', response.data);
        })
        .catch(error => {
            console.error('Unable to send message:', error.response ? error.response.data : error.message);
        });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Webhook is listening on port ${PORT}`);
});

