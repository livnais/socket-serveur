const { getPlayer, stateGame } = require("./Class/util.js");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
var _ = require("lodash");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const mysql = require("mysql");
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
let position = -1;

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
    con.query("SELECT * FROM element", function (err, result, fields) {
      if (err) throw err;
      data = result;
      console.log(result);
    });
  }
});

io.on("connection", (socket) => {
  //console.log("socket.request", socket.request._query);
  if (players.length <= 5) {
    player = getPlayer(socket, players, JSON.parse(socket.request._query.user));
    sockets.push(socket);
    players.push(player);
  } else {
    return;
  }

  socket.on("disconnect", (data) => {
    players = _.compact(
      players.map((player) => {
        if (socket.id !== player.id) {
          return player;
        }
      })
    );
    sockets = _.compact(
      sockets.map((so) => {
        if (socket.id !== so.id) {
          return so;
        }
      })
    );
    updateUsernames();
  });

  socket.on("updateUser", (data) => {
    const user = JSON.parse(data);
    const index = players.findIndex((player) => player.userId === user.userId);
    if (index >= 0) {
      players[index] = user;
      player = user;
      if (user.messageType) {
        switch (user.messageType) {
          case "ready":
            console.log("messageType", user.messageType);
            updateUsernames();
            runGame();
            break;
          case "answer":
            console.log("messageType", user.messageType);
            updateUsernames();
            checkAnswer();
            break;

          case "vote":
            console.log("messageType", user.messageType);
            updateUsernames();
            checkVote();
            break;
          default:
            console.log("default");
            updateUsernames();
            break;
        }
      }
    }
  });

  const checkVote = () => {
    votePlayer = players.map((p) => p.vote !== "");
    const isTrue = (currentValue) => currentValue === true;
    if (votePlayer.every(isTrue)) {
      {
        players.forEach((p) => (p.ready = false));
        winRound();
        players.forEach((p) => (p.answer = ""));
        players.forEach((p) => (p.vote = ""));
        setTimeout(() => {
          io.sockets.emit("getUsers", { undefined, players });
          io.sockets.emit("displayAnswer", false);
          sendDataGame();
        }, 500);
      }
    }
  };

  const checkAnswer = () => {
    answerPlayer = players.map((p) => p.answer !== "");
    const isTrue = (currentValue) => currentValue === true;
    if (answerPlayer.every(isTrue)) {
      stopTimer();
      players.forEach((p) => (p.ready = false));
      setTimeout(() => {
        io.sockets.emit("getUsers", { undefined, players });
        io.sockets.emit("displayAnswer", true);
      }, 500);
    }
  };

  const runGame = () => {
    readyPlayer = players.map((p) => p.ready);
    const isTrue = (currentValue) => currentValue === true;
    if (readyPlayer.every(isTrue)) {
      console.log("runGame");
      players.forEach((p) => (p.ready = false));
      setTimeout(() => {
        io.sockets.emit("getUsers", { undefined, players });
        sendDataGame();
      }, 500);
    }
  };

  const sendDataGame = () => {
    console.log("sendDataGame");
    position += 1;
    const index = stateGame(position, data.length);
    console.log("index", index);
    if (index >= 0) {
      io.sockets.emit("data-jeu", JSON.stringify(data[index]));
      timer();
    }
  };

  const timer = () => {
    console.log("startTime");
    intervalId = setInterval(() => {
      sendTime();
    }, 1000);
  };

  const sendTime = () => {
    time += 1;
    const t = 60 - time;
    io.sockets.emit("timer", t);
    if (time >= 60) {
      stopTimer();
    }
  };

  const stopTimer = () => {
    clearInterval(intervalId);
    time = 0;
    console.log("stopTimer");
  };

  const updateUsernames = () => {
    if (players.length > 0) {
      io.sockets.emit("getUsers", { player, players });
    } else {
      position = -1;
      stopTimer();
    }
  };

  const winRound = () => {
    players.forEach((p) => {
      const playerPoint = _.find(players, (o) => o.userId === p.vote);
      console.log("winRound", playerPoint);
      if (playerPoint) {
        playerPoint.point = playerPoint.point + 1;
      }
    });
    updateUsernames();
    if (position >= data.length - 1) {
      io.sockets.emit("finish", true);
    }
  };

  setTimeout(function () {
    updateUsernames();
  }, 500);
});

server.listen(port, () => console.log(`Listening on port ${port}`));
