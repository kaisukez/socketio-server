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

const ROOM_STATE = {
  WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
}

const PLAYER_STATUS = {
  OWNER: 'OWNER',
  OPPONENT: 'OPPONENT',
  VIEWER: 'VIEWER',
  OUTSIDER: 'OUTSIDER'
}

const getPlayerStatus = (roomId, socketId) => {
  const room = rooms[roomId]
  if (socketId === room.ownerSocketId)
    return PLAYER_STATUS.OWNER
  else if (socketId === room.opponentSocketId)
    return PLAYER_STATUS.OPPONENT
  else if (room.viewerSocketIds.indexOf(socketId) != -1)
    return PLAYER_STATUS.VIEWER
  return PLAYER_STATUS.OUTSIDER
}

const createRoom = ownerSocketId => {
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
  return { roomId, playerStatus: PLAYER_STATUS.OWNER }
}

const joinRoom = (roomId, socketId) => {
  if (rooms[roomId].opponentSocketId === null) {
    rooms[roomId].opponentSocketId = socketId
    mapSocketIdToRoomId[socketId] = roomId
    return { playerStatus: PLAYER_STATUS.OPPONENT }
  } else {
    rooms[roomId].viewerSocketIds.push(socketId)
    mapSocketIdToRoomId[socketId] = roomId
    return { playerStatus: PLAYER_STATUS.VIEWER }
  }
}

const leaveRoom = (roomId, socketId) => {
  if (socketId === rooms[roomId].ownerSocketId) {
    rooms[roomId].ownerSocketId = null
  } else if (socketId === rooms[roomId].opponentSockedId) {
    rooms[roomId].opponentSocketId = null
  }
}

io.on('connection', socket => {
  console.log(socket.id, 'connected')
  socketList[socket.id] = socket

  socket.on('setUsername', username => {
    mapSocketIdToUsername[socket.id] = username
  })

  socket.on('getAllRooms', () => {
    const roomNames = Object.keys(rooms)
    socket.emit('roomUpdateAll', roomNames)
  })

  socket.on('createRoom', () => {
    const { roomId, playerStatus } = createRoom(socket.id)
    socket.join(roomId)
    socket.emit('playerStatus', roomId, playerStatus)
    io.emit('roomUpdate', roomId)
  })

  socket.on('joinRoom', roomId => {
    const { playerStatus } = joinRoom(roomId, socket.id)
    socket.join(roomId)
    socket.emit('playerStatus', roomId, playerStatus)
    socket.to(roomId).emit('someoneJoinRoom', mapSocketIdToUsername[socket.id])
  })

  socket.on('leaveRoom', roomId => {

    socket.leave(roomId)
    delete mapSocketIdToRoomId[socket.id]

    socket.emit('leavedRoom', roomId)
    socket.to(roomId).emit('someoneLeaveRoom', mapSocketIdToUsername[socket.id])
    rooms[roomId]
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
