import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp, remove, set, get } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

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

// Initialize Firebase app, database, and auth
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// UI Elements
let messageInput, sendBtn, messagesDiv, usernameInput, imageInput, uploadImageBtn;
let newContactInput, addContactBtn, contactsList, chatHeader, chatArea, chatFooter, chatTitle;
let loginUsername, loginPassword, loginBtn;
let registerUsername, registerPassword, registerBtn;
let logoutBtn;
let authScreen, mainApp;
let searchUserInput, searchUserBtn, searchResults;

// Currently active user and contact
let currentUser = null;
let currentContactId = null;
let currentContactUsername = null; // Untuk menyimpan username kontak yang sedang aktif

// Function to generate unique contact ID (optional, kita gunakan userId kontak langsung)
// function generateContactId(name) {
//   return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
// }

// Function to handle login
function handleLogin() {
  const email = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    alert("Email dan password harus diisi.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("Login berhasil:", userCredential.user);
      currentUser = userCredential.user;
      usernameInput.value = email.split('@')[0]; // Gunakan bagian sebelum @ sebagai nama tampilan
      showMainApp();
      loadContacts();
    })
    .catch((error) => {
      console.error("Login gagal:", error);
      alert("Login gagal: " + error.message);
    });
}

// Function to handle registration
function handleRegister() {
  const email = registerUsername.value.trim();
  const password = registerPassword.value;

  if (!email || !password) {
    alert("Email dan password harus diisi.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      console.log("Registrasi berhasil:", userCredential.user);
      // Buat profil dasar di database, gunakan bagian sebelum @ sebagai username
      const username = email.split('@')[0];
      const profileRef = ref(database, `users/${userCredential.user.uid}/profile`);
      const usernameIndexRef = ref(database, `usernames/${username}`);

      // Gunakan transaction untuk mencegah konflik jika dua user mendaftar dengan username yang sama hampir bersamaan
      try {
        await set(profileRef, {
          username: username,
          email: email, // Simpan juga email
          createdAt: serverTimestamp()
        });
        await set(usernameIndexRef, userCredential.user.uid); // Buat indeks username -> userId
        alert("Registrasi berhasil! Silakan login.");
        // Pindah ke tab login
        const loginTab = document.getElementById('login-tab');
        bootstrap.Tab.getOrCreateInstance(loginTab).show();
      } catch (e) {
        console.error("Gagal membuat profil atau indeks username:", e);
        alert("Gagal menyimpan profil. Silakan coba lagi.");
        // Bisa tambahkan logika untuk menghapus user jika profil gagal dibuat
      }
    })
    .catch((error) => {
      console.error("Registrasi gagal:", error);
      alert("Registrasi gagal: " + error.message);
    });
}

// Function to handle logout
function handleLogout() {
  signOut(auth).then(() => {
    console.log("Logout berhasil");
    currentUser = null;
    currentContactId = null;
    currentContactUsername = null;
    showAuthScreen();
  }).catch((error) => {
    console.error("Logout gagal:", error);
  });
}

// Function to show main app screen
function showMainApp() {
  authScreen.style.display = 'none';
  mainApp.style.display = 'flex';
}

// Function to show auth screen
function showAuthScreen() {
  authScreen.style.display = 'flex';
  mainApp.style.display = 'none';
  // Reset form
  loginUsername.value = '';
  loginPassword.value = '';
  registerUsername.value = '';
  registerPassword.value = '';
  // Sembunyikan hasil pencarian
  searchResults.classList.add('d-none');
}

// Function to search user by username
async function searchUser() {
  const usernameToSearch = searchUserInput.value.trim().toLowerCase();
  if (!usernameToSearch) return;

  const usernameIndexRef = ref(database, `usernames/${usernameToSearch}`);
  try {
    const snapshot = await get(usernameIndexRef);
    if (snapshot.exists()) {
      const foundUserId = snapshot.val();
      // Ambil profil pengguna yang ditemukan
      const profileRef = ref(database, `users/${foundUserId}/profile`);
      const profileSnapshot = await get(profileRef);
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val();
        displaySearchResult(profile.username, foundUserId);
      } else {
        alert("Profil pengguna tidak ditemukan.");
      }
    } else {
      alert("Username tidak ditemukan.");
    }
  } catch (e) {
    console.error("Error mencari user:", e);
    alert("Gagal mencari user: " + e.message);
  }
}

