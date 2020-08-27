const androidNotifier = require('./androidConfig');
const iosNotifier = require('./iosConfig');

const pushNotifier = {
    sendAndroid(devices, type = "message", obj) {
        androidNotifier.sendNotification(devices, type, obj);
    },
    sendiOS(deviceId, type = "message", obj) {
        iosNotifier.sendNotification(deviceId, type, obj)
    },
    sendWeb() {}
}

module.exports = pushNotifier