"use strict";

var http = require('http');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

function rand(x) {
    x = x || 4;
    return Math.floor(Math.random() * x);
}

var SIZE  = [80, 20];
var COUNT = [5, 10];

class Game {
    get usersCount () {
        return Object.keys(this.users).length;
    }
    constructor () {
        var data = this.data = {};
        for (var y = 0; y < COUNT[1]; ++y) {
	    for (var x = 0; x < COUNT[0]; ++x) {
                var a = rand();
                var b = rand();
                var op = rand() % 2 === 0 ? "+" : "-";
                var answer = a + (op === "-" ? -1 : 1) * b;
                data[this.getId(x, y)] = {
                    question: [a, op, b, "= ?"].join(" "),
                    answer: answer
                };
	    }
        }
        this.users = {};
    }
    getId (x, y) {
        return [x, y].join(":");
    }
    getCell (x, y) {
        if (typeof x === "object") { return this.getCell(x.x, x.y); }
        return this.data[this.getId(x, y)]
    }
    isFreeCell (x, y) {
        var cell = this.getCell(x, y);
        return !cell.answered && !cell.busy;
    }
    getFreePosition () {

        var pos = null;

        do {
            pos = { x: rand(COUNT[0]), y: rand(COUNT[1]) };
        } while (!this.isFreeCell(pos.x, pos.y))

        return pos;
    }

    joinUser (user, socket) {
        if (this.usersCount > 5) { return; }
        user = {
            name: user.name || "Anon"
          , color: ["red", "orange", "yellow", "green", "blue"][this.usersCount]
          , id: socket.id
        };

        var self = this;
        this.users[socket.id] = user;

        socket.on('move', function(pos) {

            if (!self.isFreeCell(pos.x, pos.y)) {
                return;
            }

            var cell = self.getCell(pos.x, pos.y);
            if (cell.answer !== +pos.answer) {
                return;
            }

            user.cell.busy = null;
            cell.busy = user.id;
            cell.answered = true;
            cell.color = user.color;
            console.log(cell, pos);
            io.sockets.emit("game-updated", _game.data);
        });

        user.socket = socket;
        var pos = this.getFreePosition();
        socket.emit("position", pos);
        socket.emit("user-color", user.color);
        user.cell = this.getCell(pos);
        //socket.emit("user-joined", user);
    }

    unjoinUser (socket) {
        delete this.users[socket.id];
    }

    getTextForCell (id) {
        if (this.data[id].answered) {
            return "";
        }
        return this.data[id].question;
    }
}

var _game = new Game();

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
server.listen(process.env.PORT || 3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res, next) {
  res.render('index', {
    size: SIZE,
    count: COUNT,
    game: _game
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


io.on('connection', function (socket) {
    socket.on("new-user", function (user) {
        _game.joinUser(user, socket);
        io.sockets.emit("user-count-change", _game.usersCount);
    });
    socket.on('disconnect', function() {
        _game.unjoinUser(socket);
        io.sockets.emit("user-count-change", _game.usersCount);
    });
    socket.on("error", console.error);
});

module.exports = app;
