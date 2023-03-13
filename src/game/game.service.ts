import { Game } from './gameUtils/game.struct'
import { PrismaClient} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io'
import * as crypto from 'crypto'



export class User {
	id: string;
	username: string;
	socket: Socket;
    rooms: Room[];
    room: Room;
	constructor(id: string, username: string, socket: Socket) {
        this.id = id;
		this.username = username;
        this.rooms = [];
		this.socket = socket;
	}
}

export class Room {
	id: string;
	users: User[] = [];
	loby: User[] = [];
	game: Game;
	status: number;  // 1 is avaliable 0 is empty 2 is full for play
    priv: boolean;
}


@Injectable()
export class GameService {
    users: User[] = [];

    rooms: Room[] = [];


    async handleConnection(client: Socket, args: any) : Promise<User> {
        const user = new User(client.id, args.user, client);
        this.users.push(user);
        return user;
    }

    async getClientById(client: Socket) : Promise<User> {
        for(let i = 0; i < this.users.length; i++) {
            if (this.users[i].id == client.id)
                return this.users[i];
        }
    }

    async getRoomById(id: any) {
        for(let i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i].id == id)
                return this.rooms[i];
        }
    }

    async join(client: Socket, data: any[]) {
        const room = await this.getRoomById(data[0]);
        const user = await this.getClientById(client);
        client.join(data[0]);
        room.users.push(user);
        room.status = 1;
        client.join(room.id);
        this.rooms.push(room);
        user.rooms.push(room);
    }

    async addRoom(name: any) : Promise<Room>{
        const game = new Game();
        const room = new Room();
        room.id = name;
        room.game = game;
        this.rooms.push(room);
        return room;
    }


    async createGame(client: Socket, data: any[]) : Promise<Room> {
        const game = new Game();
		const room = new Room();
		room.game = game;
		room.id = data[0];
		const user = await this.getClientById(client);
		room.users.push(user);
		room.status = 1;
        client.join("burak");
        this.rooms.push(room);
        user.rooms.push(room);
        return room;
    }
}