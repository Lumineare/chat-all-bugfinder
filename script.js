import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuTnzeqL4MewumZLrsaKe3Mo4osmwnsoA",
  authDomain: "chat-89990.firebaseapp.com",
  databaseURL: "https://chat-89990-default-rtdb.firebaseio.com/",
  projectId: "chat-89990",
  storageBucket: "chat-89990.firebasestorage.app",
  messagingSenderId: "169196104649",
  appId: "1:169196104649:web:677ded8a2bb6117f069618",
  measurementId: "G-81BR3WPV20"
};

// Initialize Firebase app and database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Reference to 'messages' node in the database
const messagesRef = ref(database, 'messages');

let messageInput, sendBtn, messagesDiv, usernameInput, imageInput, uploadImageBtn;

// Function to send text message
function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    const newMessage = {
      content: text,
      type: 'text',
      sender: getUsername(),
      timestamp: serverTimestamp(),
      replyTo: currentReplyTo || null
    };
    push(messagesRef, newMessage)
      .then(() => console.log("Pesan berhasil dikirim"))
      .catch(e => console.error("Error mengirim pesan:", e));
    messageInput.value = '';
    cancelReply(); // Reset reply
  }
}

// Function to send image
function sendImage() {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const newMessage = {
      content: e.target.result,
      type: 'image',
      sender: getUsername(),
      timestamp: serverTimestamp(),
      replyTo: currentReplyTo || null
    };
    push(messagesRef, newMessage)
      .then(() => console.log("Gambar berhasil dikirim"))
      .catch(e => console.error("Error mengirim gambar:", e));
  };
  reader.readAsDataURL(file);
}

// Function to display messages from Firebase
onValue(messagesRef, (snapshot) => {
  messagesDiv.innerHTML = '';
  const data = snapshot.val();
  if (data) {
    Object.entries(data).forEach(([key, msg]) => {
      addMessageToDOM(msg, key);
    });
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}, {
  onlyOnce: false
});

// Variable to track which message is being replied to
let currentReplyTo = null;

// Function to handle reply click
function startReply(msg) {
  currentReplyTo = {
    sender: msg.sender,
    content: msg.content,
    type: msg.type
  };
  messageInput.placeholder = `Membalas ${msg.sender}...`;
  messageInput.focus();
}

// Function to cancel reply
function cancelReply() {
  currentReplyTo = null;
  messageInput.placeholder = 'Tulis pesan...';
}

// Function to add message to DOM
function addMessageToDOM(msg, key) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  msgDiv.classList.add(msg.sender === getUsername() ? 'sent' : 'received');

  // Add user info (avatar and name)
  const userInfo = document.createElement('div');
  userInfo.classList.add('user-info');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = msg.sender.charAt(0).toUpperCase();

  const nameSpan = document.createElement('span');
  nameSpan.textContent = msg.sender;

  userInfo.appendChild(avatar);
  userInfo.appendChild(nameSpan);

  // Add reply preview if this message is a reply
  if (msg.replyTo) {
    const replyPreview = document.createElement('div');
    replyPreview.classList.add('reply-preview');
    replyPreview.innerHTML = `<span>${msg.replyTo.sender}:</span> ${msg.replyTo.type === 'image' ? '[Gambar]' : msg.replyTo.content.substring(0, 30) + '...'}`;
    replyPreview.onclick = () => startReply(msg.replyTo);
    msgDiv.appendChild(replyPreview);
  }

  if (msg.type === 'image') {
    const img = document.createElement('img');
    img.src = msg.content;
    msgDiv.appendChild(img);
  } else {
    msgDiv.textContent = msg.content;
  }

  // Prepend user info before the message content
  msgDiv.insertBefore(userInfo, msgDiv.firstChild);
  msgDiv.onclick = () => startReply(msg);
  messagesDiv.appendChild(msgDiv);
}

// Function to get current username
function getUsername() {
  return usernameInput.value.trim() || 'Anonim';
}

// Set user status to online
const userStatusRef = ref(database, `status/${getUsername()}`);
onDisconnect(userStatusRef).set(false).then(() => {
  // Set online status when user connects
  userStatusRef.set(true);
});

// Wait for DOM to load before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  messageInput = document.getElementById('messageInput');
  sendBtn = document.getElementById('sendBtn');
  messagesDiv = document.getElementById('messages');
  usernameInput = document.getElementById('usernameInput');
  imageInput = document.getElementById('imageInput');
  uploadImageBtn = document.getElementById('uploadImageBtn');

  // Attach event listeners
  sendBtn.addEventListener('click', sendMessage);
  uploadImageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', sendImage);

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Cancel reply when user clicks outside input
  messageInput.addEventListener('blur', cancelReply);
});