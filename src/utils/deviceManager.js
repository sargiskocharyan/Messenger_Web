const Device = require('../models/PushServer/Device');
//const pushNotifier = require('../notifications/pushNotifications/PushNotifier')

const deviceManager = {
    devices: new Set(),
    findDevice(id) {
        //console.log(`findUser: ${id} - ${this.users.has(id)}`)
        return this.devices.has(id)
    },
    async userDeviceExisting(userId) {
        
    },
    async addDevice(deviceId, userId, platform) {
        try {
            const device = await Device.findOne({deviceId, userId, platform});
            if (!device) {
                device = new Device({deviceId, userId, platform});
                await device.save()
            }
            this.devices.add(deviceId)
        } catch (e) {
            console.log(`Error : deviceManager.addDevice : ${e.message}`)
        }
    },
    removeDevice(deviceId) {
        this.devices.delete(deviceId);
    },
    async sendPushNotification(userId, type, obj) {
        try {
            console.log("userid is ", userId);
            console.log(`deviceManager.sendPushNotification() : ${userId} \n${obj.image}`)
            const devices= await Device.find({userId}).orFail(new Error('No device found.'));
            if (devices && devices.length > 0) {
                devices.forEach((device) => {
                    device.sendPushNotification(type, obj)
                })
                return devices.length;
            } else return 0;
        } catch (e) {
            console.log(`Error : deviceManager.sendPushNotification : ${e.message}`)
            return 0;
        }
    }
};

module.exports = deviceManager