#!/usr/bin/env node
var AgarioClient = require('agario-client');

var client_name = 'Hal';
var region = 'US-Atlanta';
var server = '127.0.0.1:9158';
var client = new AgarioClient(client_name);
var tick = null;


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
    var distance = 0;
    var size = 0;

    var my_ball = client.balls[ client.my_balls[0] ];
    if(!my_ball)
        return;

    for(var ball_id in client.balls) {
        var ball = client.balls[ball_id];
        if(ball.virus || !ball.visible || ball.mine)
            continue;

        if(ball.size/my_ball.size > 1.5) {
            var dist = getDistance(ball, my_ball);
            if (dist < (ball.size * 2 + 100) && ball.size > size) {
                large_ball = ball;
                size = ball.size;
            }
        } else if(ball.size/my_ball.size <= 0.5) {
            var dist = getDistance(ball, my_ball);
            if(!small_ball || dist < distance) {
                small_ball = ball;
                distance = dist;
            }
        }
    }

    if(large_ball) {
        var x = large_ball.x - my_ball.x;
        var y = large_ball.y - my_ball.y;
        client.moveTo(my_ball.x - x, my_ball.y -  y);
        console.log("\rRunning Away From '" + large_ball.name + "' dist " + getDistance(large_ball, my_ball));
    } else if (small_ball) {
        client.moveTo(small_ball.x, small_ball.y);
        console.log("Hunting '" + small_ball.name + "'");
    } else {
        console.log("Nothing");
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
