import { Injectable } from "@nestjs/common";
import { channels, PrismaClient, User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import * as cryptojs from 'crypto-js';
import * as crypto from 'crypto';



@Injectable()
export class channelCommands {
    constructor(public prisma: PrismaService) {};

    async banUser(user: User, username: any, channel: channels) : Promise<{messageData:{ id: number, message: string, time: string}, error: string }> {
    const friend = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(friend) {
            if (channel.userIds.includes(friend.id)) {
                if (channel.ownerId !== friend.id) {
                    channel.userIds.splice(channel.userIds.indexOf(friend.id));
                    channel.BannedUsers.push(friend.id);
                    const updateChannel = await this.prisma.channels.update({
                        where: {
                            id: channel.id,
                        },
                        data: {
                            userIds: {set: channel.userIds},
                            BannedUsers: {set: channel.BannedUsers}
                        }
                    });
                    const encryptedMessage = cryptojs.AES.encrypt(`User: ${username} has banned by: ${user.username}`, process.env.SECRET_KEY).toString();
                    let channelMessage = await this.prisma.channelMessages.create({
                        data: {
                            channelId: channel.id,
                            senderId: 'admin',
                            message: encryptedMessage,
                        }
                    });
                    return {messageData : {message: `User: ${username} has banned by: ${user.username}`, id: channelMessage.id, time: channelMessage.time.toLocaleString()}, error: null };
                } else {
                    return {messageData : null, error: 'Admins can not \'ban\' the owner of the channel!'};
                }
            } else {
                return {messageData : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {messageData: null, error : `No such a user: ${username}`};
        }
    }
    
    async muteUser(user: User, username: any,  time: any,  channel: channels) : Promise<{messageData:{ id: number, message: string, time: string}, error: string }>  {
        const friend = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(friend) {
            if (channel.userIds.includes(friend.id)) {
                if (channel.ownerId !== friend.id) {
                    let minutes = parseInt(time);
                    if ( [15, 30, 60].includes(minutes)) {
                        const mutedTime = new Date();
                        mutedTime.setMinutes(mutedTime.getMinutes() + minutes);
                        const userMute = await this.prisma.userMute.create({
                            data: {
                                userId: friend.id,
                                channels: {connect: { id: channel.id }},
                                mutedTime: mutedTime,
                            }
                        });
                        const updatedChannel = await this.prisma.channels.update({
                            where: {
                                id: channel.id,
                            },
                            data: {
                                mutedUsers: {connect: { id: userMute.id }}
                            }
                        });
                        const encryptedMessage = cryptojs.AES.encrypt(`User: ${friend.username} muted for ${minutes} minute.`, process.env.SECRET_KEY).toString();
                        let channelMessage = await this.prisma.channelMessages.create({
                            data: {
                                channelId: channel.id,
                                senderId: 'admin',
                                message: encryptedMessage,
                            }
                        });
                    return {messageData : {message: `User: ${friend.username} muted for ${minutes} minutes.`, id: channelMessage.id, time: channelMessage.time.toLocaleString()}, error: null };

                    } else {
                        return {messageData: null, error: `Invalid mute time (${minutes}) please provide valid one!`};
                    }
                } else {
                    return {messageData : null, error: 'Admins can not \'mute\' the owner of the channel!'};
                }
            } else {
                return {messageData : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {messageData : null, error : `No such a user: ${username}`};
        }
    }
    
    async kickUser(user: User, username: any, channel: channels) :  Promise<{messageData:{ id: number, message: string, time: string}, error: string }> {
        const friend = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(friend) {
            if (channel.userIds.includes(friend.id)) {
                if (channel.ownerId !== friend.id) {
                    channel.userIds.splice(channel.userIds.indexOf(friend.id), 1);
                    const updateChannel = await this.prisma.channels.update({ // revize gelecek
                        where: {
                            id: channel.id,
                        },
                        data: {
                            userIds: {set: channel.userIds},
                        }
                    });
                    const encryptedMessage = cryptojs.AES.encrypt(`User: ${username} has kicked by: `, process.env.SECRET_KEY).toString();
                    let channelMessage = await this.prisma.channelMessages.create({
                        data: {
                            channelId: channel.id,
                            senderId: 'admin',
                            message: encryptedMessage,
                        }
                    });
                    return {messageData : {message: `User: ${username} has kicked by: ${user.username}`, id: channelMessage.id, time: channelMessage.time.toLocaleString()}, error: null };
                } else {
                    return {messageData : null, error: 'Admins can not \'kick\' the owner of the channel!'};
                }
            } else {
                return {messageData : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {messageData : null, error : `No such a user: ${username}`};
        }
    }
       
    async channelPass( user: User, password: string, channel: channels) : Promise<{messageData:{ id: number, message: string, time: string}, error: string }> {
        if (user.id !== channel.ownerId) {
            return {messageData: null, error: 'Only the channel owner can set the channel password'};
        }
        password =  crypto.createHash('sha256').update(password + process.env.SALT_KEY + "42&bG432/+").digest('hex');
        const updatedChannel = await this.prisma.channels.update({
            where: {
                id: channel.id,
            },
            data: {
                password,
            }
            
        });
        const encryptedMessage = cryptojs.AES.encrypt(`Channel (${channel.channelName}) updated!`, process.env.SECRET_KEY).toString();
        let channelMessage = await this.prisma.channelMessages.create({
            data: {
                channelId: channel.id,
                senderId: 'admin',
                message: encryptedMessage,
            }
        });
        return {messageData : {message: `Channel (${channel.channelName}) updated!`, id: channelMessage.id, time: channelMessage.time.toLocaleString()}, error: null };
    }
    
    async userMode(user: User, username: string, channel: channels) : Promise<{messageData:{ id: number, message: string, time: string}, error: string }> {
        if (user.id !== channel.ownerId) {
            return {messageData : null, error: 'Only the channel owner can set the channel password'};
        }
        const friend = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(friend) {
            if (channel.userIds.includes(friend.id)) {
                channel.adminIds.push(friend.id);
                const updateChannel = await this.prisma.channels.update({
                    where: {
                        id: channel.id,
                    },
                    data: {
                        adminIds: { set: channel.userIds },
                    }
                });
                const encryptedMessage = cryptojs.AES.encrypt(`User: ${username} has now one of the channel admins!`, process.env.SECRET_KEY).toString();
                let channelMessage = await this.prisma.channelMessages.create({
                    data: {
                        channelId: channel.id,
                        senderId: 'admin',
                        message: encryptedMessage,
                    }
                });
                return {messageData : {message: `User: ${username} has now one of the channel admins!`, id: channelMessage.id, time: channelMessage.time.toLocaleString()}, error: null };
            } else {
                return {messageData : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {messageData : null, error : `No such a user: ${username}`};
        }
    }
}
