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



// Admitted Players sync functions
async function loadAdmittedPlayersFromFirebase() {
  const firebaseData = await syncFromFirebase('admittedPlayers');
  let localData = {};
  try {
    localData = JSON.parse(localStorage.getItem('admittedPlayers') || '{}');
  } catch (err) {
    localData = {};
  }
  
  if (firebaseData && typeof firebaseData === 'object') {
    // Smart merge: keep data from both sources
    const mergedData = { ...localData };
    
    for (const roundId in firebaseData) {
      if (!mergedData[roundId] || mergedData[roundId].length === 0) {
        mergedData[roundId] = firebaseData[roundId];
      } else if (firebaseData[roundId] && firebaseData[roundId].length > mergedData[roundId].length) {
        mergedData[roundId] = firebaseData[roundId];
      }
    }
    
    localStorage.setItem('admittedPlayers', JSON.stringify(mergedData));
    
    // Sync back if local had more data
    const localRounds = Object.keys(localData);
    const firebaseRounds = Object.keys(firebaseData);
    const missingInFirebase = localRounds.filter(r => !firebaseRounds.includes(r));
    if (missingInFirebase.length > 0) {
      syncToFirebase('admittedPlayers', mergedData);
    }
    
    return mergedData;
  }
  
  return localData;
}

// Scores sync functions
function saveScoresToFirebase(scores) {
  localStorage.setItem('scores', JSON.stringify(scores || {}));
  syncToFirebase('scores', scores || {});
}

function getScoresFromStorage() {
  try {
    const raw = localStorage.getItem('scores');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to parse scores from localStorage', err);
    return {};
  }
}

async function loadScoresFromFirebase() {
  const firebaseData = await syncFromFirebase('scores');
  const localData = getScoresFromStorage();
  
  // Smart merge: keep data from both sources
  if (firebaseData && typeof firebaseData === 'object') {
    const mergedData = { ...localData };
    
    // Add/update rounds from Firebase
    for (const roundId in firebaseData) {
      if (!mergedData[roundId]) {
        // Round doesn't exist locally, add it
        mergedData[roundId] = firebaseData[roundId];
      } else {
        // Round exists in both - merge players, keeping the one with more scores
        const localRound = mergedData[roundId];
        const firebaseRound = firebaseData[roundId];
        
        for (const playerId in firebaseRound) {
          if (!localRound[playerId]) {
            localRound[playerId] = firebaseRound[playerId];
          } else {
            // Both have this player - keep the one with more filled holes
            const localHoles = (localRound[playerId].holes || []).filter(h => h !== '' && h !== null).length;
            const firebaseHoles = (firebaseRound[playerId].holes || []).filter(h => h !== '' && h !== null).length;
            if (firebaseHoles > localHoles) {
              localRound[playerId] = firebaseRound[playerId];
            }
          }
        }
      }
    }
    
    // Save merged data back to both localStorage and Firebase
    localStorage.setItem('scores', JSON.stringify(mergedData));
    
    // Check if we have local data that Firebase doesn't have
    const localRounds = Object.keys(localData);
    const firebaseRounds = Object.keys(firebaseData);
    const missingInFirebase = localRounds.filter(r => !firebaseRounds.includes(r));
    
    if (missingInFirebase.length > 0) {
      console.log('Found local scores not in Firebase:', missingInFirebase);
      // Sync merged data back to Firebase
      syncToFirebase('scores', mergedData);
    }
    
    return mergedData;
  }
  
  return localData;
}

// Draws sync functions
function saveDrawsToFirebase(draws) {
  localStorage.setItem('draws', JSON.stringify(draws || {}));
  syncToFirebase('draws', draws || {});
}

async function loadDrawsFromFirebase() {
  const data = await syncFromFirebase('draws');
  if (data && typeof data === 'object') {
    localStorage.setItem('draws', JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(localStorage.getItem('draws') || '{}');
  } catch (err) {
    return {};
  }
}

// Admitted Players save function
function saveAdmittedPlayersToFirebase(admittedPlayers) {
  localStorage.setItem('admittedPlayers', JSON.stringify(admittedPlayers || {}));
  syncToFirebase('admittedPlayers', admittedPlayers || {});
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
  let courses = [], players = [], tournaments = [], scores = {}, draws = {}, admittedPlayers = {};
  try { courses = JSON.parse(localStorage.getItem('courses') || '[]'); } catch(e) {}
  try { players = JSON.parse(localStorage.getItem('players') || '[]'); } catch(e) {}
  try { tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]'); } catch(e) {}
  try { scores = JSON.parse(localStorage.getItem('scores') || '{}'); } catch(e) {}
  try { draws = JSON.parse(localStorage.getItem('draws') || '{}'); } catch(e) {}
  try { admittedPlayers = JSON.parse(localStorage.getItem('admittedPlayers') || '{}'); } catch(e) {}
  
  return Promise.all([
    syncToFirebase('courses', courses),
    syncToFirebase('players', players),
    syncToFirebase('tournaments', tournaments),
    syncToFirebase('scores', scores),
    syncToFirebase('draws', draws),
    syncToFirebase('admittedPlayers', admittedPlayers)
  ])
  .then(() => {
    console.log('✓ Full sync completed');
    const scoreCount = Object.keys(scores).length;
    alert(`Synced to cloud:\n${courses.length} courses\n${players.length} players\n${tournaments.length} tournaments\n${scoreCount} score records`);
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
    loadTournamentsFromFirebase(),
    loadScoresFromFirebase(),
    loadDrawsFromFirebase(),
    loadAdmittedPlayersFromFirebase()
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
