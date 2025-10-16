import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter{
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();

        if (exception.code === 'P2002'){
            // Uniqure Constrain Failed
            return res.status(409).json({
                statusCode: 409,
                message: 'Already exist',
                target: (exception.meta?.target as string[]) ?? [],
            });
        }

        //fall back
        return res.status(500).json({
            statuscode: 500,
            message: exception.message,
            code: exception.code,
        });
    }
    
}