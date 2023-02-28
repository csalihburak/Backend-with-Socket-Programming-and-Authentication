import { Body, Controller, Get, Post, Query} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Get('intra42')
    async firstInsert(@Query() query) {
        if (!query.code)
            return (JSON.stringify({status: 404, message: "Auth token is not given"}))
        return (await this.authService.intraGet(query.code));
    }

    @Post('singup')
    async signup(@Body() body) {
        
    } 
}