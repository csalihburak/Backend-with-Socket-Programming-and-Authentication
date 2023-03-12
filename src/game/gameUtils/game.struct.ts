import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { Socket } from 'socket.io';
import { Room } from '../game.service';

interface Player {
	id: string;
	name: string;
	paddle;
	score: number;
}

@Injectable()
export class Game {
	canvas = {
		width: 600,
		height: 400,
	};

	users: { [key: string]: string } = {};

	leftPlayer = {
		id: '',
		name: '',
		paddle: {
			x: 0,
			y: this.canvas.height / 2 - 50,
			width: 8,
			height: 100,
			color: '#2C3E50',
			speed: 10,
		},
		score: 0,
	};

	rightPlayer = {
		id: '',
		name: '',
		paddle: {
			x: this.canvas.width - 10,
			y: this.canvas.height / 2 - 50,
			width: 8,
			height: 100,
			color: '#2C3E50',
			speed: 10,
		},
		score: 0,
	};
	client: Socket;
	fps: number = 60;

	ball = {
		x: this.canvas.width / 2,
		y: this.canvas.height / 2,
		radius: 4,
		color: '#5588A3',
		velocityX: 0.75,
		velocityY: 0.75,
	};

	upPressed = false;
	downPressed = false;
	wPressed = false;
	sPressed = false;
	upPressed2 = false;
	downPressed2 = false;
}

function resetGame(game: Game) {
	game.ball.x = game.canvas.width / 2;
	game.ball.y =  game.canvas.height / 2;
	game.rightPlayer.paddle.x = game.canvas.width - 10,
	game.rightPlayer.paddle.y =  game.canvas.height / 2 - 50;
	game.leftPlayer.paddle.x = 0;
	game.leftPlayer.paddle.y = game.canvas.height / 2 - 50;
}


export function update(room: Room) {

	let game = room.game;
	game.ball.x += game.ball.velocityX;
	game.ball.y += game.ball.velocityY;

	
	if (game.ball.x > (game.canvas.width - game.ball.radius)) {
		if (game.ball.y < game.rightPlayer.paddle.y || game.ball.y > game.rightPlayer.paddle.y + game.rightPlayer.paddle.height) {
			game.leftPlayer.score++;
		}
		game.ball.velocityX *= -1;
	} else if (0 > (game.ball.x - game.ball.radius)) {
		if (game.ball.y < game.leftPlayer.paddle.y || game.ball.y > game.leftPlayer.paddle.y + game.leftPlayer.paddle.height) {
			game.rightPlayer.score++;
		}
		game.ball.velocityX *= -1;
	} else if ( ((game.ball.y + game.ball.radius) >= game.leftPlayer.paddle.y) && ((game.ball.y + game.ball.radius + 2) <= (game.leftPlayer.paddle.y + game.leftPlayer.paddle.height)) && ((game.ball.x - game.ball.radius - 2) <= game.leftPlayer.paddle.width)) {
		
		game.ball.velocityY = +game.ball.velocityY;
	} else if ( ((game.ball.y + game.ball.radius ) >= game.rightPlayer.paddle.y) && ((game.ball.y + game.ball.radius + 2) <= (game.rightPlayer.paddle.y + game.rightPlayer.paddle.height)) && ((game.ball.x + game.ball.radius) >= (game.canvas.width - game.rightPlayer.paddle.width)))  { 
		
		game.ball.velocityX = +game.ball.velocityX;
	} else if ( ((game.ball.y + game.ball.radius) > game.canvas.height) || ((game.ball.y - game.ball.radius) < 0)) {

		game.ball.velocityY = -game.ball.velocityY;
	} else if ( ((game.ball.x - game.ball.radius) < 0) || ((game.ball.x + game.ball.radius) > game.canvas.width) ) {

		game.ball.velocityX = +game.ball.velocityX;
	}
	
	
	if (game.upPressed && game.leftPlayer.paddle.y > 0) {
		game.leftPlayer.paddle.y -= 1.5;
	} else if (game.downPressed && game.leftPlayer.paddle.y < game.canvas.height - game.leftPlayer.paddle.height) {
			game.leftPlayer.paddle.y += 1.5;
	}
	if (game.upPressed2 && game.rightPlayer.paddle.y > 0) {
		game.rightPlayer.paddle.y -= 1.5;
	} else if ( game.downPressed2 && game.rightPlayer.paddle.y < game.canvas.height - game.rightPlayer.paddle.height) {
		game.rightPlayer.paddle.y += 1.5;
	}
}







































export function prup(game: Game, key: any, playerSide: string) {
	if (playerSide === 'left') {
		if (key === 'w') {
			game.upPressed = false;
		} else if (key === 's') {
			game.downPressed = false;
		}
	} else if (playerSide === 'right') {
		if (key === 'ArrowUp') {
			game.upPressed2 = false;
		} else if (key === 'ArrowDown') {
			game.downPressed2 = false;
		}
	}
}

export function prdown(game: Game, key: any, playerSide: string) {
	if (playerSide === 'left') {
		if (key === 'w') {
			game.upPressed = true;
		} else if (key === 's') {
			game.downPressed = true;
		}
	} else if (playerSide === 'right') {
		if (key === 'ArrowUp') {
			game.upPressed2 = true;
		} else if (key === 'ArrowDown') {
			game.downPressed2 = true;
		}
	}
}
