var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var word2vec = require('../word2vec');
var word2veclarge = require('../word2vec_large');

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.set('origins', '*:*');
io.on('connection', function(socket){
  socket.on('wordvecs', function(msg){
    console.log('Preparing to send 50d word vectors: ' + msg);

    io.emit('length', {collection: 'wordvecs', length: word2vec.word2vec.length});
    word2vec.word2vec.forEach(d => io.emit('wordvecs', d));
  });

  socket.on('wordvecslarge', function(msg){
    console.log('Preparing to send 300d word vectors: ' + msg);

    io.emit('length', {collection: 'wordvecslarge', length: word2veclarge.word2vec.length});
    word2veclarge.word2vec.forEach(d => io.emit('wordvecslarge', d));
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