// Function to display search result
function displaySearchResult(username, userId) {
    searchResults.classList.remove('d-none');
    searchResults.innerHTML = ''; // Clear previous results

    // Jangan tampilkan hasil jika user mencari dirinya sendiri
    if (userId === currentUser.uid) {
        searchResults.innerHTML = '<div class="alert alert-info">Ini akun Anda.</div>';
        return;
    }

    const resultDiv = document.createElement('div');
    resultDiv.classList.add('search-result-item');
    resultDiv.innerHTML = `
        <div class="avatar-sm">${username.charAt(0).toUpperCase()}</div>
        <div>${username}</div>
    `;
    // Add button to add as contact
    const addBtn = document.createElement('button');
    addBtn.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'ms-auto');
    addBtn.textContent = 'Tambah Kontak';
    addBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent triggering the item click
        addContact(userId, username);
    };
    resultDiv.appendChild(addBtn);

    resultDiv.onclick = () => {
        // Opsional: bisa langsung pilih kontak jika ditemukan di daftar kontak
        // Tapi karena bisa saja belum ditambahkan, kita hanya tampilkan tombol "Tambah Kontak"
    };

    searchResults.appendChild(resultDiv);
}

// Function to add contact to Firebase
async function addContact(userId, username) {
  if (!currentUser || !userId) return;

  // Cek apakah sudah menjadi kontak
  const contactRef = ref(database, `users/${currentUser.uid}/contacts/${userId}`);
  try {
    const snapshot = await get(contactRef);
    if (snapshot.exists()) {
        alert("Kontak sudah ada.");
        return;
    }

    // Tambahkan userId ke daftar kontak pengguna saat ini
    await set(contactRef, true);

    // Opsional: Tambahkan juga pengguna saat ini ke daftar kontak user yang ditambahkan (jika diinginkan)
    // await set(ref(database, `users/${userId}/contacts/${currentUser.uid}`), true);

    console.log("Kontak berhasil ditambahkan:", username);
    newContactInput.value = ''; // Clear the input field
    searchUserInput.value = ''; // Clear search input after adding
    searchResults.classList.add('d-none'); // Hide search results
    loadContacts(); // Reload contacts list
  } catch (e) {
    console.error("Error menambah kontak:", e);
    alert("Gagal menambah kontak: " + e.message);
  }
}


// Function to load contacts from Firebase
function loadContacts() {
  if (!currentUser) return;

  const contactsRef = ref(database, `users/${currentUser.uid}/contacts`);
  onValue(contactsRef, (snapshot) => {
    contactsList.innerHTML = '';
    const data = snapshot.val();
    if (data) {
      Object.keys(data).forEach((contactId) => {
        // Ambil profil kontak
        const profileRef = ref(database, `users/${contactId}/profile`);
        onValue(profileRef, (profileSnapshot) => {
          if (profileSnapshot.exists()) {
            const profile = profileSnapshot.val();
            const contactDiv = document.createElement('div');
            contactDiv.classList.add('contact-item');
            contactDiv.onclick = () => openChat(contactId, profile.username);
            contactDiv.innerHTML = `
              <div class="avatar-sm">${profile.username.charAt(0).toUpperCase()}</div>
              <div>${profile.username}</div>
            `;
            if (contactId === currentContactId) {
              contactDiv.classList.add('active');
            }
            contactsList.appendChild(contactDiv);
          }
        }, { onlyOnce: true }); // Hanya ambil sekali
      });
    }
  });
}

// Function to open chat with a contact
function openChat(contactId, contactUsername) {
  if (!currentUser) return;

  currentContactId = contactId;
  currentContactUsername = contactUsername;

  // Update UI
  chatTitle.textContent = contactUsername;
  chatHeader.classList.remove('d-none');
  chatArea.classList.remove('d-none');
  chatFooter.classList.remove('d-none');

  // Highlight active contact
  document.querySelectorAll('#contactsList .contact-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.contact-item')?.classList.add('active');

  // Load messages for this contact
  loadMessagesForContact(contactId);
}

