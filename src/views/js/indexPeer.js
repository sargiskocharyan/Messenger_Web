(function () {
    "use strict";
    // const MESSAGE_TYPE = {
    //   SDP: 'SessionDescription',
    //   CANDIDATE: 'IceCandidate'
    // }
    var offer = null;
    // function str2ab(str) {
    //   var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    //   var bufView = new Uint8Array(buf);//16
    //   for (var i=0, strLen=str.length; i < strLen; i++) {
    //     bufView[i] = str.charCodeAt(i);
    //   }
    //   return buf;
    // }
    document.addEventListener('click', async (event) => {
      if (event.target.id === 'start') {
        startChat();
      }
    });
    var roomCandidates = null;
    const startChat = async () => {
      try {
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        //const stream = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
        showChatRoom();
        
        const signaling = io();//.connect('/');
        //signaling.binaryType = 'arraybuffer';
        const peerConnection = createPeerConnection(signaling);
        const offerButton = document.getElementById('offer');
        offerButton.addEventListener('click', async (event) => {
          const queryString = window.location.search;
          const urlParams = new URLSearchParams(queryString);
          const callID = urlParams.get('id')
          if (callID) {
            signaling.emit('call', callID);
          } else {
            signaling.emit('call', "5f17ce1ab3922b03966a0ff3");
          }
            //await createAndSendOffer(signaling, peerConnection);
            
        });
        //vanine - 5f08119cb5e2b80017e77e83
        //Yelene - 5f17ce1ab3922b03966a0ff3
        //David - 5f05bbda20d4310017ebc9c3
        addMessageHandler(signaling, peerConnection);
  
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        document.getElementById('self-view').srcObject = stream;
        // signaling.emit("join", (error) => {
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
  
    const createPeerConnection = (signaling) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.test.com:19000' }, 
        { urls: "stun:stun.l.google.com:19302" },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }],
      });
      peerConnection.onnegotiationneeded = async () => {
        //await createAndSendOffer(signaling, peerConnection);
      };
  
      peerConnection.onicecandidate = (iceEvent) => {
          //alert("ice candidate onn!!");

        if (iceEvent && iceEvent.candidate) {
          console.log("karevor");
          console.log(iceEvent.candidate);
          // const candidateStr = JSON.stringify(iceEvent.candidate).replace("candidate", "sdp");
          // const candidate = JSON.parse(candidateStr);
          // const binData = str2ab(JSON.stringify())
          signaling.emit('candidates', roomCandidates, iceEvent.candidate);
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
  
    const addMessageHandler = (signaling, peerConnection) => {
      signaling.on('call', (recipientId) => {
        //alert('call');
        const answerButton = document.getElementById('answer');
        answerButton.addEventListener('click', async (event) => {
          //alert("answer");
          signaling.emit('callAccepted', recipientId, true);
        });
      });
      signaling.on('callAccepted', async (accept, roomCandidate) => {
        //alert('tarakan');
        if (accept) {
          //alert('callAccepted');
          roomCandidates = roomCandidate;
          //alert(roomCandidates);
          await createAndSendOffer(signaling, peerConnection, roomCandidates);
        }
      });
      signaling.on('offer', async (candidatesRoom, data) => {
            roomCandidates = candidatesRoom;
            await createAndSendAnswer(signaling, peerConnection, data, candidatesRoom);
      });
      signaling.on('answer', async (data) => {
        console.log("answer->")
        console.log(data)
        await peerConnection.setRemoteDescription(data);  
      });
      signaling.on('candidates', async (data) => {
        await peerConnection.addIceCandidate(data); 
      });
    };
  
    const createAndSendOffer = async (signaling, peerConnection, roomCandidates) => {
      offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
        // const binData = str2ab(JSON.stringify({type: MESSAGE_TYPE.SDP, payload: offer}))
      signaling.emit('offer', roomCandidates, offer);
    };

    const createAndSendAnswer = async (signaling, peerConnection, content, candidatesRoom) => {
      await peerConnection.setRemoteDescription(content);
      const answer = await peerConnection.createAnswer();
      console.log(`answer - ${answer}`);
      await peerConnection.setLocalDescription(answer);
      // const binData = str2ab(JSON.stringify({
      //   type: MESSAGE_TYPE.SDP,
      //   payload: answer
      // }))
      signaling.emit('answer', candidatesRoom, answer);
    }
  
    const showChatRoom = () => {
      document.getElementById('start').style.display = 'none';
      document.getElementById('chat-room').style.display = 'block';
    };
    
  })();