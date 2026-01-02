# Testing Push Notifications Without Apple Developer Program

This guide shows you how to test and verify the push notification system is working, even without the APNs key. When you get the Apple Developer Program, everything will work immediately.

## ✅ What Works Now (Without APNs Key)

1. **iOS app builds and runs** ✓
2. **FCM token registration** ✓
3. **Token saves to Firebase** ✓
4. **Cloud Functions detect draw changes** ✓
5. **Cloud Functions trigger** ✓
6. **Notification logic executes** ✓

## ❌ What Doesn't Work Yet

- **Actual notification delivery to device** (needs APNs key)

But you can verify everything else is working!

---

## 📱 Step 1: Build & Run iOS App

### In Xcode:

1. **Open the project:**
   ```bash
   open /Users/ozgur/Desktop/GTM-DEV/GTM-Mobile/GTM-APP/GTM-APP.xcodeproj
   ```

2. **Connect your iPhone/iPad** via USB

3. **Select your device** from the device dropdown (top toolbar)

4. **Trust your Apple ID for development:**
   - Xcode → Preferences → Accounts
   - Add your free Apple ID if not added
   - Click "Download Manual Profiles"

5. **Fix signing if needed:**
   - Select GTM-APP target
   - Signing & Capabilities tab
   - Team: Select your Apple ID
   - Automatically manage signing: ✓ Checked

6. **Build and Run** (⌘R or click Play button)
   - First time: "Could not launch app" - Click OK
   - On your device: Settings → General → VPN & Device Management
   - Trust your developer account
   - Run again in Xcode

### Expected Result:
- App installs and launches on device
- You see the login screen

---

## 🔑 Step 2: Test Login & Token Registration

### In the App:

1. **Login with a test player account**
   - Reg No: (use an existing player number, e.g., 10)
   - Password: (the password you set for that player)

2. **Check Xcode Console Output**

Look for these messages:
```
📱 FCM Token: [long token string]
✅ FCM token saved successfully for player 10
```

If you see these, **token registration is working!** ✓

---

## 🔥 Step 3: Verify Token in Firebase

1. Go to Firebase Console:
   ```
   https://console.firebase.google.com/project/gtm-management-6350e/database
   ```

2. Navigate to: `playerTokens/{your-reg-no}`

3. You should see:
   ```json
   {
     "fcmToken": "long-token-string...",
     "platform": "ios",
     "lastUpdated": 1735332000000,
     "regNo": "10"
   }
   ```

**If you see this data, the app is successfully registering! ✓**

---

## 🎯 Step 4: Test Cloud Functions (Without Actual Notification)

### Check Functions Deployed:

```bash
firebase functions:list
```

You should see:
- `notifyDrawListUpdate(us-central1)`
- `testNotification(us-central1)`

### Trigger Draw List Change:

1. **Go to web admin** (your tournament management system)

2. **Open a tournament** with some players

3. **Go to Draw page** and create/update a draw

4. **Publish the draw**

5. **Check Cloud Function Logs:**
   ```bash
   firebase functions:log --only notifyDrawListUpdate
   ```

Look for:
```
Draw list published for round {roundId}
Initial publish: Notifying X players
Sending X notifications...
```

**If you see these logs, the Cloud Function is working! ✓**

The function is trying to send notifications, they just won't be delivered until you add the APNs key.

---

## 📊 Step 5: Verify Notification History

In Firebase Console → Database → `notificationHistory`

You should see records like:
```json
{
  "roundId": "T0001_R1",
  "tournamentName": "Test Tournament",
  "timestamp": 1735332000000,
  "type": "initial_publish",
  "recipientCount": 12,
  "playerCount": 12
}
```

This proves the system is detecting changes and attempting to send notifications!

---

## 🧪 Step 6: Test Update Logic (Smart Notifications)

### Test that only affected players get notified:

1. **Publish a draw** (all players notified - check logs)

2. **Make a small change:**
   - Change tee time for ONE group (e.g., from 08:00 to 08:30)
   - Don't change other groups

3. **Publish again**

4. **Check Cloud Function logs:**
   ```bash
   firebase functions:log --only notifyDrawListUpdate --limit 20
   ```

You should see:
```
Update detected: Notifying 3 players with changes
```

Only the players in the changed group are notified! ✓

---

## ✨ When You Get Apple Developer Program

Once you enroll ($99/year):

### 1. Create APNs Key
- Go to: https://developer.apple.com/account/resources/authkeys/list
- Create new key with "Apple Push Notifications service (APNs)"
- Download `.p8` file
- Note Key ID and Team ID

### 2. Upload to Firebase
- Go to: https://console.firebase.google.com/project/gtm-management-6350e/settings/cloudmessaging/ios
- Click on `com.ozgur.gtm` app
- Upload APNs Authentication Key
- Enter Key ID and Team ID

### 3. Test Real Notifications
- Publish a draw list
- **You'll receive actual push notifications on your device!** 🎉

---

## 🐛 Troubleshooting

### Token Not Appearing in Console?

Check:
- Device is connected and running the app
- You're logged in as a player
- Xcode console is showing app output
- Check for any error messages in red

### Cloud Function Not Triggering?

Check:
- Draw was actually published (check Firebase Database → draws/{roundId})
- `publishedAt` timestamp exists in the draw data
- Cloud Functions are deployed: `firebase functions:list`

### Token Saved But No Logs?

Check:
- You published the draw AFTER logging in
- The player is in the draw list
- Cloud Function logs: `firebase functions:log`

---

## 📝 Summary Checklist

Before you get Apple Developer Program, verify:

- [ ] iOS app builds and runs on real device
- [ ] Can log in with player account
- [ ] FCM token appears in Xcode console
- [ ] Token saves to Firebase Database (`playerTokens/{regNo}`)
- [ ] Cloud Functions are deployed
- [ ] Publishing draw triggers Cloud Function
- [ ] Notification history records are created
- [ ] Only changed players are notified on updates

Once all ✓, you're **100% ready** for APNs key!

When you add the APNs key, notifications will start working **immediately** - no code changes needed!

---

## 🎯 Next Steps

1. Test everything on this list
2. When ready, enroll in Apple Developer Program
3. Upload APNs key to Firebase
4. Enjoy automatic push notifications! 🚀
