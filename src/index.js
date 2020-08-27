const http = require('http')
const fs = require('fs')
const socketio = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('./models/Users/User')
const Chat = require('./models/Chat/Chat')
//const Room = require('./models/Chat/Room')
const Message = require('./models/Chat/Message')
const Call = require('./models/Calls/Call')

const onlineUsers = require('./utils/onlineUsers')
const deviceManager = require('./utils/deviceManager')

//const generateMessage = require('./utils/messages')


//const middlewareSocket = require('socketio-wildcard')();

const app = require('./app')
const port = process.env.PORT
process.on('warning', e => console.warn(e.stack));
//console.log(`ownCertificate - ${process.env.OWN_CERTIFICATE}`)
//added start
const httpServer = require('https');
var server;
if (process.env.OWN_CERTIFICATE == "true") {
    var config = {
        sslKey: "./src/ssl/key.p12",
        sslCert: "./src/ssl/server.pem",
        sslCabundle: ""
    };
    var options = {
        key: null,
        cert: null,
        ca: null
    };

    var pfx = false;

    if (!fs.existsSync(config.sslKey)) {
        console.log('sslKey:\t ' + config.sslKey + ' does not exist.');
    } else {
        pfx = config.sslKey.indexOf('.p12') !== -1;
        options.key = fs.readFileSync(config.sslKey);
    }

    if (!fs.existsSync(config.sslCert)) {
        console.log('sslCert:\t ' + config.sslCert + ' does not exist.');
    } else {
        options.cert = fs.readFileSync(config.sslCert);
    }

    if (config.sslCabundle) {
        if (!fs.existsSync(config.sslCabundle)) {
            console.log('sslCabundle:\t ' + config.sslCabundle + ' does not exist.');
        }

        options.ca = fs.readFileSync(config.sslCabundle);
    }

    if (pfx === true) {
        options = {
            pfx: fs.readFileSync(config.sslKey),
            passphrase:"dynamiC2020"
        };
    }

    server = httpServer.createServer(options, app);
} else {
    server = http.createServer(app)
}

    
//added end

//const server = http.createServer(app)
const io = socketio(server, {path: '/socket.io'});
//io.sockets.setMaxListeners(99);

//io.use(middlewareSocket)
var candidates = {};//{userId:[socket.id, roomName]}
var socketIdUserId = {};//{socket.id:userId}
var callRooms = {};//Call._id:Call
var reconnectingUsers = {};//{userId:roomName}
//var onlineUsers = new Set();
// function myFunc(arg) {
//    console.log(`arg was => ${arg}`);
// }
  
  

