// Firebase Configuration and Helper Functions
const firebaseConfig = {
  apiKey: "AIzaSyBppPEZ0dSEqMQlPDyvaZb5luol51_7qNM",
  authDomain: "gtm-management-6350e.firebaseapp.com",
  databaseURL: "https://gtm-management-6350e-default-rtdb.firebaseio.com/",
  projectId: "gtm-management-6350e",
  storageBucket: "gtm-management-6350e.firebasestorage.app",
  messagingSenderId: "461806742170",
  appId: "1:461806742170:web:9a2af43d50c0a26718cd23",
  measurementId: "G-7LDECSVCGD"
};

// Initialize Firebase
let db = null;
let syncEnabled = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded');
      return false;
    }
    
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    db = firebase.database();
    syncEnabled = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    syncEnabled = false;
    return false;
  }
}

// Generic sync functions
function syncToFirebase(path, data) {
  if (!syncEnabled || !db) {
    console.log('Firebase sync disabled, using localStorage only');
    return Promise.resolve();
  }
  
  console.log(`Syncing to Firebase: ${path}, items: ${Array.isArray(data) ? data.length : 'N/A'}`);
  
  return db.ref(path).set(data)
    .then(() => {
      console.log(`✓ Successfully synced to Firebase: ${path}`);
    })
    .catch((error) => {
      console.error(`✗ Firebase sync error for ${path}:`, error);
      alert('Warning: Failed to sync to cloud. Changes saved locally only.');
    });
}

function syncFromFirebase(path) {
  if (!syncEnabled || !db) {
    return Promise.resolve(null);
  }
  
  return db.ref(path).once('value')
    .then((snapshot) => {
      return snapshot.val();
    })
    .catch((error) => {
      console.error(`Firebase read error for ${path}:`, error);
      return null;
    });
}

function listenToFirebase(path, callback) {
  if (!syncEnabled || !db) {
    return null;
  }
  
  const ref = db.ref(path);
  ref.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
  
  return ref; // Return reference so it can be unsubscribed later
}

// Courses sync functions
function saveCourses(courses) {
  localStorage.setItem('courses', JSON.stringify(courses || []));
  syncToFirebase('courses', courses || []);
}

function getCourses() {
  try {
    const raw = localStorage.getItem('courses');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse courses from localStorage', err);
    return [];
  }
}

async function loadCoursesFromFirebase() {
  const data = await syncFromFirebase('courses');
  if (data && Array.isArray(data)) {
    localStorage.setItem('courses', JSON.stringify(data));
    return data;
  }
  return getCourses();
}

// Players sync functions
function savePlayers(players) {
  localStorage.setItem('players', JSON.stringify(players || []));
  syncToFirebase('players', players || []);
}

function getPlayers() {
  try {
    const raw = localStorage.getItem('players');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse players from localStorage', err);
    return [];
  }
}

async function loadPlayersFromFirebase() {
  const data = await syncFromFirebase('players');
  if (data && Array.isArray(data)) {
    localStorage.setItem('players', JSON.stringify(data));
    return data;
  }
  return getPlayers();
}

// Tournaments sync functions
function saveTournaments(tournaments) {
  localStorage.setItem('tournaments', JSON.stringify(tournaments || []));
  syncToFirebase('tournaments', tournaments || []);
}

function getTournaments() {
  try {
    const raw = localStorage.getItem('tournaments');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse tournaments from localStorage', err);
    return [];
  }
}

async function loadTournamentsFromFirebase() {
  const data = await syncFromFirebase('tournaments');
  if (data && Array.isArray(data)) {
    localStorage.setItem('tournaments', JSON.stringify(data));
    return data;
  }
  return getTournaments();
}

// Current User sync functions
function saveCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
  // Note: currentUser is device-specific, usually not synced to Firebase
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse currentUser from localStorage', err);
    return null;
  }
}

// Initialize Firebase on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initFirebase();
  });
}
