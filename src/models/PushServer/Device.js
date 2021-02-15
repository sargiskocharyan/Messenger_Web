const mongoose = require('mongoose');

const pushNotifier = require('../../notifications/pushNotifications/PushNotifier');

const deviceSchema = new mongoose.Schema({
    deviceUUID: {
        type: String,
        required: true
    },
    deviceId : {
        type: String
    },
    deviceIdVoIP: {
        type: String
    },
    platform : {
        type: String,
        required: true,
        enum: ['ios', 'android']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
},
{
    timestamps: true
})

deviceSchema.methods.sendPushNotification = function (type = "message", obj) {
    const device = this
    if (device.platform == "android") {
        pushNotifier.sendAndroid([device.deviceId], type, obj);
    } else {
        let token = type != "call" ? device.deviceId : device.deviceIdVoIP;
        pushNotifier.sendiOS(token, type, obj);
        // if (type != "call") {
        //     console.log(obj);
        //     pushNotifier.sendiOS(device.deviceId, type, obj);
        // } else {
        //     console.log(`Device.js : enter : iOS send VoIP!`)
        //     pushNotifier.sendiOS(device.deviceIdVoIP, type, obj);
        // }
    }
}

const Device = mongoose.model('Device', deviceSchema)

module.exports = Device