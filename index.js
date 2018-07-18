const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
// const io = require('socket.io')(http)

let socketList = {}
let mapSocketIdToUsername = {}
let mapSocketIdToRoomId = {}
let rooms = {}
let roomIndexNow = 0

const roomState = {
  WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
}

createRoom = ownerSokcetId => {
  roomIndexNow++
  const roomId = roomIndexNow.toString(36)
  const opponentSocketId = null
  const viewerSocketIds = []
  const boardState = Array(8).fill('').map(a => Array(8).fill(false))
  rooms[roomId] = {
    ownerSocketId,
    opponentSocketId,
    viewerSocketIds,
    boardState
  }
  return roomId
}

io.on('connection', socket => {
  console.log(socket.id, 'connected')
  socketList[socket.id] = socket

  socket.on('setUsername', username => {
    mapSocketIdToUsername[socket.id] = username
  })

  socket.on('getAllRooms', () => {
    const rooms = Object.keys(rooms)
    socket.emit('roomUpdateAll', rooms)
  })

  socket.on('createRoom', () => {
    const roomId = createRoom(socket.id)
    io.emit('roomUpdate', roomId)
    socket.emit('roomCreated', roomId)
  })

  socket.on('joinRoom', roomId => {
    socket.join(roomId)
    mapSocketIdToRoomId[socket.id] = roomId
    socket.to(roomId).emit('someoneJoinRoom', mapSocketIdToUsername[socket.id])
    socket.emit('joinedRoom', roomId)
  })

  socket.on('leaveRoom', roomId => {
    socket.leave(roomId)
    delete mapSocketIdToRoomId[socket.id]
    socket.to(roomId).emit('someoneLeaveRoom', mapSocketIdToUsername[socket.id])
    socket.emit('leavedRoom', roomId)
  })

  socket.on('getBoardState', () => {
    socket.emit('updateWholeBoardState', rooms[mapSocketIdToRoomId[socket.id]].boardState)
  })

  socket.on('move', position => {
    socket.to(roomId).emit('moved', position)
  })

  socket.on('disconnect', () => {
    delete socketList[socket.id]
    delete mapSocketIdToUsername[socket.id]
    socket.removeAllListeners()
    console.log(socket.id, 'disconnected')
  })
})

server.listen(3001, () => console.log('listening on port 3001'))
// const io = require('socket.io').listen(server)
