#!/usr/bin/env node
var AgarioClient = require('agario-client');

var client_name = 'Hal';
var region = 'US-Atlanta';
var server = '127.0.0.1:9158';
var client = new AgarioClient(client_name);
var tick = null;
var split_timer = 0;


client.on('lostMyBalls', function() {
    client.log('=== RESPAWNING ===');
    client.spawn(client_name);
});

client.on('connected', function() {
    client.log('=== SPAWNING ===');
    client.spawn(client_name);
    tick = setInterval(target, 100);
});

client.on('connectionError', function(e) {
    client.log('Connection failed with reason: ' + e);
    client.log('Server address set to: ' + client.server + ' please check if this is correct and working address');
});

client.on('reset', function() {
    clearInterval(tick);
});

function target() {
    var small_ball = null;
    var large_ball = null;
    var small_dist = 0;
    var small_size = 0;
    var large_dist = Infinity;

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

           if (Math.abs(ball.x - my_ball.x) < 0.1 && Math.abs(ball.y - my_ball.y) < 0.1) {
               ball.eaten = true;
               continue;
           }

            var dist = getDistance(ball, my_ball) - ball.size;
            if (ball.virus) {
                if (my_ball.size > ball.size && dist < (my_ball.size - 15)) {
                    large_ball = ball;
                    large_dist = 0;
                }
            } else if(ball.size / my_ball.size > 1.1) {
                var margin = 200;
                if (client.my_balls.length > 2) {
                    margin = 800;
                } else if (ball.size / my_ball.size <= 4 &&
                             ball.size / my_ball.size > 2) {
                    margin = 700;
                }
                if (dist < margin && dist < large_dist) {
                    large_ball = ball;
                    large_dist = dist;
                }
            } else if(ball.size / my_ball.size <= 0.8) {
                if (split_timer == 0 && ball.size > 40 &&
                    ball.size / my_ball.size < 0.45 &&
                    ball.size / my_ball.size > 0.2 &&
                    dist < 400 && dist > 200) {
                    client.moveTo(ball.x, ball.y);
                    client.split();
                    split_timer = 30;
                    return;
                }
                if (ball.x > 1000 && ball.y > 1000 &&
                    ball.x < 3000 && ball.y < 3000) {
                    if(!small_ball || (dist * dist) / ball.size < small_dist) {
                        small_ball = ball;
                        small_dist = (dist * dist) / ball.size;
                    }
                }
            }
        }
    }

    if(large_ball) {
        var x = large_ball.x - my_ball.x;
        var y = large_ball.y - my_ball.y;
        client.moveTo(my_ball.x - x + 5, my_ball.y -  y + 5);
        client.log("Running Away From '" + large_ball.name + "' x:" + large_ball.x + " y:" + large_ball.y);
    } else if (small_ball) {
        client.moveTo(small_ball.x, small_ball.y);
        client.log("Hunting '" + small_ball.name + "' x:" + small_ball.x + " y:" + small_ball.y);
    } else {
        client.log("Avoiding Walls");
        client.moveTo(2000, 2000);
    }
}

function getDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

console.log('Requesting server in region ' + region);
AgarioClient.servers.getFFAServer({region: region}, function(srv) {
    if(!srv.server) return console.log('Failed to request server (error=' + srv.error + ', error_source=' + srv.error_source + ')');
    console.log('Connecting to ' + srv.server);
    client.connect('ws://' + server, '');
});
