let socket = io();

//Elements
var $messageForm = null
var $messageFormInput = null
var $messageForButton = null
var $messages = null
const $allUsers = document.querySelector('#allUsers')
const $mainDiv = document.querySelector('#mainDiv')
const $chatSingle = document.querySelector('#chatSingle')
//Tempate
const messageTemplate = document.querySelector('#message-template').innerHTML
const chatTemplate = document.querySelector('#chat-template').innerHTML
const videoCallTamplate = document.querySelector('#video_call_tamplate').innerHTML
// const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
// const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

const allUsersTamplate = document.querySelector('#users-list-tamplate').innerHTML
const incomingVideo = document.querySelector('#video-incoming').innerHTML

var chatId = null
var roomName = null

$allUsers.addEventListener('click', () => {
    console.log("request");
    fetch('/users').then((response) => {
        response.json().then((data) => {
            if (data) {
                console.log(data);
                
            } 
            const html = Mustache.render(allUsersTamplate, {
                data
            })
            $mainDiv.innerHTML = html
            chatId = null
        })
    })
})

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild
 
    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    // Visible height
    const visibleHeight = $messages.offsetHeight
    // Height of messages container
    const containerHeight = $messages.scrollHeight
    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight
    if(Math.round(containerHeight - newMessageHeight - 1) <= Math.round(scrollOffset)){
        $messages.scrollTop = $messages.scrollHeight;
    }
}

function startChat(id) {
    console.log(`chat started! - id: ${id}`)
    fetch(`/chats/${id}`).then((response) => {
        response.json().then((data) => {
            
            chatId = id
            var html = Mustache.render(chatTemplate, {
                id
            })
            $mainDiv.innerHTML = html
            correctChat()
            if (data.length > 0) {
                for (i in data) {
                    
                    html = Mustache.render(messageTemplate, {
                        username: data[i].senderName,
                        message: data[i].text,
                        createdAt: moment(data[i].createdAt).format('h:mm:ss a')
                    })
                    $messages.insertAdjacentHTML('beforeend', html)
                }
                autoscroll()
            } else {
            }  
        })
    })
}

function sendPushNotification(userId) {
  //alert("send push");
  fetch('/sendpushnotification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({userId:userId})
  }).then((response) => {
    alert(JSON.stringify(response));
  })
}

function correctChat() {
    $messageForm = document.querySelector('#message-form')
    $messageFormInput = $messageForm.querySelector('input')
    $messageForButton = $messageForm.querySelector('button')
    $messages = document.querySelector('#messages')

    $messageForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        $messageForButton.setAttribute('disabled', 'disabled')
        
        const message = event.target.elements.message.value
        
        socket.emit('sendMessage', message, chatId, (error) => {
            $messageForButton.removeAttribute('disabled')
            $messageFormInput.value = ''
            $messageFormInput.focus()
            
            if (error) {
                return console.log(error)
            }
            console.log('The message was delivered!')
        })
    })
}

