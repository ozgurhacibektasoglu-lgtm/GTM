# Push Notification Setup Guide

This guide explains how to set up and deploy the push notification system for the GTM iOS app.

## 📋 Overview

The system sends push notifications to players when:
1. **Initial Draw List Publication** - All players in the draw receive a notification
2. **Draw List Updates** - Only players whose tee time or starting tee changed receive a notification

## 🏗️ Architecture

### Components:
1. **Cloud Functions** (`functions/index.js`) - Monitors Firebase database for draw list changes
2. **iOS App** - Registers for push notifications and handles incoming messages
3. **Web Admin** - Publishes draw lists which trigger notifications

### Data Flow:
```
Admin publishes draw → Firebase DB updated → Cloud Function triggered → 
→ Detects changes → Sends FCM notifications → iOS devices receive notifications
```

## 🚀 Setup Instructions

### 1. iOS App Setup

#### A. Enable Push Notifications Capability
1. Open Xcode project: `GTM-Mobile/GTM-APP/GTM-APP.xcodeproj`
2. Select your app target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" and check "Remote notifications"

#### B. Add Firebase Cloud Messaging
The necessary code has already been added to:
- `FirebaseManager.swift` - Handles FCM token registration
- `GTM_APPApp.swift` - Sets up notification delegates
- `NotificationManager.swift` - Handles notification navigation

#### C. Update Info.plist
Add the following keys to enable notifications:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

#### D. Install Firebase Messaging Package
In Xcode:
1. File → Add Packages
2. Enter: `https://github.com/firebase/firebase-ios-sdk`
3. Select version 10.0.0 or later
4. Add these libraries:
   - FirebaseMessaging
   - FirebaseDatabase (if not already added)

### 2. Firebase Console Setup

#### A. Enable Cloud Messaging
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `gtm-management-6350e`
3. Project Settings → Cloud Messaging
4. Note your Server Key (you won't need it for FCM v1, but keep it for reference)

#### B. Add iOS App to Firebase (if not already done)
1. Project Settings → Your apps
2. Click iOS icon to add iOS app
3. Bundle ID: Match your Xcode project's bundle identifier
4. Download `GoogleService-Info.plist`
5. Add it to your Xcode project (replace existing if needed)

#### C. Upload APNs Authentication Key
1. In Firebase Console → Project Settings → Cloud Messaging → iOS app configuration
2. Click "Upload" under APNs Authentication Key
3. You'll need to create this in Apple Developer Portal:
   - Go to [Apple Developer](https://developer.apple.com)
   - Certificates, Identifiers & Profiles
   - Keys → Create a new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the .p8 file
   - Upload to Firebase along with Key ID and Team ID

### 3. Deploy Cloud Functions

#### A. Install Dependencies
```bash
cd /Users/ozgur/Desktop/GTM-DEV/functions
npm install
```

#### B. Test Locally (Optional)
```bash
# Start Firebase emulator
firebase emulators:start --only functions

# In another terminal, you can trigger test notifications
curl "http://localhost:5001/gtm-management-6350e/us-central1/testNotification?regNo=10"
```

#### C. Deploy to Firebase
```bash
# From the project root directory
cd /Users/ozgur/Desktop/GTM-DEV
firebase deploy --only functions
```

This will deploy:
- `notifyDrawListUpdate` - Automatic trigger when draw lists change
- `testNotification` - HTTP function for testing

#### D. Set Up Firebase Database Rules
Make sure your Firebase Realtime Database rules allow the Cloud Function to read player tokens:

```json
{
  "rules": {
    "draws": {
      ".read": true,
      ".write": "auth != null"
    },
    "tournaments": {
      ".read": true,
      ".write": "auth != null"
    },
    "playerTokens": {
      "$regNo": {
        ".read": "auth != null",
        ".write": "auth != null || auth.uid == $regNo"
      }
    },
    "notificationHistory": {
      ".read": "auth != null",
      ".write": true
    }
  }
}
```

### 4. Testing

#### A. Test FCM Token Registration
1. Build and run the iOS app on a real device (push notifications don't work in simulator)
2. Log in with a player account (e.g., reg no: 10)
3. Check Firebase Realtime Database → `playerTokens/10`
4. You should see:
   ```json
   {
     "fcmToken": "long-token-string",
     "platform": "ios",
     "lastUpdated": 1234567890,
     "regNo": "10"
   }
   ```

#### B. Test Manual Notification
Use the HTTP test function:
```bash
# Replace 10 with actual registration number
curl "https://us-central1-gtm-management-6350e.cloudfunctions.net/testNotification?regNo=10"
```

You should receive a test notification on the device.

#### C. Test Draw List Publication
1. Log into web admin
2. Go to a tournament
3. Create/update a draw list
4. Click "Publish Draw List"
5. Players in the draw should receive notifications within seconds

#### D. Test Draw List Updates
1. Publish a draw list (players receive initial notifications)
2. Make changes (e.g., change tee time for one group)
3. Publish again
4. Only affected players should receive update notifications

### 5. Monitoring

#### A. View Cloud Function Logs
```bash
firebase functions:log
```

Or in Firebase Console:
- Functions → Logs tab

#### B. View Notification History
Check Firebase Realtime Database → `notificationHistory`

Each notification batch is logged with:
- Timestamp
- Tournament name
- Number of recipients
- Type (initial_publish or update)

#### C. Debug Tips
- Check Xcode console for FCM token registration logs
- Look for "📱 FCM Token:" in device logs
- Cloud Function logs show which players were notified
- Failed tokens are automatically removed

## 🔧 Troubleshooting

### Issue: No notifications received

**Check:**
1. ✅ Push notification capability enabled in Xcode
2. ✅ APNs key uploaded to Firebase
3. ✅ App built on real device (not simulator)
4. ✅ User granted notification permission
5. ✅ FCM token saved in Firebase database
6. ✅ Cloud Functions deployed successfully
7. ✅ Draw list has `publishedAt` timestamp

### Issue: All players notified on small changes

**Check:**
1. ✅ Cloud Function is comparing before/after correctly
2. ✅ Look at Cloud Function logs to see detected changes
3. ✅ Verify `publishedAt` exists in previous draw data

### Issue: Token registration fails

**Check:**
1. ✅ GoogleService-Info.plist is in Xcode project
2. ✅ Bundle ID matches Firebase configuration
3. ✅ FirebaseMessaging package is installed
4. ✅ User is logged in before token registration

## 📱 iOS App Notification Handling

When a user taps a notification:
1. App opens (or comes to foreground)
2. `NotificationManager` receives navigation event
3. User can be directed to the draw list page

To implement navigation in your app, observe the `NotificationManager.shared.shouldNavigateToDrawList` property.

## 🔐 Security Notes

1. **FCM Tokens** - Stored per player, automatically cleaned up if invalid
2. **Database Rules** - Only authenticated users can write tokens
3. **Cloud Functions** - Run with admin privileges, handle errors gracefully
4. **No Personal Data** - Notifications only contain tournament info and player's own tee time

## 💰 Cost Considerations

- **FCM** - Free for unlimited notifications
- **Cloud Functions** - Free tier: 2M invocations/month (more than enough for this use case)
- **Database Reads** - Minimal (only reads player tokens and draw data)

## 🎯 Future Enhancements

Potential improvements:
- Add notification preferences (allow players to opt out)
- Send reminder notifications (e.g., 1 hour before tee time)
- Notify players of score updates
- Add notification for tournament results
- Support for multiple devices per player

## 📞 Support

If you encounter issues:
1. Check Firebase Console logs
2. Review Xcode device logs
3. Verify all setup steps completed
4. Test with the manual test function first
