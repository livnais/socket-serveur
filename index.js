const { getPlayer,stateGame } = require("./Class/util.js");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
var _ = require('lodash');

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const mysql = require("mysql");
const { json } = require("express");
const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server);

let players = [];
let sockets = [];
let readyPlayer = [];
let data = null;
let player = null;
let time = 0;
let intervalId = null;
let count = -1;
let lockGame = false;

var con = mysql.createConnection({
  host: "localhost",
  user: "username",
  password: "password",
  database: "useyourwords",
});

con.connect(function (err) {
  if (err) {
    // console.log(err);
  } else {
    console.log("Connected!");
    con.query("SELECT * FROM useyourwordsdata", function (err, result, fields) {
      if (err) throw err;
      data = result
      console.log(result);
    });
  }
});

io.on("connection", (socket) => {
  console.log("socket.request", socket.request._query);
  if(players.length<=5){
    player = getPlayer(socket, players,JSON.parse(socket.request._query.user));
    sockets.push(socket);
    players.push(player);
  }else{
    return;
  }

  socket.on("disconnect", (data) => {
    players =  _.compact(players.map((player) => {
      if(socket.id !== player.id){
        return player;
      }}));
    sockets = _.compact(sockets.map((so) =>{
      if(socket.id !== so.id){
        return so;
      }}));
      updateUsernames();
  
  });

  socket.on("updateUser",(data)=>{
    const user = JSON.parse(data);
    const index = players.findIndex(player => player.userId === user.userId);
    if(index>=0){
    players[index] = user;
    player = user;
    if(user.messageType){
      switch(user.messageType){
        case "ready":
          updateUsernames();
          runGame();  
        break;
        case "answer":
          updateUsernames();
          checkAnswer();
        break;
       default:
        updateUsernames();
        
      }
    }
    }
  })


  const checkAnswer = () =>{
    answerPlayer = players.map((p)=>p.answer!=="")
    const isTrue = (currentValue) => currentValue===true;
    if(answerPlayer.every(isTrue)){
      players.forEach((p)=>p.ready=false)
      clearInterval(intervalId)
      setTimeout(()=>{
        io.sockets.emit("getUsers", {undefined,players}); 
        io.sockets.emit("displayAnswer",true);
      },500)
    }
  }

  const runGame = () =>{
    readyPlayer = players.map((p)=>p.ready)
    const isTrue = (currentValue) => currentValue===true;
    if(readyPlayer.every(isTrue)){
      players.forEach((p)=>p.ready=false)
      io.emit("data-jeu",JSON.stringify(data[0]))
      setTimeout(()=>{
        io.sockets.emit("getUsers", {undefined,players}); 
        timer();
      },500)
    }
  }


  const timer = () =>{
    intervalId = setInterval(()=>{
      sendTime();
      }, 1000);
  }


  const sendTime = ()=>{
    time+=1;
    const t  = 60-time; 
    io.sockets.emit("timer",t)
    console.log("Send timer")
    if(time>=60){
      time = 0;
      clearInterval(intervalId);
    }
  }

  const updateUsernames = () => {
    if(players.length>0){
      io.sockets.emit("getUsers", {player,players});    
    }else{
      console.log("stop timer")
      clearInterval(intervalId);
      time=0;
    }
  };

  setTimeout(function(){ updateUsernames(); }, 500);

});

server.listen(port, () => console.log(`Listening on port ${port}`));
