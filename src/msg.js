const grabContent = document.querySelector("#MsgContent");
const displayContent = document.querySelector(".messages_box");
const msgHolder = document.querySelector("#msgHolder");

const socket = io();

msgHolder.addEventListener("submit", writeMessage);
window.addEventListener("load", initialiseChat);

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

socket.on("chat message", (message) => {
  addMessageToUI(message.user, message.text, message.time);
});

async function initialiseChat() {
  await loadMessagesFromServer();
}

async function loadMessagesFromServer() {
  try {
    const res = await fetch("/messages");
    if (!res.ok) throw new Error("Failed to load messages");

    const messages = await res.json();
    displayContent.innerHTML = "";

    if (!messages.length) {
      displayEmptyState();
      return;
    }

    messages.forEach((msg) => {
      addMessageToUI(msg.user, msg.text, msg.time);
    });
  } catch (error) {
    console.error("Could not load messages:", error);
    displayEmptyState();
  }
}

function displayEmptyState() {
  displayContent.innerHTML = `
    <p class="empty-text">No messages yet.<br>Start the conversation!</p>
  `;
}

function addMessageToUI(username, message, time = "") {
  const emptyText = displayContent.querySelector(".empty-text");
  if (emptyText) emptyText.remove();

  const newMsg = document.createElement("p");
  newMsg.classList.add("chat-message");

  const nameSpan = document.createElement("strong");
  nameSpan.textContent = `${username}: `;

  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;

  newMsg.appendChild(nameSpan);
  newMsg.appendChild(messageSpan);

  if (time) {
    const timeSpan = document.createElement("small");
    timeSpan.classList.add("chat-time");
    timeSpan.textContent = ` ${formatTime(time)}`;
    newMsg.appendChild(timeSpan);
  }

  displayContent.appendChild(newMsg);
  displayContent.scrollTop = displayContent.scrollHeight;
}

function formatTime(timeValue) {
  const date = new Date(timeValue);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

async function getCurrentUsername() {
  try {
    const user = await getAuthenticatedUser();
    return user?.name || user?.nickname || user?.email || null;
  } catch (error) {
    console.error("Could not get Auth0 user:", error);
    return null;
  }
}

async function writeMessage(event) {
  event.preventDefault();

  const message = grabContent.value.trim();
  if (!message) return;

  const username = await getCurrentUsername();
  if (!username) {
    alert("Please log in from your profile before sending a message.");
    return;
  }

  socket.emit("chat message", {
    user: username,
    text: message
  });

  grabContent.value = "";
}
import { getAuthenticatedUser } from "./auth.js";
