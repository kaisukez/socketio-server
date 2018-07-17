const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
// const io = require('socket.io')(http)

let socketList = {}
let mapSocketIdToUsername = {}
let roomList = {}
let roomIndexNow = 0

createRoom = roomHeaderSocketId => {
  roomIndexNow++
  const roomName = roomIndexNow.toString(36)
  const boardState = Array(8).fill('').map(a => Array(8).fill(false))
  roomList[roomName] = { roomHeaderSocketId, boardState }
  return roomName
};

app.get('/', (req, res) => {
  return res.send('hello world!')
})

app.get('/get_all_rooms', (req, res) => {
  return roomList
})

io.on('connection', socket => {
  console.log(socket.id, 'connected')
  socketList[socket.id] = socket

  socket.on('setUsername', username => {
    mapSocketIdToUsername[socket.id] = username
  })

  socket.on('getAllRooms', () => {
    console.log('getAllRooms')
    const rooms = Object.keys(roomList)
    socket.emit('roomUpdateAll', rooms)
  })

  socket.on('createRoom', () => {
    console.log('createRoom')
    const roomName = createRoom(socket.id)
    io.emit('roomUpdate', roomName)
  })

  socket.on('joinRoom', roomName => {
    socket.join(roomName)
    socket.to(roomName).emit('someoneJoinRoom', username)
    socket.emit('joinedRoom', roomName)
  })

  socket.on('leaveRoom', roomName => {
    socket.leave(roomName)
    socket.to(roomName).emit('someoneLeaveRoom', username)
    socket.emit('leavedRoom', roomName)
  })

  socket.on('disconnect', () => {
    delete socketList[socket.id]
    socket.removeAllListeners()
    console.log(socket.id, 'disconnected')
  })
})

server.listen(3001, () => console.log('listening on port 3001'))
// const io = require('socket.io').listen(server)
