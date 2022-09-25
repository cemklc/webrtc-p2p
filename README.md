# native-webrtc-peer-to-peer
A basic native WebRTC peer to peer Web App demo implementation

It includes a web client and a signaling server for clients to connect and do signaling for WebRTC.

### Starting and debugging (without docker)

Install the dependencies:

```npm i```

Build the backend:

```npm run build```

For just running:

```npm run dev```

### How to use

You can run ```npm run dev``` and go to you localhost ```http://localhost/```

Once you run the application a promt will appear asking for the room name.

Type a room name and enter, allow access to your video and audio devices.

Once another peer joins the same room name, you will be able to call the other peer with the call button and they will be able to answer.

After the peer answers your call, connection should be established and you can communicate.

You can change your camera and microphone devices from the drop down menus.

You can also apply a few voice filters to your voice.

After you hangup, you will be able to join a new room with the input field at the bottom right corner


### Credit where credit is due:

Initial code from https://github.com/googlecodelabs/webrtc-web, AgilityFeat