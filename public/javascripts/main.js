$(function () {
    var socket = io.connect('/');

    var userColor = null;
    socket.on('user-count-change', function (data) {
        $(".user-count").text(data);
    });

    socket.on('game-updated', function (data) {
        Object.keys(data).forEach(function (key) {
            var value = data[key];
            if (value.color) {
                $("[data-xy='" + key + "']").css("background", value.color).attr("data-answered", "true");
            }
        });
    });

    socket.emit("new-user", {
        name: prompt("Name")
    });

    var $rows = $(".game-row");
    function getCell(x, y) {
        if (typeof x === "object") { return this.getCell(x.x, x.y); }
        return $rows.eq(y).children().eq(x);
    }

    var $last = null;
    function move(x, y) {
        if (typeof x === "object") { return move(x.x, x.y); }
        socket.emit("move", {
            x: x
          , y: y
          , answer: prompt(($last = getCell(x, y)).text())
        });
    }

    function getCellCoordinates($cell) {
        return {
            x: $cell.index(),
            y: $cell.parent().index() - 1
        };
    }

    $(".game-square").click(function () {
        var $this = $(this);
        var xy = getCellCoordinates($last);
        var newXY = getCellCoordinates($this);
        if (Math.abs(xy.x - newXY.x) !== 1 && Math.abs(xy.y - newXY.y) !== 1 || $this.data("answered")) {
            return alert("Invalid.");
        }
        move(newXY);
    });

    socket.on('user-color', function (data) {
        userColor = data;
    });

    socket.on('position', function (data) {
        socket.emit("move", data);
        move(data);
    });
});
