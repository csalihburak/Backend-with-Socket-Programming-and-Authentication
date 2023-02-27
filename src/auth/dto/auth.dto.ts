import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class AuthDto {

    @IsString()
    @IsNotEmpty()
    username: string

    @IsNotEmpty()    
    @IsString()
    fullName: string
    coalition: string

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}