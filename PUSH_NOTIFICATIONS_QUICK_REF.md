# Push Notifications - Quick Reference

## 🚀 Quick Deploy Checklist

### 1. iOS App (Xcode)
- [ ] Add Push Notifications capability
- [ ] Add Background Modes → Remote notifications
- [ ] Install Firebase packages (FirebaseMessaging, FirebaseDatabase)
- [ ] Upload APNs key to Firebase Console
- [ ] Build on real device and test token registration

### 2. Firebase Cloud Functions
```bash
cd /Users/ozgur/Desktop/GTM-DEV/functions
npm install
cd ..
firebase deploy --only functions
```

### 3. Test
```bash
# Test notification for player with reg no 10
curl "https://us-central1-gtm-management-6350e.cloudfunctions.net/testNotification?regNo=10"
```

## 📋 How It Works

### Initial Publish
```
Admin clicks "Publish Draw List"
  ↓
Draw saved to Firebase with publishedAt timestamp
  ↓
Cloud Function detects NEW publish (no previous publishedAt)
  ↓
Extracts ALL players from draw
  ↓
Sends notifications to all players in draw list
```

### Update Publish
```
Admin updates draw and clicks "Publish Draw List" again
  ↓
Draw updated in Firebase with NEW publishedAt timestamp
  ↓
Cloud Function detects UPDATE (previous publishedAt exists)
  ↓
Compares before/after states for each player
  ↓
Identifies players with changed tee time or starting tee
  ↓
Sends notifications ONLY to affected players
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `functions/index.js` | Cloud Function that monitors draw changes and sends notifications |
| `FirebaseManager.swift` | Registers device for push, saves FCM token to Firebase |
| `GTM_APPApp.swift` | Sets up notification delegates |
| `NotificationManager.swift` | Handles notification taps and navigation |
| `draw_list.html` | Web admin page that publishes draw (already working, no changes needed) |

## 💾 Firebase Data Structure

```
Firebase Realtime Database
│
├── draws/
│   └── {roundId}/
│       ├── groups: [ ... ]
│       ├── publishedAt: "2025-12-27T10:30:00Z"  ← Triggers Cloud Function
│       └── settings: { ... }
│
├── playerTokens/
│   └── {regNo}/
│       ├── fcmToken: "device-token-here"
│       ├── platform: "ios"
│       ├── regNo: "10"
│       └── lastUpdated: 1234567890
│
└── notificationHistory/
    └── {pushId}/
        ├── roundId: "..."
        ├── tournamentName: "..."
        ├── timestamp: 1234567890
        ├── type: "initial_publish" | "update"
        └── recipientCount: 24
```

## 📱 Notification Content

### Initial Publish
```
Title: Draw List Published
Body: Tournament Name: You tee off from 1st Tee at 08:00. 
      Tap to view full draw list.
```

### Update
```
Title: Draw List Updated
Body: Tournament Name: You tee off from 10th Tee at 09:30. 
      Tap to view full draw list.
```

## 🧪 Testing Scenarios

### Scenario 1: First Publish
1. Create draw with 4 groups (12 players)
2. Click "Publish Draw List"
3. ✅ All 12 players receive notification
4. ✅ Check `notificationHistory` → type: "initial_publish", recipientCount: 12

### Scenario 2: Update Without Changes
1. Publish draw (players notified)
2. Click "Publish Draw List" again without changes
3. ✅ No players notified (no changes detected)

### Scenario 3: Update With Changes
1. Publish draw (players notified)
2. Change tee time for Group 2 (from 08:30 to 09:00)
3. Click "Publish Draw List"
4. ✅ Only Group 2 players (3 players) receive notification
5. ✅ Check logs → "Update detected: Notifying 3 players with changes"

### Scenario 4: Add New Players
1. Publish draw with 12 players
2. Add new group with 3 more players
3. Click "Publish Draw List"
4. ✅ Only new 3 players receive notification (they didn't exist before)

### Scenario 5: Change Starting Tee
1. Publish draw
2. Move Group 3 from "1st Tee" to "10th Tee"
3. Click "Publish Draw List"
4. ✅ Only Group 3 players receive notification

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| No notifications sent | Cloud Functions not deployed | Run `firebase deploy --only functions` |
| All players notified on update | publishedAt not in previous data | Ensure draw was published before (has publishedAt) |
| Token not saved | User not logged in | Login before registering for notifications |
| Notification not appearing | APNs key not uploaded | Upload APNs .p8 file to Firebase Console |
| "Invalid token" error | User uninstalled/reinstalled app | Token auto-removed, will re-register on next login |

## 📊 Monitoring Commands

```bash
# View Cloud Function logs
firebase functions:log

# View real-time logs
firebase functions:log --only notifyDrawListUpdate

# Check specific function
firebase functions:log --only testNotification
```

## 🔒 Security

- ✅ Only authenticated users can publish draws
- ✅ Cloud Function runs with admin privileges (secure)
- ✅ Invalid tokens automatically removed
- ✅ No sensitive player data in notifications
- ✅ Player tokens isolated by regNo

## 💡 Pro Tips

1. **Test on real device** - Simulators don't support push notifications
2. **Check FCM token** - Look in Firebase Database → playerTokens/{regNo}
3. **Use test function** - Easier to debug than full flow
4. **Monitor logs** - Cloud Function logs show exactly what's happening
5. **Batch testing** - Test with small draw first (2-3 players)

## 📞 Quick Troubleshooting

```bash
# Check if Cloud Functions deployed
firebase functions:list

# Test specific player notification
curl "https://us-central1-gtm-management-6350e.cloudfunctions.net/testNotification?regNo=YOUR_REG_NO"

# View latest logs
firebase functions:log --limit 50

# Check Firebase DB directly
# Go to: https://console.firebase.google.com/u/0/project/gtm-management-6350e/database
```
