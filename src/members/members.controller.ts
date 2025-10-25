import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { MembersService } from './members.service';

import { CreateMember } from './dto/create-member/create-member';

@Controller('members')
export class MembersController {
    constructor(private readonly members: MembersService){}

    @Get()
    list(){
        return this.members.list();
    }

    @Post()
    @UsePipes(new ValidationPipe({whitelist: true, transform: true}))
    create(@Body() body: CreateMember){
        return this.members.create(body.email);
    }

    @Get(':email')
    getOne (@Param('email') email:string){
        return this.members.findByEmail(email)
    }

}
