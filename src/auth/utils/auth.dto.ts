import {
	IsBoolean,
	IsEmail,
	IsNotEmpty,
	IsPhoneNumber,
	IsString,
	Matches,
} from 'class-validator';

export class AuthDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsNotEmpty()
	@IsString()
	fullName: string;
	coalition: string;

	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;
	pictureUrl: string;

	@IsPhoneNumber()
	phoneNumber: string;
}

export class UserInputDto {

	@IsNotEmpty({ message: 'Password can not be empty.' })
	@Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/, {
		message: 'Password is not strong enough.',
	})
	password: string;

	twoFacAuth: boolean;

	@IsNotEmpty({message: 'Username can not be empty.'})
    username: string
}

export class signIndto {
	@IsNotEmpty({ message: 'Password can not be empty.' })
    password: string

    @IsNotEmpty({message: 'Username can not be empty.'})
    username: string
}