io.on('connection', async (socket) => {
    console.log('New Socket connection');
    const used = process.memoryUsage();
    for (let key in used) {
    console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
    try {
        var condMobile = true;
        var token;
        var deviceId = null;
        var platform = null;
        if (socket.handshake.query.token) {
            token = socket.handshake.query.token;
            deviceId = socket.handshake.query.deviceId;
            platform = socket.handshake.query.platform;
            //console.log(token)
        } else if (socket.handshake.headers.cookie) {
            condMobile = false;
            //socket.emit('Error', 'Not authenticated')
            arrCookie = socket.handshake.headers.cookie.match(new RegExp('(^| )' + 'auth_token' + '=([^;]+)'));
            token = arrCookie == null ? null : arrCookie[2]
        } else {
            socket.emit('Error', 'Not authenticated')
            throw new Error('Token not exists!')
        }
        // socket.conn.on('packet', function (packet) {
        //     if (packet.type === 'ping') console.log('received ping');
        // });
          
        // socket.conn.on('packetCreate', function (packet) {
        // if (packet.type === 'pong') console.log('sending pong');
        // });

        const decoded = jwt.verify(token, process.env.JWT_SECRET) 
        const user = await User.findOne({_id: decoded._id}).orFail(new Error('Invalid token!'))
        console.log("index.js");
        await user.populate({
            path: 'tokens',
            match: {token}
        }).execPopulate()
        if (user.tokens.length < 1) {
            throw new Error('Token not exists!')
        }
        if (!onlineUsers.findUser(user._id.toString())) {
            onlineUsers.addUser(user._id.toString());
        }
        
        socketIdUserId[socket.id] = user._id.toString()
        console.log(user.email)
        console.log(user._id.toString());
        // if (condMobile) {
        //     socket.join(user.userRoom)
        // } else {
        //     socket.on('join', (callback) => {
        //         socket.join(user.userRoom)
        //         console.log('join')
        //         callback()
        //     })
        // }
        socket.join(user.userRoom);
        
        socket.on("call", async (recipientId, type, callback) => {
            console.log("call");
            console.log(`${user.username} -> ${recipientId}`);//check recipient id
            //console.log(Object.keys(socket.rooms));
            //var room = io.sockets.adapter.rooms[];//Object.keys(socket.rooms)[1]
            // console.log(room);
            // console.log(room.length)
            
            const userId = user._id.toString();
            const name = userId < recipientId ? userId + recipientId : recipientId + userId
            const path =  userId > recipientId ?  'chats2' : 'chats'
            await user.populate({
                path,
                match: {name}
            }).execPopulate()
            //console.log(user[path])
            //console.log(message)
            let chat = user[path][0];
            if (!chat) {
                if (userId < recipientId) {
                    chat = new Chat({name: userId + recipientId, owner: userId, ownerOther: recipientId, statuses:[{userId}, {userId: recipientId}]});
                } else {
                    chat = new Chat({name: recipientId + userId, owner: recipientId, ownerOther: userId, statuses:[{userId}, {userId: recipientId}]});
                }
            }
            const call = new Call({callSuggestTime: new Date(), caller: user._id, receiver: recipientId, participants:[user._id.toString(), recipientId],type})
            console.log(`Created new Call : `)//${call}
            const messageObj = new Message({senderId: user._id.toString(), reciever: recipientId, owner: chat._id, type: 'call', call: {callSuggestTime:call.callSuggestTime, type:call.type}})
            call.message = messageObj._id
            chat.messages = chat.messages.concat({message:messageObj._id})
            // deviceManager.sendPushNotification(recipientId, 'call', {
            //     caller: user._id.toString(),
            //     roomName: call._id.toString(),
            //     username: user.username,
            //     image: user.avatar ? user.avatar.avatarURL : null,
            //     name: user.name
            // });
            if (onlineUsers.findUser(recipientId)) {
                if (!candidates[user._id.toString()] && !candidates[recipientId]) {
                    candidates[user._id.toString()] = [socket.id, call._id.toString()];
                    socket.join(candidates[user._id.toString()][1]);
                    //console.log(`callback : ${callback}`)
                    if (callback) {
                        console.log('callback exists')
                        callback(candidates[user._id.toString()][1])
                    }
                    callRooms[call._id.toString()] = call;
                    candidates[recipientId] = ["none", call._id.toString()];
                    //avelacnel candidates 2rd koxmin???
                    io.to(recipientId).emit('call', {
                        caller: user._id.toString(),
                        roomName: call._id.toString(),
                        type: type,
                        username: user.username,
                        image: user.avatar ? user.avatar.avatarURL : null,
                        name: user.name
                    })
                    //console.log(user)//user._id.toString(), call._id.toString(), user.username, user.avatar ? user.avatar.avatarURL : null);
                    console.log(`Call via socket to user with id : ${recipientId}`);
                } else {
                    call.status = 'missed';
                    console.log('onCall : one of users in call now.');
                    socket.emit('callAccepted', false, call._id.toString(), "One of users in call now");
                    const recipientUser = await User.findById(recipientId)
                    recipientUser.missedCallHistory = recipientUser.missedCallHistory.concat(call._id.toString())
                    const missedCall = recipientUser.missedCallHistory
                    deviceManager.sendPushNotification(recipientId, 'message', {
                        type: 'missedCallHistory',
                        username: user.username,
                        image: user.avatar ? user.avatar.avatarURL : null,
                        badge: missedCall.length,
                        //missedCall: missedCall,
                        title: 'You have missed call.'
                    });
                    await recipientUser.save();
                }
            } else {
                const count = deviceManager.sendPushNotification(recipientId, 'call', {
                    caller: user._id.toString(),
                    roomName: call._id.toString(),
                    type: type,
                    username: user.username,
                    image: user.avatar ? user.avatar.avatarURL : null,
                    name: user.name
                });
                if (count == 0) {
                    call.status = 'missed';
                    console.log('onCall : other side is offline.');
                    socket.emit('callAccepted', false, call._id.toString(), 'Other side is offline');
                } else {//???
                    candidates[user._id.toString()] = [socket.id, call._id.toString()];
                    socket.join(candidates[user._id.toString()][1]);
                    console.log(`callback : ${callback}`)
                    if (callback) {
                        console.log('callback');
                        callback(candidates[user._id.toString()][1]);
                    }
                    callRooms[call._id.toString()] = call;
                    candidates[recipientId] = ["none", call._id.toString()];
                }
            }
            messageObj.call.status = call.status;
            await Promise.all([messageObj.save(), chat.save(), call.save()]);
            if (call.status != "ongoing" && call.participants.length > 0) {
                call.participants.forEach((participant) => {
                    const messageToSend = messageObj.toObject();
                    messageToSend.call = call.toObject();
                    messageToSend.senderUsername = user.username;
                    messageToSend.senderLastname = user.lastname;
                    io.to(participant).emit('message', messageToSend);
                })
            }
        })

        socket.on("callAccepted", async (recipientId, accept, roomName = "") => {
            console.log(`callAccepted  ${recipientId} : ${accept}`);
            console.log(`${user.username} -> ${recipientId}`);
            //console.log(candidates[recipientId])

            socket.broadcast.to(user._id.toString()).emit('callSessionEnded', roomName);//poxel
            if (candidates[recipientId] && candidates[recipientId][1] && candidates[socketIdUserId[socket.id]] && candidates[socketIdUserId[socket.id]][0] == "none") {
                const roomCandidates = candidates[recipientId][1];
                var room = io.sockets.adapter.rooms[roomCandidates];

                if (room) {
                    console.log(`room clients - ${room.length}`)
                    console.log(room)
                }
                
                if (roomCandidates) {
                    const call = callRooms[roomCandidates];
                    if (!call) {
                        call = await Call.findById(roomCandidates);
                        callRooms[roomCandidates] = call;
                    }
                    if (accept == true) {
                        socket.join(roomCandidates);
                        candidates[socketIdUserId[socket.id]] = [socket.id, roomCandidates]
                        socket.broadcast.to(roomCandidates).emit('callAccepted', accept, roomCandidates);
                    } else {
                        console.log('callAccepted : kameta')
                        candidates[socketIdUserId[socket.id]] = undefined;
                        candidates[recipientId] = undefined;
                        callRooms[roomCandidates] = undefined;
                        io.to(roomCandidates).emit('callAccepted', accept, roomCandidates, 'Other side cancel your call.');
                    }
                    
                    call.status = accept ? 'ongoing' : 'cancelled';   
                    const message = await Message.findById(call.message);
                    message.call.status = call.status;
                    await Promise.all([call.save(), message.save()])
                    if (call.status == "cancelled") {
                        if (call.participants.length > 0) {
                            call.participants.forEach((participant) => {
                                const messageToSend = message.toObject();
                                messageToSend.call = call.toObject();
                                messageToSend.senderUsername = user.username;
                                messageToSend.senderName = user.name;
                                messageToSend.senderLastname = user.lastname;
                                io.to(participant).emit('message', messageToSend)
                            })
                        }
                    }
                }
            }
        })

        socket.on("offer", async (roomCandidates, data) => {
            console.log(`offer ->`);
            //console.log(`${user.username} -> ${roomCandidates}`);
            //console.log(data);
            socket.broadcast.to(roomCandidates).emit("offer", roomCandidates, data);
        })

        socket.on("answer", (roomCandidates, data) => {
            console.log(`answer - ${data}`);
            //console.log(`${user.username} -> ${roomCandidates}`);
            //console.log(data);
            socket.broadcast.to(roomCandidates).emit('answer', data);
            
        })

        socket.on('candidates', (roomCandidates, candidate) => {
            //console.log(roomCandidates);
            //console.log(JSON.stringify(candidate));
            socket.broadcast.to(roomCandidates).emit('candidates', candidate);
        })

        socket.on('callStarted', async (roomName) => {
            console.log(`callStarted : ${user.email} : ${roomName}`)
            
            let call = callRooms[roomName]
            if (!call) {
                call = await Call.findById(roomName);
                callRooms[roomCandidates] = call
            }
            if (call.status != 'accepted') {
                call.status = 'accepted';
                console.log(`callStarted :  ${roomName}`)
                call.callStartTime = new Date();
                const message = await Message.findById(call.message);
                message.call.status = 'accepted';
                await Promise.all([call.save(), message.save()])
            }
        })

        socket.on('reconnectCallRoom', (roomName) => {
            const userID = socketIdUserId[socket.id] 
            if (reconnectingUsers[userID] && reconnectingUsers[userID] == roomName && callRooms[roomName]) {
                console.log(`reconecting: ${user.email}`)
                reconnectingUsers[userID] = null;
                candidates[userID] = [socket.id, roomName];
                console.log('MTAV STEX!!!')
                socket.join(roomName);//stugel...
            } 
        })
        
        socket.on('leaveRoom', async (roomName) => {
            console.log("leave!!!")
            console.log(`${roomName} : ${user.email}`);
            const dateEnd = new Date();
            socket.broadcast.to(roomName).emit('callEnded', roomName);
            var room = io.sockets.adapter.rooms[roomName];
            console.log(room),
            console.log(socket.rooms)
            if (room) {
                console.log(`Count of clients in room before leave: ${room.length}`);
                let socketIds = Object.keys(room.sockets);
                socketIds.forEach((idSocket) => {
                    let socketConnected = io.sockets.connected[idSocket];
                    socketConnected.leave(roomName);
                    candidates[socketIdUserId[idSocket]] = undefined//??
                })
                console.log(`room: ${room}`)
                console.log(`Count of clients in room after leave: ${room.length}`);
                let call = callRooms[roomName]
                if (!call) {
                    call = await Call.findById(roomName);
                }
                const message = await Message.findById(call.message);
                if (call.status == 'accepted' && call.callStartTime) {
                    call.callEndTime = dateEnd;
                    const duration = call.callStartTime ? dateEnd - call.callStartTime : 0;
                    message.call.duration = Math.abs(duration) / 1000;
                } else if (call.status == 'ongoing') {
                    call.status = 'missed';
                    //...
                    console.log('arifureta')
                    message.call.status = call.status;
                    if (call.participants.length > 1) {
                        call.participants.forEach(async (participant) => {
                            candidates[participant] = undefined;
                            if (participant != user._id.toString()) {
                                console.log('uxarkec callSessionEnded -> leaveRoom')
                                //deviceManager.sendPushNotification(participant, 'message', {message:`You have missed call from ${user.username}`, image: user.avatar ? user.avatar.avatarURL : null});
                                io.to(participant).emit('callSessionEnded', call._id.toString());
                                const recipientUser = await User.findById(participant);
                                recipientUser.missedCallHistory = recipientUser.missedCallHistory.concat(call._id.toString())
                                const missedCall = recipientUser.missedCallHistory
                                deviceManager.sendPushNotification(participant, 'message', {
                                    type: 'missedCallHistory',
                                    username: user.username,
                                    image: user.avatar ? user.avatar.avatarURL : null,
                                    badge: missedCall.length,
                                    //missedCall: missedCall,
                                    title: 'You have missed call.'
                                });
                                await recipientUser.save();
                            }
                        })
                    }
                }
                await Promise.all([call.save(), message.save()])
                if (call.participants.length > 0) {
                    call.participants.forEach((participant) => {
                        const messageToSend = message.toObject();
                        messageToSend.call = call.toObject();
                        messageToSend.call.duration = message.call.duration
                        messageToSend.senderUsername = user.username;
                        messageToSend.senderName = user.name;
                        messageToSend.senderLastname = user.lastname;
                        console.log(participant, 'sended call message');
                        io.to(participant).emit('message', messageToSend)
                    })
                }
            }
        })

        socket.on('messageTest', (message) => {
            console.log(message)
            socket.emit('message2', "Your message received!")
        })

        socket.on('sendMessage', async (message, chatId , callback = null) => {
            console.log(`message - ${message}`)
            if (message && message != "") {
                const name = user._id.toString() < chatId ? user._id.toString() + chatId : chatId + user._id.toString()
                const path =  user._id.toString() > chatId ?  'chats2' : 'chats'
                await user.populate({
                    path,
                    match: {name}
                }).execPopulate()
                //console.log(`userPath: ${user[path]}`)
                //console.log(message)
                const chat = user[path][0];
                console.log(`chat id - ${chat._id}`);
                //await user[path][0].populate('room').execPopulate()
                //const room = user[path][0].room
                const messageObj = new Message({senderId: user._id.toString(), reciever: chatId, owner: chat._id, text: message})
                //console.log(messageObj)
                
                //console.log(messageObj)
                chat.messages = chat.messages.concat({message:messageObj._id});
                await Promise.all([messageObj.save(), chat.save()]);  
                const messageToSend = messageObj.toObject()
                messageToSend.senderUsername = user.username;
                messageToSend.senderName = user.name;
                messageToSend.senderLastname = user.lastname;
                //const newObj ={};// {senderUsername: user.username, senderName: user.name, senderLastname: user.lastname};
                
                //console.log(`newObject : ${JSON.stringify(newObj)}`)
                //Object.assign({senderUsername: user.username, senderName: user.name, senderLastname: user.lastname},messageObj);
                //console.log(user);
                //console.log(`socket send message : ${JSON.stringify(messageToSend)}`)
                if (user._id.toString() !== chatId) {
                    //const userTo = await User.findById(chatId)
                    //io.to(chatId).emit('message', messageToSend)
                    if (!onlineUsers.findUser(chatId)) {
                        //console.log(user.avatar.avatarURL);
                        console.log(`sendMessage : sendPushNotification : ${user._id.toString()} : user.email.`)
                        deviceManager.sendPushNotification(chatId, 'message', {type: 'message', messageId: messageObj._id.toString(), chatId: user._id.toString(), title: 'You have new message.', message: message, username: user.username, image: user.avatar ? user.avatar.avatarURL : null});
                    } else {
                        io.to(chatId).emit('message', messageToSend);
                        console.log('hataptux');
                    }
                    //generateMessage(user._id.toString(), chatId, user.name, message)
                }
                io.to(user.userRoom).emit('message', messageToSend)
                if (!condMobile) {
                    callback()
                }
                
            }
                //console.log(user.userRoom)
            //console.log(`anun: ${user.name}`)
            
        })

        socket.on('messageReceived', async (chatId, messageId) => {
            console.log(`messageReceived : ${chatId} : ${user.email}`);
            const name = user._id.toString() < chatId ? user._id.toString() + chatId : chatId + user._id.toString();
            const path =  user._id.toString() > chatId ?  'chats2' : 'chats';
            
            const [_ , message] = await Promise.all([user.populate({
                path,
                match: {name}
            }).execPopulate(), Message.findById(messageId)]);
            const chat = user[path][0];
            console.log(`messageReceived : chat id - ${chat._id}`);
            const updated = await chat.updateStatuses(user._id.toString(), message, 'receivedMessageDate');
            if (updated) {
                const otherUser = user._id.toString() < chatId ? 'ownerOther' : 'owner';
                console.log(`messageReceived : user to send : ${chat[otherUser]}`);
                io.to(chat[otherUser]).emit('messageReceived', message.createdAt, user._id.toString())
            }
        })

        socket.on('messageRead', async (chatId, messageId) => {
            const name = user._id.toString() < chatId ? user._id.toString() + chatId : chatId + user._id.toString()
            const path =  user._id.toString() > chatId ?  'chats2' : 'chats'
            const [_ , message] = await Promise.all([user.populate({
                path,
                match: {name}
            }).execPopulate(), Message.findById(messageId)]);
            const chat = user[path][0];
            console.log(`messageRead : chat id - ${chat._id}`);
            const updated = await chat.updateStatuses(user._id.toString(), message, 'readMessageDate');
            if (updated) {
                const otherUser = user._id.toString() < chatId ? 'ownerOther' : 'owner';
                io.to(chat[otherUser]).emit('messageRead', message.createdAt, user._id.toString());
            }
        })

        socket.on('messageTyping', (chatId) => {//chatId = userId(recipient)
            io.to(chatId).emit('messageTyping', user._id.toString());
            //console.log(`socket : messageTyping, from : ${user.email} to ${chatId}`);
        })

        // socket.on('*', (a) => {
        //     console.log("Esim inch")
        // })

        socket.on('disconnect', async () => {
            console.log(user.email)
            console.log("disconnect!")
            // if (deviceId) {
            //     deviceManager.removeDevice(deviceId);
            // }
            if (!io.sockets.adapter.rooms[user._id.toString()]) {
                await onlineUsers.removeUser(user._id.toString());
            }
            console.log("online users : ")
            console.log(onlineUsers.users)
            
            const userId = socketIdUserId[socket.id];
            socketIdUserId[socket.id] = null;
            if (candidates[userId] && candidates[userId][0] == socket.id) {
                reconnectingUsers[userId] = candidates[userId][1]
                if (!io.sockets.adapter.rooms[candidates[userId][1]]) {
                    let call = callRooms[candidates[userId][1]];
                    if (!call) {
                        call = await Call.findById(candidates[userId][1]);
                    }
                    if (call.status == 'ongoing' && userId == call.caller) {
                        candidates[userId] = undefined;
                        call.status = 'missed';
                        const message = await Message.findById(call.message);
                        message.call.status = call.status;
                        if (call.participants.length > 1) {
                            call.participants.forEach((participant) => {
                                if (participant != call.userId) {
                                    io.to(participant).emit('callSessionEnded', call._id.toString());
                                }
                            })
                        }
                        await Promise.all([call.save(), message.save()])
                        if (call.participants.length > 0) {
                            call.participants.forEach((participant) => {
                                const messageToSend = message.toObject();
                                messageToSend.call = call.toObject();
                                messageToSend.call.duration = message.call.duration;
                                messageToSend.senderUsername = user.username;
                                messageToSend.senderName = user.name;
                                messageToSend.senderLastname = user.lastname;
                                io.to(participant).emit('message', messageToSend)
                            })
                        }
                    } else {
                        /*setTimeout(async () => { //jnjel
                            console.log(`1 after 10 seconds of disconnect : ${reconnectingUsers[userId]}`);
                            if (reconnectingUsers[userId]) {
                                console.log('Chpetqa mtni.. ette connecta exel 1')
                                if (!io.sockets.adapter.rooms[candidates[userId][1]]) {
                                    callRooms[candidates[userId][1]] = undefined;
                                    if (!call.callEndTime && call.callStartTime && call.status == 'accepted') {
                                        call.callEndTime = new Date();
                                        const message = await Message.findById(call.message);
                                        message.call.duration = Math.abs(call.callEndTime - call.callStartTime) / 1000;
                                        await Promise.all([call.save(), message.save()])
                                        if (call.participants.length > 0) {
                                            call.participants.forEach((participant) => {
                                                const messageToSend = message.toObject();
                                                messageToSend.call = call.toObject();
                                                messageToSend.call.duration = message.call.duration
                                                messageToSend.senderUsername = user.username;
                                                messageToSend.senderName = user.name;
                                                messageToSend.senderLastname = user.lastname;
                                                io.to(participant).emit('message', messageToSend)
                                            })
                                        }
                                    }
                                }
                                candidates[userId] = undefined;
                                reconnectingUsers[userId] = undefined;
                            }
                        }, 10000);*/
                    }
                } else {
                    /*setTimeout(() => { //jnjel
                        console.log(`2 after 10 seconds of disconnect : ${reconnectingUsers[userId]}`);
                        if (reconnectingUsers[userId]) {
                            console.log('Chpetqa mtni.. ette connecta exel')
                            candidates[userId] = undefined;
                            reconnectingUsers[userId] = undefined;
                        }
                    }, 10000);*/
                    //candidates[userId] = undefined;
                }
            }
        })
    } catch (e) { 
        console.log("Error disconnect");
        console.log(e.message);
        socket.disconnect();
    }


})

// setTimeout(() => { //jnjel

// }, 1740000);
 
server.listen(port, () => {
    console.log('Server is up on port: ' + port)
})
