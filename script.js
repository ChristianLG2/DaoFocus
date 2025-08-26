// Focus Task Manager - Firebase Integration
// Handles user authentication, task management, and Pomodoro timer.

let tasks = [];
let currentUser = null;
let pomodoroInterval = null;
const activeTimers = {};

import firebaseConfig from './firebase-config.js';
firebase.initializeApp(firebaseConfig);


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Dark Mode Initialization
const darkToggle = document.getElementById("darkModeToggle");
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
  darkToggle.checked = true;
}

darkToggle.addEventListener("change", () => {
  if (darkToggle.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("darkMode", "true");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("darkMode", "false");
  }
});

// Auth State
auth.onAuthStateChanged(user => {
  const authPanel = document.getElementById("auth");
  const appContainer = document.getElementById("appContainer");
  const taskForm = document.getElementById("taskForm");
  const userEmail = document.getElementById("userEmail");

  if (user) {
    currentUser = user;
    userEmail.innerText = `👤 ${user.email}`;
    appContainer.style.display = "block";
    authPanel.style.display = "flex";
    taskForm.style.display = "flex";
    setupTaskListener(user.uid);
  } else {
    currentUser = null;
    userEmail.innerText = "Not signed in";
    appContainer.style.display = "none";
    taskForm.style.display = "none";
    document.getElementById("tasksContainer").innerHTML = "";
  }
});

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

function logout() {
  auth.signOut();
}

function setupTaskListener(uid) {
  db.collection("tasks")
    .where("uid", "==", uid)
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      tasks = [];
      snapshot.forEach(doc => {
        const task = doc.data();
        task.id = doc.id;
        tasks.push(task);
      });
      renderTasks();
    });
}

document.getElementById("taskForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("taskPriority").value;
  const text = input.value.trim();

  try {
    if (!text || !currentUser) throw new Error("Task text or user not valid");
    await db.collection("tasks").add({
      text,
      priority,
      uid: currentUser.uid,
      completed: false,
      timestamp: new Date()
    });
    input.value = "";
    Toastify({
      text: "✅ Task added!",
      duration: 2000,
      gravity: "top",
      position: "right",
      backgroundColor: "#4CAF50"
    }).showToast();
  } catch (err) {
    Toastify({
      text: err.message,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#f44336"
    }).showToast();
  }
});

async function renderTasks() {
  const container = document.getElementById("tasksContainer");
  container.innerHTML = "";
  if (!currentUser) return;

  try {
    const snapshot = await db.collection("tasks")
      .where("uid", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<p style="text-align:center;">No tasks yet. 🎉</p>';
      return;
    }

    snapshot.forEach(doc => {
      const task = doc.data();
      const el = document.createElement("div");
      el.className = "task";
      el.innerHTML = `
        <div>
          <div class="task-text">${task.text}</div>
          <div class="task-meta">
            <span class="task-priority">${task.priority}</span>
            <span class="task-timestamp">${new Date(task.timestamp.toDate()).toLocaleString()}</span>
          </div>
        </div>
        <div>
          <button onclick="toggleTaskById('${doc.id}')">${task.completed ? 'Undo' : '✅ Done'}</button>
          <button onclick="deleteTaskById('${doc.id}')">🗑 Delete</button>
        </div>
      `;
      container.appendChild(el);
    });
  } catch (err) {
    Toastify({
      text: `Error fetching tasks: ${err.message}`,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#f44336"
    }).showToast();
  }
}

async function toggleTaskById(taskId) {
  const ref = db.collection("tasks").doc(taskId);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data();
    await ref.update({ completed: !data.completed });
  }
}

async function deleteTaskById(taskId) {
  await db.collection("tasks").doc(taskId).delete();
}

// Pomodoro Timer
const startBtn = document.getElementById("startPomodoro");
const stopBtn = document.getElementById("stopPomodoro");

startBtn.addEventListener("click", () => startPomodoro(25 * 60));
stopBtn.addEventListener("click", () => {
  clearInterval(pomodoroInterval);
  document.getElementById("timer").textContent = "25:00";
});

function startPomodoro(duration) {
  clearInterval(pomodoroInterval);
  let remaining = duration;
  pomodoroInterval = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(pomodoroInterval);
      document.getElementById("pomodoro-sound").play();
      Toastify({
        text: "Pomodoro complete!",
        duration: 3000,
        gravity: "top",
        backgroundColor: "#2196f3"
      }).showToast();
      return;
    }
    const min = String(Math.floor(remaining / 60)).padStart(2, "0");
    const sec = String(remaining % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${min}:${sec}`;
    remaining--;
  }, 1000);
}

