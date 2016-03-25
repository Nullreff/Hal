#!/usr/bin/env node
var AgarioClient = require('agario-client');

var client_name = 'HAL 9000';
var region = 'US-Atlanta';
var server = '127.0.0.1:9158';
var client = new AgarioClient(client_name);
var tick = null;
var split_timer = 0;


client.on('lostMyBalls', function() {
    setTimeout(spawn, 2000);
});

client.on('connected', function() {
    spawn();
    tick = setInterval(target, 100);
});

client.on('connectionError', function(e) {
    client.log('Connection failed with reason: ' + e);
    client.log('Server address set to: ' + client.server + ' please check if this is correct and working address');
});

client.on('reset', function() {
    clearInterval(tick);
});

function spawn() {
    client.log('=== SPAWNING ===');
    client.spawn(client_name);
}

function target() {
    var large_balls = [];
    var small_ball = null;
    var split_ball = null;
    var small_dist = 0;
    var small_size = 0;

    if (split_timer > 0) {
        split_timer--;
    }


    for (var my_ball_id in client.my_balls) {
        var my_ball = client.balls[client.my_balls[my_ball_id]];
        if (!my_ball)
            continue;

        for (var ball_id in client.balls) {
            var ball = client.balls[ball_id];
            if(!ball.visible || ball.mine || ball.eaten)
                continue;

            if (Math.abs(ball.x - my_ball.x) < 1 && Math.abs(ball.y - my_ball.y) < 1) {
                ball.eaten = true;
                continue;
            }

            var dist = getDistance(ball, my_ball) - ball.size;
            if (ball.virus) {
                if (my_ball.size > ball.size && dist < (my_ball.size - 15)) {
                    large_balls.push(ball);
                }
            } else if(ball.size / my_ball.size > 1.1) {
                var margin = 200;
                if (client.my_balls.length > 2) {
                    margin = 2000;
                } else if (ball.size / my_ball.size <= 3.5 &&
                             ball.size / my_ball.size > 1.5) {
                    margin = 700;
                }
                if (dist < margin) {
                    large_balls.push(ball);
                }
            } else if(ball.size / my_ball.size <= 0.8) {
                if (client.my_balls.length < 4 && split_timer == 0 &&
                    ball.size > 40 &&
                    ball.size / my_ball.size < 0.5 &&
                    ball.size / my_ball.size > 0.1 &&
                    dist < 500 && dist > 200) {
                    split_ball = ball;
                }
                if (getDistance(ball, my_ball) < (my_ball.size * 10) + 1000) {
                    if(!small_ball || (dist * dist) / ball.size < small_dist) {
                        if (!ball.appeal) {
                            ball.appeal = ball.size;
                        } else {
                            ball.appeal--;
                        }
                        if (ball.appeal > 0) {
                            small_ball = ball;
                            small_dist = (dist * dist) / ball.size;
                        }
                    }
                }
            }
        }
    }

    if(large_balls.length > 0) {
        var target = {x: 0, y: 0};
        for (var i in large_balls) {
            var ball = large_balls[i];
            var offset = normalize({
                x: (my_ball.x - ball.x),
                y: (my_ball.y - ball.y)
            });
            target.x += offset.x;
            target.y += offset.y;
        }
        target = normalize(target);
        client.moveTo(my_ball.x + (target.x * 1000), my_ball.y + (target.y * 1000));
        client.log("Avoiding " + large_balls.length + " balls");
    } else if (split_ball) {
        client.moveTo(split_ball.x, split_ball.y);
        client.split();
        split_timer = 10;
        client.log("Splitting '" + split_ball.name + "'");
    } else if (small_ball) {
        client.moveTo(small_ball.x, small_ball.y);
        client.log("Hunting  '" + small_ball.name + "' (" + small_ball.appeal + ")");
    } else {
        client.log("Nothing");
    }
}

function getDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function normalize(a) {
    var dist = getDistance({x: 0, y: 0}, a);
    return {x: a.x / dist, y: a.y / dist};
}

console.log('Requesting server in region ' + region);
AgarioClient.servers.getFFAServer({region: region}, function(srv) {
    if(!srv.server) return console.log('Failed to request server (error=' + srv.error + ', error_source=' + srv.error_source + ')');
    console.log('Connecting to ' + srv.server);
    client.connect('ws://' + server, '');
});
