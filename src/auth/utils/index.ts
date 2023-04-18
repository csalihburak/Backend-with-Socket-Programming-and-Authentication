export * from './auth.dto'
export * from './auth.db'
export * from './42ApiUtils'
export * from './auth.utlis'

export const regex = {   
    nickname: /^[a-z]+$/i,
    password: /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*[a-z])(?=.*[A-Z])(?=.{8,})/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    nicknameRules: "-Nickname must be lowercase letters only.",
    passwordRules: "-Password must be at least 8 characters.-The password must contain at least one uppercase letter and at least one lowercase letter.-Password must have at least 1 digit.-The password must have at least one special letter.",
};