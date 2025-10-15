const express = require('express');
const http = require('http');
const cores = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cores());
app.use(express.static('public'));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    
  },
});

io.on('connection', (socket) => {
    const {room} = socket.handshake.query;
    const roomName = room || 'global';
    socket.join(roomName);

     console.log(`➡️  conectado: ${socket.id} en sala "${roomName}"`);

    socket.on("draw",(payload)=>{
      console.log(`🖊️  draw de ${socket.id} -> sala "${roomName}"`, payload);
        socket.to(roomName).emit("draw",payload);
    });

    socket.on("clear", () => {
      console.log(`🧹 clear de ${socket.id} -> sala "${roomName}"`);
        socket.to(roomName).emit("clear");
    });
     socket.on("disconnect", () => {
    // aquí podrías manejar lista de usuarios, etc.
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});