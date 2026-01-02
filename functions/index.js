const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function to send push notifications when draw list is published or updated
 * 
 * Triggers on: /draws/{roundId} write
 * 
 * Logic:
 * 1. On initial publish: Send notification to all players in the draw
 * 2. On subsequent updates: Only notify players whose tee time or starting tee changed
 */
exports.notifyDrawListUpdate = functions.database.ref('/draws/{roundId}')
  .onWrite(async (change, context) => {
    try {
      const roundId = context.params.roundId;
      const beforeData = change.before.val();
      const afterData = change.after.val();

      // If draw was deleted, don't send notifications
      if (!afterData) {
        console.log(`Draw ${roundId} was deleted, skipping notifications`);
        return null;
      }

      // Get tournament info
      const tournamentId = roundId.split('_round_')[0];
      const tournamentSnapshot = await admin.database().ref(`tournaments/${tournamentId}`).once('value');
      const tournament = tournamentSnapshot.val();

      if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`);
        return null;
      }

      const tournamentName = tournament.name || 'Tournament';
      
      // Determine if this is initial publish or an update
      const isInitialPublish = !beforeData || !beforeData.publishedAt;
      
      console.log(`Draw list ${isInitialPublish ? 'published' : 'updated'} for round ${roundId}`);

      let playersToNotify = [];

      if (isInitialPublish) {
        // Initial publish: Notify all players in the draw
        playersToNotify = extractAllPlayers(afterData);
        console.log(`Initial publish: Notifying ${playersToNotify.length} players`);
      } else {
        // Update: Only notify players whose details changed
        playersToNotify = findChangedPlayers(beforeData, afterData);
        console.log(`Update detected: Notifying ${playersToNotify.length} players with changes`);
      }

      if (playersToNotify.length === 0) {
        console.log('No players to notify');
        return null;
      }

      // Get FCM tokens for these players
      const notifications = [];
      for (const playerInfo of playersToNotify) {
        const regNo = playerInfo.reg || playerInfo.regNo;
        if (!regNo) continue;

        // Get player's FCM token from database
        const tokenSnapshot = await admin.database().ref(`playerTokens/${regNo}`).once('value');
        const tokenData = tokenSnapshot.val();
        
        if (!tokenData || !tokenData.fcmToken) {
          console.log(`No FCM token found for player ${regNo}`);
          continue;
        }

        // Prepare notification message
        const message = {
          token: tokenData.fcmToken,
          notification: {
            title: `Draw List ${isInitialPublish ? 'Published' : 'Updated'}`,
            body: `${tournamentName}: You tee off from ${playerInfo.startingTee || 'TBA'} at ${playerInfo.teeTime || 'TBA'}. Tap to view full draw list.`
          },
          data: {
            type: 'draw_list_update',
            tournamentId: tournamentId,
            roundId: roundId,
            regNo: regNo.toString(),
            startingTee: (playerInfo.startingTee || '').toString(),
            teeTime: (playerInfo.teeTime || '').toString(),
            isUpdate: (!isInitialPublish).toString()
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        };

        notifications.push(message);
      }

      // Send notifications in batches
      if (notifications.length > 0) {
        console.log(`Sending ${notifications.length} notifications...`);
        
        // Firebase messaging can send up to 500 messages at once
        const batchSize = 500;
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize);
          
          try {
            const response = await admin.messaging().sendAll(batch);
            console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${response.successCount} successful, ${response.failureCount} failed`);
            
            // Handle failed tokens (remove invalid ones)
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const error = resp.error;
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                  // Remove invalid token
                  const playerInfo = playersToNotify[i + idx];
                  const regNo = playerInfo.reg || playerInfo.regNo;
                  if (regNo) {
                    admin.database().ref(`playerTokens/${regNo}`).remove();
                    console.log(`Removed invalid token for player ${regNo}`);
                  }
                }
              }
            });
          } catch (error) {
            console.error('Error sending notification batch:', error);
          }
        }
      }

      // Store notification history
      const notificationRecord = {
        roundId: roundId,
        tournamentId: tournamentId,
        tournamentName: tournamentName,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        type: isInitialPublish ? 'initial_publish' : 'update',
        recipientCount: notifications.length,
        playerCount: playersToNotify.length
      };

      await admin.database().ref('notificationHistory').push(notificationRecord);

      return null;
    } catch (error) {
      console.error('Error in notifyDrawListUpdate:', error);
      return null;
    }
  });

/**
 * Extract all players from draw data
 */
function extractAllPlayers(drawData) {
  const players = [];
  
  if (!drawData || !drawData.groups) {
    return players;
  }

  drawData.groups.forEach(group => {
    if (!group.players) return;
    
    group.players.forEach(player => {
      players.push({
        reg: player.reg || player.regNo,
        regNo: player.reg || player.regNo,
        name: player.name || '',
        startingTee: group.startingTee || group.tee || 'TBA',
        teeTime: group.teeTime || group.time || 'TBA'
      });
    });
  });

  return players;
}

/**
 * Find players whose tee time or starting tee changed
 */
function findChangedPlayers(beforeData, afterData) {
  const changedPlayers = [];
  
  if (!afterData || !afterData.groups) {
    return changedPlayers;
  }

  // Build a map of players from before state
  const beforePlayers = new Map();
  if (beforeData && beforeData.groups) {
    beforeData.groups.forEach(group => {
      if (!group.players) return;
      
      group.players.forEach(player => {
        const regNo = player.reg || player.regNo;
        if (regNo) {
          beforePlayers.set(regNo.toString(), {
            startingTee: group.startingTee || group.tee || 'TBA',
            teeTime: group.teeTime || group.time || 'TBA'
          });
        }
      });
    });
  }

  // Compare with after state
  afterData.groups.forEach(group => {
    if (!group.players) return;
    
    group.players.forEach(player => {
      const regNo = player.reg || player.regNo;
      if (!regNo) return;
      
      const regNoStr = regNo.toString();
      const currentTee = group.startingTee || group.tee || 'TBA';
      const currentTime = group.teeTime || group.time || 'TBA';
      
      const beforeInfo = beforePlayers.get(regNoStr);
      
      // Player is new or their tee/time changed
      if (!beforeInfo || 
          beforeInfo.startingTee !== currentTee || 
          beforeInfo.teeTime !== currentTime) {
        
        changedPlayers.push({
          reg: regNo,
          regNo: regNo,
          name: player.name || '',
          startingTee: currentTee,
          teeTime: currentTime
        });
      }
    });
  });

  return changedPlayers;
}

/**
 * HTTP function to manually test notifications (for debugging)
 */
exports.testNotification = functions.https.onRequest(async (req, res) => {
  try {
    const regNo = req.query.regNo;
    
    if (!regNo) {
      res.status(400).send('Missing regNo parameter');
      return;
    }

    const tokenSnapshot = await admin.database().ref(`playerTokens/${regNo}`).once('value');
    const tokenData = tokenSnapshot.val();
    
    if (!tokenData || !tokenData.fcmToken) {
      res.status(404).send(`No FCM token found for player ${regNo}`);
      return;
    }

    const message = {
      token: tokenData.fcmToken,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from GTM'
      },
      data: {
        type: 'test'
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