// Function to load messages for a specific contact
function loadMessagesForContact(contactId) {
  if (!currentUser) return;

  const messagesRef = ref(database, `users/${currentUser.uid}/messages/${contactId}`);
  onValue(messagesRef, (snapshot) => {
    if (!messagesDiv) return;
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
}

// Function to send text message
function sendMessage() {
  if (!currentUser || !currentContactId || !messageInput || !sendBtn || !messagesDiv) {
    console.error("Pengguna belum login, kontak belum dipilih, atau elemen DOM belum siap!");
    return;
  }

  const text = messageInput.value.trim();
  if (text) {
    const newMessage = {
      content: text,
      type: 'text',
      sender: usernameInput.value.trim() || 'Anda',
      timestamp: serverTimestamp(),
      replyTo: currentReplyTo || null
    };

    // Kirim ke pengguna saat ini
    const currentUserMsgRef = ref(database, `users/${currentUser.uid}/messages/${currentContactId}`);
    // Kirim ke kontak
    const contactUserMsgRef = ref(database, `users/${currentContactId}/messages/${currentUser.uid}`);

    // Gunakan Promise.all untuk mengirim ke dua tempat sekaligus
    Promise.all([
        push(currentUserMsgRef, newMessage),
        push(contactUserMsgRef, newMessage)
    ]).then(() => {
        console.log("Pesan berhasil dikirim ke dua sisi");
        messageInput.value = '';
        cancelReply(); // Reset reply
    }).catch(e => {
        console.error("Error mengirim pesan:", e);
        alert("Gagal mengirim pesan: " + e.message);
    });
  }
}

// Function to send image
function sendImage() {
  if (!currentUser || !currentContactId || !imageInput) return;

  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const newMessage = {
      content: e.target.result,
      type: 'image',
      sender: usernameInput.value.trim() || 'Anda',
      timestamp: serverTimestamp(),
      replyTo: currentReplyTo || null
    };

    // Kirim ke pengguna saat ini
    const currentUserMsgRef = ref(database, `users/${currentUser.uid}/messages/${currentContactId}`);
    // Kirim ke kontak
    const contactUserMsgRef = ref(database, `users/${currentContactId}/messages/${currentUser.uid}`);

    // Gunakan Promise.all untuk mengirim ke dua tempat sekaligus
    Promise.all([
        push(currentUserMsgRef, newMessage),
        push(contactUserMsgRef, newMessage)
    ]).then(() => {
        console.log("Gambar berhasil dikirim ke dua sisi");
    }).catch(e => {
        console.error("Error mengirim gambar:", e);
        alert("Gagal mengirim gambar: " + e.message);
    });
  };
  reader.readAsDataURL(file);
}

// Variable to track which message is being replied to
let currentReplyTo = null;

// Function to handle reply click
function startReply(msg) {
  currentReplyTo = {
    sender: msg.sender,
    content: msg.content,
    type: msg.type
  };
  if (messageInput) {
    messageInput.placeholder = `Membalas ${msg.sender}...`;
    messageInput.focus();
  }
}

// Function to cancel reply
function cancelReply() {
  currentReplyTo = null;
  if (messageInput) {
    messageInput.placeholder = 'Tulis pesan...';
  }
}

// Function to delete a message
function deleteMessage(key) {
  if (!currentUser || !currentContactId) return;
  const msgRef = ref(database, `users/${currentUser.uid}/messages/${currentContactId}/${key}`);
  remove(msgRef)
    .then(() => console.log("Pesan berhasil dihapus"))
    .catch(e => console.error("Error menghapus pesan:", e));
}

// Function to show delete confirmation popup
function showDeletePopup(key, event) {
  event.preventDefault(); // Prevent default context menu on long press

  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  overlay.id = 'delete-overlay';

  const popup = document.createElement('div');
  popup.classList.add('confirm-delete');
  popup.innerHTML = `
    <p>Hapus pesan ini?</p>
    <button class="confirm-yes">Ya</button>
    <button class="confirm-no">Tidak</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // Handle button clicks
  popup.querySelector('.confirm-yes').onclick = () => {
    deleteMessage(key);
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
  };

  popup.querySelector('.confirm-no').onclick = () => {
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
  };

  // Close popup if overlay is clicked
  overlay.onclick = () => {
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
  };
}

// Function to add message to DOM
function addMessageToDOM(msg, key) {
  if (!messagesDiv) return;

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  msgDiv.classList.add(msg.sender === usernameInput.value.trim() ? 'sent' : 'received');

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

  // Add reply origin if this message is a reply
  if (msg.replyTo) {
    const replyOrigin = document.createElement('div');
    replyOrigin.classList.add('reply-origin');
    replyOrigin.innerHTML = `<span>${msg.replyTo.sender}:</span> ${msg.replyTo.type === 'image' ? '[Gambar]' : msg.replyTo.content.substring(0, 50) + '...'}`;
    msgDiv.appendChild(replyOrigin);
  }

  if (msg.type === 'image') {
    const img = document.createElement('img');
    img.src = msg.content;
    msgDiv.appendChild(img);
  } else {
    msgDiv.textContent = msg.content;
  }

  // Add long press event for deleting own messages on mobile
  if (msg.sender === usernameInput.value.trim()) {
    let pressTimer;

    msgDiv.addEventListener('touchstart', (e) => {
      pressTimer = window.setTimeout(() => {
        showDeletePopup(key, e);
      }, 500); // 500ms = 0.5 detik untuk long press
    });

    msgDiv.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    msgDiv.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });

    // Optional: Also add right-click context menu for desktop testing
    msgDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showDeletePopup(key, e);
    });
  }

  // Prepend user info before the message content
  msgDiv.insertBefore(userInfo, msgDiv.firstChild);
  msgDiv.onclick = () => startReply(msg);
  messagesDiv.appendChild(msgDiv);
}

// Check auth state on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    currentUser = user;
    const email = user.email;
    usernameInput.value = email ? email.split('@')[0] : 'Anda'; // Gunakan bagian sebelum @
    showMainApp();
    loadContacts();
  } else {
    // User is signed out
    showAuthScreen();
  }
});

// Wait for DOM to load before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  // Auth Elements
  loginUsername = document.getElementById('loginUsername');
  loginPassword = document.getElementById('loginPassword');
  loginBtn = document.getElementById('loginBtn');
  registerUsername = document.getElementById('registerUsername');
  registerPassword = document.getElementById('registerPassword');
  registerBtn = document.getElementById('registerBtn');
  logoutBtn = document.getElementById('logoutBtn');

  // Main App Elements
  messageInput = document.getElementById('messageInput');
  sendBtn = document.getElementById('sendBtn');
  messagesDiv = document.getElementById('messages');
  usernameInput = document.getElementById('usernameInput');
  imageInput = document.getElementById('imageInput');
  uploadImageBtn = document.getElementById('uploadImageBtn');

  newContactInput = document.getElementById('newContactInput'); // Tidak digunakan lagi, tapi biarkan
  addContactBtn = document.getElementById('addContactBtn'); // Digunakan untuk menambah dari hasil pencarian
  contactsList = document.getElementById('contactsList');
  chatHeader = document.getElementById('chatHeader');
  chatArea = document.getElementById('chatArea');
  chatFooter = document.getElementById('chatFooter');
  chatTitle = document.getElementById('chatTitle');

  searchUserInput = document.getElementById('searchUserInput');
  searchUserBtn = document.getElementById('searchUserBtn');
  searchResults = document.getElementById('searchResults');

  authScreen = document.getElementById('authScreen');
  mainApp = document.getElementById('mainApp');

  // Check if elements exist before adding listeners
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (registerBtn) registerBtn.addEventListener('click', handleRegister);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Tidak menggunakan tombol tambah kontak lama
  // if (addContactBtn) addContactBtn.addEventListener('click', addContact);
  if (searchUserBtn) searchUserBtn.addEventListener('click', searchUser);
  if (searchUserInput) searchUserInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchUser();
  });

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => imageInput.click());
  if (imageInput) imageInput.addEventListener('change', sendImage);

  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    messageInput.addEventListener('blur', cancelReply); // Cancel reply when user clicks outside input
  }
});
