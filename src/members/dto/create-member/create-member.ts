import { IsEmail } from "class-validator";

export class CreateMember {
    @IsEmail()
    email!: string;
}
