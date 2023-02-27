import { Body, Controller, Get, Post, Query, Req} from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpService } from "@nestjs/axios";
import { AuthDto } from './dto'
import fs from 'fs';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Get('intra42')
    deneme(@Query() query) : any{
        const http = HttpService;
        this.authService.intraGet(query.code, callback => {
        });
        return 'hello';
    }
}