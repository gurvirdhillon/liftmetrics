const grabContent = document.querySelector('#MsgContent');
const displayContent = document.querySelector('.messages_box');
const msgHolder = document.querySelector('#msgHolder');

msgHolder.addEventListener('submit', writeMessage);
window.addEventListener('load', loadMessages);

function saveMessage(username, message) {
    const existingMessages = JSON.parse(localStorage.getItem('messages')) || [];

    existingMessages.push({
        user: username,
        text: message
    });

    localStorage.setItem('messages', JSON.stringify(existingMessages));
}

function addMessageToUI(username, message) {
    const emptyText = displayContent.querySelector('.empty-text');
    if (emptyText) {
        emptyText.remove();
    }

    const newMsg = document.createElement('p');
    newMsg.classList.add('chat-message');

    const nameSpan = document.createElement('strong');
    nameSpan.textContent = `${username}: `;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    newMsg.appendChild(nameSpan);
    newMsg.appendChild(messageSpan);

    displayContent.appendChild(newMsg);
}

function loadMessages() {
    const savedMessages = JSON.parse(localStorage.getItem('messages')) || [];

    savedMessages.forEach(msg => {
        addMessageToUI(msg.user, msg.text);
    });
}

async function writeMessage(event) {
    event.preventDefault();

    const message = grabContent.value.trim();
    if (message === '') return;

    let username = 'User';

    try {
        if (window.auth0Client) {
            const isAuthenticated = await window.auth0Client.isAuthenticated();

            if (isAuthenticated) {
                const user = await window.auth0Client.getUser();
                username = user.name || user.nickname || user.email || 'User';
            }
        }
    } catch (error) {
        console.error('Could not get Auth0 user:', error);
    }

    addMessageToUI(username, message);
    saveMessage(username, message);

    grabContent.value = '';
}