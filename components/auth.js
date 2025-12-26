// Simple auth helper wrapping Firebase Auth + Firestore roles
(function(){
  // Ensure Firebase is initialized with the correct config (including databaseURL)
  // The databaseURL must be set before initializeApp for the database SDK to use the correct region
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  const app = firebase.app();
  const auth = firebase.auth();
  const db = firebase.firestore();

  async function signIn(email, password){
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    return user;
  }

  // New: Sign in with username by querying Firestore for the user's email
  async function signInWithUsername(username, password){
    console.log('signInWithUsername called with:', username);
    try {
      // Try to find user with exact loginName first (for admin/club users)
      console.log('Querying Firestore for loginName:', username);
      let snapshot = await db.collection('users').where('loginName', '==', username).limit(1).get();
      console.log('First query complete, empty:', snapshot.empty);
      
      // If not found, try uppercase (for player users with P-prefix reg numbers)
      if (snapshot.empty) {
        console.log('Trying uppercase:', username.toUpperCase());
        snapshot = await db.collection('users').where('loginName', '==', username.toUpperCase()).limit(1).get();
        console.log('Second query complete, empty:', snapshot.empty);
      }
      
      if (snapshot.empty) {
        throw new Error('User not found');
      }
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      console.log('Found user document');
      
      // Use authEmail if available (for new signup system), otherwise fall back to email
      const authEmail = userData.authEmail || userData.email;
      
      if (!authEmail) {
        throw new Error('User profile incomplete');
      }
      // Sign in with the authentication email and provided password
      console.log('Attempting Firebase Auth sign in...');
      const { user } = await auth.signInWithEmailAndPassword(authEmail, password);
      console.log('Sign in successful');
      return user;
    } catch(e) {
      console.error('signInWithUsername error:', e);
      throw new Error(e.message || 'Login failed');
    }
  }

  async function signOut(){
    await auth.signOut();
  }

  function onAuthStateChanged(cb){
    return auth.onAuthStateChanged(cb);
  }

  async function getUserRole(){
    const user = auth.currentUser;
    if (!user) return null;
    
    // Add timeout for Firestore queries (Safari can hang)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore timeout')), 15000);
    });
    
    try {
      const doc = await Promise.race([
        db.collection('users').doc(user.uid).get(),
        timeoutPromise
      ]);
      const data = doc.exists ? doc.data() : null;
      return data?.role || 'user';
    } catch (e) {
      console.warn('getUserRole error:', e.message);
      return 'user'; // Default to user role on error
    }
  }

  async function getUserProfile(){
    const user = auth.currentUser;
    if (!user) return null;
    
    // Add timeout for Firestore queries (Safari can hang)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore timeout')), 15000);
    });
    
    try {
      const doc = await Promise.race([
        db.collection('users').doc(user.uid).get(),
        timeoutPromise
      ]);
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.warn('getUserProfile error:', e.message);
      return null;
    }
  }

  async function requireAuth(requiredRole){
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      // Add timeout for Safari - if auth state doesn't fire in 20 seconds, redirect to login
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('Auth state timeout - redirecting to login');
          window.location.href = '/auth/login.html';
        }
      }, 20000);
      
      const unsub = auth.onAuthStateChanged(async (user) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        
        if (!user) {
          unsub();
          window.location.href = '/auth/login.html';
          return;
        }
        let role = 'user';
        try { 
          role = await getUserRole(); 
        } catch(e){
          console.warn('getUserRole error:', e.message);
        }
        if (requiredRole && role !== requiredRole){
          unsub();
          reject(new Error('Insufficient permissions'));
          return;
        }
        unsub();
        resolve({ user, role });
      });
    });
  }

  // ========== SIGNUP FUNCTIONS ==========
  
  // Find player by registration number - checks Firebase first, then localStorage
  async function findPlayerByRegNumber(regNumber) {
    try {
      let firebasePlayer = null;
      let localPlayer = null;
      
      // Try Firebase Realtime Database FIRST (most up-to-date)
      // Use global db from firebase-config.js if available, or firebase.database()
      const rtdb = window.db || (typeof firebase !== 'undefined' && firebase.apps.length > 0 
        ? firebase.database()
        : null);
      
      if (rtdb) {
        try {
          // Try exact key match first (e.g., "P4626")
          console.log('Looking up Firebase path: players/' + regNumber.toUpperCase());
          let snapshot = await rtdb.ref(`players/${regNumber.toUpperCase()}`).once('value');
          firebasePlayer = snapshot.val();
          
          // If not found, try getting all players and searching
          if (!firebasePlayer) {
            console.log('Not found by key, searching all players...');
            snapshot = await rtdb.ref('players').once('value');
            const allPlayers = snapshot.val();
            if (allPlayers) {
              console.log('Firebase players keys:', Object.keys(allPlayers).slice(0, 10));
              // Search through all players
              for (const key of Object.keys(allPlayers)) {
                const p = allPlayers[key];
                if (p && p.reg && p.reg.toUpperCase() === regNumber.toUpperCase()) {
                  firebasePlayer = p;
                  console.log('Found player by searching, key was:', key);
                  break;
                }
              }
            }
          }
          
          if (firebasePlayer) {
            console.log('Found player in Firebase:', firebasePlayer);
            console.log('Firebase player keys:', Object.keys(firebasePlayer));
          } else {
            console.log('Player NOT found in Firebase');
          }
        } catch (fbError) {
          console.warn('Firebase lookup failed:', fbError);
        }
      }
      
      // Also check localStorage
      const playersRaw = localStorage.getItem('players');
      if (playersRaw) {
        const players = JSON.parse(playersRaw);
        localPlayer = players.find(p => p.reg && p.reg.toUpperCase() === regNumber.toUpperCase());
        if (localPlayer) {
          console.log('Found player in localStorage:', localPlayer);
          console.log('LocalStorage player keys:', Object.keys(localPlayer));
        }
      }
      
      // Prefer Firebase data, merge with localStorage if needed
      if (firebasePlayer) {
        // Merge: Firebase takes priority, but fill in any missing fields from localStorage
        if (localPlayer) {
          return { ...localPlayer, ...firebasePlayer };
        }
        return firebasePlayer;
      }
      
      // Fall back to localStorage only
      return localPlayer || null;
    } catch (error) {
      console.error('Error finding player:', error);
      return null;
    }
  }

  // Check if player already has a Firebase account
  async function checkPlayerHasAccount(regNumber) {
    try {
      // Check if user document exists in Firestore with this regNumber
      const snapshot = await db.collection('users')
        .where('playerRegNumber', '==', regNumber.toUpperCase())
        .limit(1)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking player account:', error);
      return false;
    }
  }

  // Generate and send verification code
  async function sendVerificationCode(regNumber, method, contact) {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in Firestore with expiration (5 minutes)
      const expiration = new Date(Date.now() + 5 * 60 * 1000);
      
      await db.collection('verificationCodes').doc(regNumber.toUpperCase()).set({
        code: code,
        method: method,
        contact: contact,
        expiration: expiration,
        createdAt: new Date()
      });

      // In a production environment, you would send actual email/SMS here
      // For now, we'll log it and show it in console
      console.log(`Verification code for ${regNumber}: ${code}`);
      console.log(`Would send to ${method}: ${contact}`);
      
      // For testing purposes, show the code in an alert
      // Remove this in production when you have actual email/SMS service
      alert(`TESTING MODE: Your verification code is: ${code}\n\nIn production, this will be sent to your ${method}.`);
      
      return code; // Return for testing purposes only
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Failed to send verification code');
    }
  }

  // Verify the code entered by user
  async function verifyCode(regNumber, enteredCode, storedCode) {
    try {
      // Get the stored code from Firestore
      const doc = await db.collection('verificationCodes').doc(regNumber.toUpperCase()).get();
      
      if (!doc.exists) {
        throw new Error('Verification code not found');
      }

      const data = doc.data();
      const expiration = data.expiration.toDate();
      
      // Check if code has expired
      if (new Date() > expiration) {
        throw new Error('Verification code has expired');
      }

      // Verify the code matches
      if (data.code !== enteredCode) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
    }
  }

  // Complete signup - create Firebase Auth account and user profile
  async function completeSignup(playerData, password, primaryContact) {
    try {
      // Always use registration number-based email for Firebase Auth
      // This ensures uniqueness based on reg number, not player's actual email
      // Players will login using their registration number, not email
      const authEmail = `${playerData.reg.toLowerCase()}@gtm.player.local`;

      // Create Firebase Auth user
      const { user } = await auth.createUserWithEmailAndPassword(authEmail, password);

      // Create user profile in Firestore
      await db.collection('users').doc(user.uid).set({
        email: playerData.email || null,
        mobile: playerData.mobile || null,
        loginName: playerData.reg.toUpperCase(),
        playerRegNumber: playerData.reg.toUpperCase(),
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        role: 'user',
        createdAt: new Date(),
        primaryContact: primaryContact,
        authEmail: authEmail,
        playerData: {
          homeClub: playerData.homeClub || null,
          hcp: playerData.hcp || null,
          gender: playerData.gender || null,
          nationality: playerData.nationality || null
        }
      });

      // Clean up verification code
      await db.collection('verificationCodes').doc(playerData.reg.toUpperCase()).delete();

      // Sign out immediately after creation so user can login normally
      await auth.signOut();

      return user;
    } catch (error) {
      console.error('Error completing signup:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this registration number already exists. Please use the login page.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    }
  }

  // Expose all functions
  window.Auth = { 
    signIn, 
    signInWithUsername, 
    signOut, 
    onAuthStateChanged, 
    getUserRole, 
    getUserProfile, 
    requireAuth,
    // Signup functions
    findPlayerByRegNumber,
    checkPlayerHasAccount,
    sendVerificationCode,
    verifyCode,
    completeSignup
  };
})();
