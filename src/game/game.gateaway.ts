import { OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, NestMiddleware } from '@nestjs/common';
class User {
	id: string;
	username: string;
	socket: Socket;
}
var canvas = {
	width: 600,
	height: 400,
};
var ball = {
	x: canvas.width / 2,
	y: canvas.height / 2,
	radius: 10,
	speed: 3,
	velocityX: 5,
	velocityY: 5,
	color: 'black',
};
var paddleHeight = 100;
var paddleWidth = 10;
var leftPaddle = {
	x: 0,
	y: canvas.height / 2 - paddleHeight / 2,
	width: paddleWidth,
	height: paddleHeight,
	color: 'red',
	score: 0,
};
var rightPaddle = {
	x: canvas.width - paddleWidth,
	y: canvas.height / 2 - paddleHeight / 2,
	width: paddleWidth,
	height: paddleHeight,
	color: 'green',
	score: 0,
};

var upPressed = false;
var downPressed = false;
var wPressed = false;
var sPressed = false;
var upPressed2 = false;
var downPressed2 = false;

function update() {
	ball.x += ball.velocityX;
	ball.y += ball.velocityY;

	// check for collision with walls
	if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
		ball.velocityY = -ball.velocityY;
	}

	if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
		ball.velocityX = -ball.velocityX;
	 }

	// check for collision with left paddle
	if (ball.x - ball.radius < leftPaddle.x + leftPaddle.width && ball.y > leftPaddle.y && ball.y < leftPaddle.y + leftPaddle.height) {
		ball.velocityX = -ball.velocityX;
		leftPaddle.score++;
	}

	// check for collision with right paddle
	if (ball.x + ball.radius > rightPaddle.x && ball.y > rightPaddle.y && ball.y < rightPaddle.y + rightPaddle.height) {
		ball.velocityX = -ball.velocityX;
		rightPaddle.score++;
	}

	// move left paddle
	if (upPressed && leftPaddle.y > 0) {
		leftPaddle.y -= 7;
	} else if (downPressed && leftPaddle.y < canvas.height - leftPaddle.height) {
		leftPaddle.y += 7;
	}

	// move right
	// move right paddle
	if (upPressed2 && rightPaddle.y > 0) {
		rightPaddle.y -= 7;
	} else if (downPressed2 && rightPaddle.y < canvas.height - rightPaddle.height) {
		rightPaddle.y += 7;
	}
}






@WebSocketGateway()
export class gameGateaway implements OnGatewayInit, OnGatewayDisconnect {
	users: User[] = [];
	usernames = [];
	private connectedUsers: Record<string, any> = {};

	@WebSocketServer() server: Server;

	afterInit(server: Server) {
		console.log('Inıtialized.');
	}
	handleConnection(client: any, ...args: any[]) {
		const username = client.handshake.query.username;
		console.log(`Client connected: ${username}`);
		const user = new User();
		user.id = client.id;
		user.username = username;
		user.socket = client;
		this.connectedUsers[username] = client;
		this.users.push(user);
		//this.emitUserList();
	}

	handleDisconnect(client: any) {
		const username = client.handshake.query.username;
		console.log(`Client disconnected: ${username}`);
		delete this.connectedUsers[username];
		//this.emitUserList();
	}

/* 	private emitUserList() {
		const usernames = Object.keys(this.connectedUsers);
		this.server.emit('userList', {usernames});
	} */

	@SubscribeMessage('prUp')
	prup(client: Socket, key: any[]) {
		if (key[0] === "ArrowUp") {
			upPressed = false;
		} else if (key[0] === "ArrowDown") {
			downPressed = false;
		} else if (key[0] === "w") {
			upPressed2 = false;
		} else if (key[0] === "s") {
			downPressed2 = false;
		}
		update();
		this.users.forEach((user) => {
			user.socket.emit('try', {"ball": ball, "leftPaddle": leftPaddle, "rightPaddle": rightPaddle});

		});
	}
	@SubscribeMessage('prDown')
	prdown(client: Socket, key: any[]) {
		if (key[0] === "ArrowUp") {
			upPressed = true;
		} else if (key[0] === "ArrowDown") {
			downPressed = true;
		} else if (key[0] === "w") {
			upPressed2 = true;
		} else if (key[0] === "s") {
			downPressed2 = true;
		}
		update();
		this.users.forEach((user) => {
			user.socket.emit('pressedDown', key[0]);
		});
	}
	@SubscribeMessage('update')
	updatelocation(client: Socket, data) {
		update();
		this.users.forEach((user) => {
			user.socket.emit('update', {"ball": ball, "leftPaddle": leftPaddle, "rightPaddle": rightPaddle});

		});
	}; 


}
