const gcm = require('node-gcm');

const fcmAPIKey = process.env.FCM_API_KEY


const androidNotifier = {
    sendNotification(devices, type, obj) {
        console.log(obj.badge);
        const options = {
            notification : {
                body : obj.message,
                title : obj.title,
                sound: 'default',
                badge: obj.badge ? obj.badge: 0,
                type: obj.type ? obj.type : null,
                image: obj.image ? obj.image : null,
                messageId: obj.messageId,
                chatId: obj.chatId
            }
        };
        const optionsCall = {
            /*notification : {
                body : "CALL!!!!",
                title : `Caller: ${obj.username} \nroomName ${obj.roomName}`,
                sound: 'default',
                //image: "https://storage.googleapis.com/download/storage/v1/b/dynamic-messenger-images/o/dero1995e5280b.png?generation=1596461660399442&alt=media"
            },*/
            android: {
                'direct_boot_ok': true,
                priority: "high",
                "ttl":0,
                'intent':'fullscreen'
                /*notification: {
                    'click_action':'.userCalls.CallRoomActivity'
                }*/
            },
            data: {
                id: obj.caller,
                roomName: obj.roomName,
                type: obj.type,
                image: obj.image ? obj.image : null
            },
            priority: "high"
        }
        let message; 
        if (type == "call") {//
            message = new gcm.Message(optionsCall);
        } else {
            message = new gcm.Message(options);
        }
        let sender = new gcm.Sender(fcmAPIKey);
    //dXyFQajST2ygAB-u3qZY-D:APA91bEU9f5oHegor1iJWQoiovPSUZOf9AI0uQ56g_3TCwz9UGkVQgv40tX-6q0EdCiClLKjfiBVe7plFwEGBn34CMUmIi2ikv5_mU5pd0439PpwaQ8koK1-I8cE1M8jAP5UGY3XPAUs
        sender.send(message, {
            registrationTokens : devices
        }, function(err, response) {
            if (err) {
                console.error(err);
            } else {
                console.log(`androidConfig.js : ${devices[0]}`)
                console.log(response);
            }
        });
    }
}

module.exports = androidNotifier