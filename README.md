# native-webrtc-peer-to-peer
A basic native WebRTC peer to peer Web App demo implementation

It includes a web client and a signaling server for clients to connect and do signaling for WebRTC.


### Starting with Docker

Go to the directory that has your Dockerfile and run the following command to build the Docker image. The -t flag lets you tag your image so it's easier to find later using the docker images command:

```
docker build . -t <your username>/webrtc-app
```

Run the image you previously built:

```
docker run -p 8080:80 -e DEBUG=* -d <your username>/webrtc-app
```

Using this command the app will be accessible at [localhost:8080](http://localhost:8080) and running in [DEBUG mode](https://www.npmjs.com/package/debug)

### Starting and debugging (without docker)

Install the dependencies:

```npm i```

Build the backend:

```npm run build```

For just running:

```npm run dev```

### How to use

This a draft how to use section.

Once you run the application a promt will appear asking for the room name.

Type a room name and enter, allow access to your video and audio devices.

Once another peer joins the same room name, you will be able to call the other peer and they will be able to answer.

After the peer answers your call, connection should be established and you can communicate.

You can change your camera and microphone devices from the drop down menus.

You can also apply a few voice filters to your voice.

After you hangup, you will be able to join a new room with the input field at the bottom right corner,

or if you were the room owner, you can wait for another peer to join the room.




### Credit where credit is due:

Initial code from https://github.com/googlecodelabs/webrtc-web