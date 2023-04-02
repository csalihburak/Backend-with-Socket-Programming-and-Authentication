import { channels, PrismaClient } from "@prisma/client";
import * as crypto from 'crypto';
import { PrismaService } from "src/prisma/prisma.service";


export class channelCommands {

    constructor(public prisma: PrismaService) {};

    async banUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
    const user = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(user) {
            if (channel.userIds.includes(user.id)) {
                if (channel.ownerId !== user.id) {
                    channel.userIds.splice(channel.userIds.indexOf(user.id));
                    channel.BannedUsers.push(user.id);
                    const updateChannel = await this.prisma.channels.update({
                        where: {
                            id: channel.id,
                        },
                        data: {
                            userIds: {set: channel.userIds},
                            BannedUsers: {set: channel.BannedUsers}
                        }
                    });
                    return {message : `User: ${username} has banned by: `, error: null };
                } else {
                    return {message : null, error: 'Admins can not \'ban\' the owner of the channel!'};
                }
            } else {
                return {message : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {message: null, error : `No such a user: ${username}`};
        }
    }
    
    async muteUser(username: any,  time: any,  channel: channels) : Promise<{message: string, error: string }> {
        const user = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(user) {
            if (channel.userIds.includes(user.id)) {
                if (channel.ownerId !== user.id) {
                    let minutes = parseInt(time);
                    if ( [15, 30, 60].includes(minutes)) {
                        const mutedTime = new Date();
                        mutedTime.setMinutes(mutedTime.getMinutes() + minutes);
                        const userMute = await this.prisma.userMute.create({
                            data: {
                                userId: user.id,
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
                        return {message: `User: ${user.username} muted for ${minutes} minut.`, error: null};
                    } else {
                        return {message: null, error: `Invalid mute time (${minutes}) please provide valid one!`};
                    }
                } else {
                    return {message : null, error: 'Admins can not \'mute\' the owner of the channel!'};
                }
            } else {
                return {message : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {message: null, error : `No such a user: ${username}`};
        }
    }
    
    async kickUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
        const user = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(user) {
            if (channel.userIds.includes(user.id)) {
                if (channel.ownerId !== user.id) {
                    channel.userIds.splice(channel.userIds.indexOf(user.id));
                    const updateChannel = await this.prisma.channels.update({
                        where: {
                            id: channel.id,
                        },
                        data: {
                            userIds: {set: channel.userIds},
                        }
                    });
                    return {message : `User: ${username} has kicked by: `, error: null };
                } else {
                    return {message : null, error: 'Admins can not \'kick\' the owner of the channel!'};
                }
            } else {
                return {message : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {message: null, error : `No such a user: ${username}`};
        }
    }
       
    async channelPass( senderId: number, password: string, channel: channels) : Promise<{message: string, error: string }> {
        if (senderId !== channel.ownerId) {
            return {message: null, error: 'Only the channel owner can set the channel password'};
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
        return {message: `Channel (${channel.channelName}) updated!`, error: null}
    }
    
    async userMode(senderId: number, username: string, channel: channels) : Promise<{message: string, error: string }> {
        if (senderId !== channel.ownerId) {
            return {message: null, error: 'Only the channel owner can set the channel password'};
        }
        const user = await this.prisma.user.findUnique({
            where: {
                username,
            }
        });
        if(user) {
            if (channel.userIds.includes(user.id)) {
                channel.adminIds.push(user.id);
                const updateChannel = await this.prisma.channels.update({
                    where: {
                        id: channel.id,
                    },
                    data: {
                        adminIds: { set: channel.userIds },
                    }
                });
                return {message : `User: ${username} has now one of the channel admins!`, error: null };
            } else {
                return {message : null, error :`User: ${username} not in the channel!`};
            }
        } else {
            return {message: null, error : `No such a user: ${username}`};
        }
    }
}
