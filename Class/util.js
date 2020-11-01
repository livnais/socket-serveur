const { v4: uuidv4 } = require('uuid');

function getPlayer(socket, players, user) {
if(user.userId){
  user.id = socket.id;
  return user;
}
  const resultPlayer = players.filter(
    (player) =>
    user.name === player.name || user.name === `${player.name}${player.duplicateName}`
  );
  let player;
  const userId = uuidv4();
  player = user;
  player.id = socket.id;
  player.userId = userId;
  player.name = user.name;
  if (resultPlayer.length > 0) {
  player.duplicateName = `(${resultPlayer.length})`;
  } 
  return player;
}


 function stateGame(count, totalLength){
   if(count>totalLength-1){
     return count+=1;
   }
   return -1;
 }

module.exports = {
  getPlayer,stateGame
};
