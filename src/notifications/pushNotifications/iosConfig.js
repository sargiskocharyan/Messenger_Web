const  apn = require('apn');

const options = {
    "key": process.env.IOS_PUSH_NOTIFICATION_KEY_DEVELOP,
    "cert": process.env.IOS_PUSH_NOTIFICATION_CERT_DEVELOP
};

const optionsVoIP = {
    "cert": process.env.IOS_PUSH_NOTIFICATION_VOIP_CERT_DEVELOP,
    "key": process.env.IOS_PUSH_NOTIFICATION_VOIP_KEY_DEVELOP
};

const iosNotifier = {
    sendNotification(deviceId, type, obj) {
        if (type == "call") {
            console.log(`iosConfig : type: Call!`);
            const provider = new apn.Provider(optionsVoIP)
            let note = new apn.Notification();
            note.expiry = 0;//Math.floor(Date.now() / 1000) + 60;
            note.alert = `${obj.message} \n${obj.username}`;
            note.sound = "ping.aiff";
            note.payload = {
                'id': obj.caller,
                'roomName': obj.roomName,
                'username': obj.username,
                'img':obj.image,
                'type':obj.type
            };
            note.badge = 1;
            note.priority = 10;
            note.pushType = "alert";
            note.topic = "am.dynamic.method.voip";
            note.image = obj.image;
            provider.send(note, deviceId).then( (response) => {
                console.log(`iOS VoIP notification sended.\n${JSON.stringify(response)}`);
            });
        } else {
            console.log(`iosConfig: message type! ${obj.image} : ${obj.badge}`)
            const provider = new apn.Provider(options);
            let notification = new apn.Notification();
            notification.payload = {
                "imageURL": obj.image,
                "type": obj.type ? obj.type : null,
                'messageId': obj.messageId,
                'chatId': obj.chatId
            };
            notification.aps = {
                alert : {
                    title: obj.title,
                    subtitle: `From ${obj.username}`,
                    body: obj.message
                }
                //,"category" : 'new_rich_message'
            }
            notification.category = 'new_rich_message';
            notification.badge = obj.badge ? obj.badge : 0;
            notification.mutableContent = true;
            notification.contentAvailable = true;
            //notification.topic = "am.dynamic.method";
            //notification.imageUrl = img;
            provider.send(notification, deviceId).then( (response) => {
                console.log(`iOS notification sended.\n${JSON.stringify(response)}`);
            });
        }
    }
};

module.exports = iosNotifier