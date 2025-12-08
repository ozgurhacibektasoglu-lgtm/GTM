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

// Courses sync functions - used by courses pages
function saveCoursesToStorage(courses) {
  localStorage.setItem('courses', JSON.stringify(courses || []));
  syncToFirebase('courses', courses || []);
}

function getCoursesFromStorage() {
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
  return getCoursesFromStorage();
}

// Players sync functions - used by players pages
function savePlayersToStorage(players) {
  localStorage.setItem('players', JSON.stringify(players || []));
  syncToFirebase('players', players || []);
}

function getPlayersFromStorage() {
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
  return getPlayersFromStorage();
}

// Tournaments sync functions - used by tournaments pages
function saveTournamentsToStorage(tournaments) {
  localStorage.setItem('tournaments', JSON.stringify(tournaments || []));
  syncToFirebase('tournaments', tournaments || []);
}

function getTournamentsFromStorage() {
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
  return getTournamentsFromStorage();
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

// Manual sync all data to Firebase
function syncAllToFirebase() {
  if (!syncEnabled || !db) {
    alert('Firebase is not connected. Please refresh the page.');
    return Promise.resolve();
  }

  console.log('Starting full sync to Firebase...');
  
  // Read directly from localStorage
  let courses = [], players = [], tournaments = [];
  try { courses = JSON.parse(localStorage.getItem('courses') || '[]'); } catch(e) {}
  try { players = JSON.parse(localStorage.getItem('players') || '[]'); } catch(e) {}
  try { tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]'); } catch(e) {}
  
  return Promise.all([
    syncToFirebase('courses', courses),
    syncToFirebase('players', players),
    syncToFirebase('tournaments', tournaments)
  ])
  .then(() => {
    console.log('✓ Full sync completed');
    alert(`Synced to cloud:\n${courses.length} courses\n${players.length} players\n${tournaments.length} tournaments`);
  })
  .catch((error) => {
    console.error('Sync failed:', error);
    alert('Sync failed: ' + error.message);
  });
}

// Load all data from Firebase
function loadAllFromFirebase() {
  if (!syncEnabled || !db) {
    console.log('Firebase not available for loading');
    return Promise.resolve();
  }

  console.log('Loading all data from Firebase...');
  
  return Promise.all([
    loadCoursesFromFirebase(),
    loadPlayersFromFirebase(),
    loadTournamentsFromFirebase()
  ])
  .then(() => {
    console.log('✓ All data loaded from Firebase');
    window.location.reload();
  })
  .catch((error) => {
    console.error('Load failed:', error);
    alert('Failed to load from cloud: ' + error.message);
  });
}

// Initialize Firebase on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initFirebase();
  });
}
