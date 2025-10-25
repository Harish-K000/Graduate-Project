import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class MembersService {
    constructor(private prisma: PrismaService){}
        //GET/members
    list(){
        return this.prisma.member.findMany({
            orderBy: {createdAt:'desc'},
            take: 50,
        });
    }

    //POST /members {email:string}
    create(email: string){
        return this.prisma.member.create({
            data: {email},
        });
    }

    findByEmail(email: string){
        return this.prisma.member.findUnique({
            where: {email}
        });
    }
}