const startVideoCall = async (callID) => {
    try {
        var roomName = null;
        var html = Mustache.render(videoCallTamplate);
        $mainDiv.innerHTML = html;
      // const gdmOptions = {
      //   video: {
      //     cursor: "always"
      //   },
      //   audio: {
      //     echoCancellation: true,
      //     noiseSuppression: true,
      //     sampleRate: 44100
      //   }
      // }
      let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      //const stream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
      //showChatRoom();
      
      //const socket = io();//.connect('/');
      //socket.binaryType = 'arraybuffer';
      const peerConnection = createPeerConnection(socket);
      const offerButton = document.getElementById('offer');
      offerButton.addEventListener('click', async (event) => {
        if (callID) {
          socket.emit('call', callID, (name) => {
            if (name) { 
              roomName = name
            }
          } );
        } else {
          socket.emit('call', "5f17ce1ab3922b03966a0ff3");
        }
          //await createAndSendOffer(socket, peerConnection);
          
      });
      const leaveButton = document.getElementById('leaveCall');
          leaveButton.addEventListener('click', async (event) => {
            socket.emit('leaveRoom', roomName);
            peerConnection.close();
            peerConnection = undefined;
            await stopBothVideoAndAudio(stream);
            stream = undefined;
            $mainDiv.innerHTML = "";
          });
      //vanine - 5f08119cb5e2b80017e77e83
      //Yelene - 5f17ce1ab3922b03966a0ff3
      //David - 5f05bbda20d4310017ebc9c3
      addMessageHandler(socket, peerConnection, stream);

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      document.getElementById('self-view').srcObject = stream;
      // socket.emit("join", (error) => {
      //   if (error) {
      //       alert(error);
      //       location.href = '/';
      //   }
      // });

    } catch (err) {
      alert(`startChat - ${err}`);
      console.error(err);
    }
  };

  const createPeerConnection = (socket) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.test.com:19000' }, 
      { urls: "stun:stun.l.google.com:19302" },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }],
    });
    peerConnection.onnegotiationneeded = async () => {
      //await createAndSendOffer(socket, peerConnection);
    };

    peerConnection.onicecandidate = (iceEvent) => {
        //alert("ice candidate onn!!");

      if (iceEvent && iceEvent.candidate) {
        console.log("karevor");
        console.log(iceEvent.candidate);
        // const candidateStr = JSON.stringify(iceEvent.candidate).replace("candidate", "sdp");
        // const candidate = JSON.parse(candidateStr);
        // const binData = str2ab(JSON.stringify())
        socket.emit('candidates', roomName, iceEvent.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      const video = document.getElementById('remote-view');
      if (!video.srcObject) {
        video.srcObject = event.streams[0];
      }
    };

    return peerConnection;
  };

  async function stopBothVideoAndAudio(stream) {
    stream.getTracks().forEach(function(track) {
        if (track.readyState == 'live') {
            //alert(track.readyState);
            track.stop();
            //alert(track.readyState);
        }
    });
};

const addMessageHandler = (socket, peerConnection, stream) => {
    socket.once('call', (obj) => {
      //alert('call');
    //   {
    //     caller: user._id.toString(),
    //     roomName: call._id.toString(),
    //     username: user.username,
    //     image: user.avatar ? user.avatar.avatarURL : null,
    //     name: user.name
    // }
      roomName = obj.roomName;
      const answerButton = document.getElementById('answer');
      answerButton.addEventListener('click', async (event) => {
        //alert("answer");
        socket.emit('callAccepted', obj.caller, true, obj.roomName);
        
      });
    });
    socket.once('callAccepted', async (accept, roomCandidate) => {
      //alert('tarakan');
      if (accept) {
        //alert('callAccepted');
        roomName = roomCandidate;
        // const leaveButton = document.getElementById('leaveCall');
        // leaveButton.addEventListener('click', async (event) => {
        //   //alert("boboboo!");
        //   socket.emit('leaveRoom', roomName);
        //   peerConnection.close();
        //   peerConnection = undefined;
        //   await stopBothVideoAndAudio(stream);
        //   stream = undefined;
        //   $mainDiv.innerHTML = "";
        // });
        //alert(roomName);
        await createAndSendOffer(socket, peerConnection, roomName);
      }
    });
    socket.once('offer', async (candidatesRoom, data) => {
          roomName = candidatesRoom;
          
          await createAndSendAnswer(socket, peerConnection, data, candidatesRoom);
    });
    socket.once('answer', async (data) => {
      console.log("answer->")
      console.log(data)
      await peerConnection.setRemoteDescription(data);  
    });
    socket.once('candidates', async (data) => {
      await peerConnection.addIceCandidate(data); 
    });
    socket.once('callEnded', async (data) => {
          peerConnection.close();
          peerConnection = undefined;
          await stopBothVideoAndAudio(stream);
          stream = undefined;
          $mainDiv.innerHTML = "";
    });
  };

  const createAndSendOffer = async (socket, peerConnection, roomName) => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
      // const binData = str2ab(JSON.stringify({type: MESSAGE_TYPE.SDP, payload: offer}))
    socket.emit('offer', roomName, offer);
  };

  const createAndSendAnswer = async (socket, peerConnection, content, candidatesRoom) => {
    await peerConnection.setRemoteDescription(content);
    const answer = await peerConnection.createAnswer();
    console.log(`answer - ${answer}`);
    await peerConnection.setLocalDescription(answer);
    // const binData = str2ab(JSON.stringify({
    //   type: MESSAGE_TYPE.SDP,
    //   payload: answer
    // }))
    socket.emit('answer', candidatesRoom, answer);
  }

socket.on('ping', () => {
    //alert("ping")
})

socket.on('pong', () => {
    //alert("pong")
})

socket.on('message', (message) => {
    //alert(message.createdAt)
    if (chatId == message.senderId || chatId == message.reciever) {
        const html = Mustache.render(messageTemplate, {
            username: message.senderName,
            message: message.text,
            createdAt: moment(message.createdAt).format('h:mm:ss a')
        })
        $messages.insertAdjacentHTML('beforeend', html)
        autoscroll()
    } else {
        if (message.reciever ==  chatId) {

        } else {
            alert(`New message from ${message.senderName}`)
        }
    }
})

socket.emit("join", (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})