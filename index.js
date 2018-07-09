const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
// const io = require('socket.io')(http)

let socketList = {}
let usernameList = {}
let roomList = {}
let roomIndexNow = 0

createRoom = roomHeaderSocket => {
  roomIndexNow++
  const roomName = roomIndexNow.toString(36)
  const boardState = Array(8).fill('').map(a => Array(8).fill(false))
  roomList[roomName] = { roomHeaderSocketId, boardState }
  return roomName
};

app.get('/', (req, res) => {
  return res.send('hello world!')
})

io.on('connection', socket => {
  console.log(socket.id, 'connected')
  socketList[socket.id] = socket

  socket.on('createRoom', () => {
    const roomName = createRoom(socket.id)
    socket.boardcast.emit('roomCreated', { roomName })
  })

  socket.on('joinRoom', (roomName, username) => {
    socket.join(roomName)
    socket.to(roomName).emit('someoneJoinRoom', { username })
    socket.emit('joinedRoom', { roomName })
  })

  socket.on('disconnect', () => {
    delete socketList[socket.id]
    console.log(socket.id, 'disconnected')
  })
})

//
server.listen(3001, () => console.log('listening on port 3001'))
// const io = require('socket.io').listen(server)
