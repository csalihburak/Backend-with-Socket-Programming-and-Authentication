const socket = io('142.93.164.123:3000/game');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var ball = {};
var leftPaddle = {};
var rightPaddle = {};
var leftPlayer = {};
var rightPlayer = {};
var game = {};
var isPlaying = 0;

function drawLine() {
	ctx.beginPath();
	ctx.setLineDash([5, 5]); // Set the dash pattern
	ctx.strokeStyle = '#fff'; // Set the line color
	ctx.moveTo(canvas.width / 2, 0); // Move to the center of the canvas at the top
	ctx.lineTo(canvas.width / 2, canvas.height); // Draw a vertical line to the bottom of the canvas
	ctx.stroke(); // Stroke the line
}

function drawBall() {
	const gradient = ctx.createRadialGradient(
		ball.x,
		ball.y,
		0,
		ball.x,
		ball.y,
		ball.radius,
	);
	gradient.addColorStop(0, ball.color);
	gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
	gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
	gradient.addColorStop(1, 'transparent');
	ctx.save();
	ctx.beginPath();
	ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
	ctx.fillStyle = gradient;
	ctx.shadowColor = game.shadowColor;
	ctx.shadowBlur = ball.shadowBlur;
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;
	ctx.fill();
	ctx.closePath();
	ctx.restore();
}

function drawPaddle(paddle) {
	ctx.fillStyle = paddle.color;
	ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawScores() {
	ctx.font = '20px Arial';
	ctx.fillStyle = 'red';
	ctx.fillText(leftPlayer.name + ': ' + leftPlayer.score, 20, 20);
	ctx.fillText(
		rightPlayer.name + ': ' + rightPlayer.score,
		canvas.width - 120,
		20,
	);
}

socket.on('update', (args) => {
	ball = args.ball;
	leftPlayer = args.leftPlayer;
	rightPlayer = args.rightPlayer;
	leftPaddle = leftPlayer.paddle;
	rightPaddle = rightPlayer.paddle;
});

function update() {
	if (isPlaying) {
		socket.emit('update', [game]);
	}
}

socket.on('test', (data) => {
	console.log(data);
});

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawLine();
	drawBall();
	drawPaddle(leftPaddle);
	drawPaddle(rightPaddle);
	drawScores();
}

function gameLoop() {
	update();
	render();
}

socket.on('start', () => {
	setInterval(gameLoop, 1000 / game.fps);
});

socket.on('stop', () => {
	isPlaying = 0;
	setInterval(gameLoop, 0);
});

document.addEventListener('keyup', function (event) {
	socket.emit('prUp', [event.key, ball, leftPaddle, rightPaddle]);
});
document.addEventListener('keydown', function (event) {
	socket.emit('prDown', [event.key, ball, leftPaddle, rightPaddle]);
});

const startGameBtn = document.getElementById('start-game-btn');
startGameBtn.addEventListener('click', function () {
	const name = document.getElementById('name').value;
	socket.emit('start', [name], (data) => {
		game = data;
		ball = game.ball;
		leftPlayer = game.leftPlayer;
		rightPlayer = game.rightPlayer;
		leftPaddle = leftPlayer.paddle;
		rightPaddle = rightPlayer.paddle;
		render();
	});
	startGameBtn.disabled = true;
	canvas.focus();
});

const join = document.getElementById('join-game-btn');
join.addEventListener('click', function () {
	const name = document.getElementById('name').value;
	socket.emit('join', [name], (data) => {
		game = data;
		ball = game.ball;
		leftPlayer = game.leftPlayer;
		rightPlayer = game.rightPlayer;
		leftPaddle = leftPlayer.paddle;
		rightPaddle = rightPlayer.paddle;
		render();
	});
	startGameBtn.disabled = true;
	canvas.focus();
});

socket.on('startGame', (data) => {
	const countdownEl = document.getElementById('countdown');
	let countdown = 5;
	const timer = setInterval(() => {
		if (countdown === 0) {
			clearInterval(timer);
			countdownEl.style.display = 'none';
			isPlaying = 1;
		} else {
			countdownEl.innerText = countdown;
			countdown--;
		}
	}, 1000);
});
