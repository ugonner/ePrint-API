import { Logger } from "@nestjs/common";
import { FindOptionsWhere, QueryRunner, Repository, SelectQueryBuilder } from "typeorm";

export class DBUtils{
    static async handleFailedQueryRunner(queryRunner: QueryRunner, error: Error){
        await queryRunner.rollbackTransaction();
        (new Logger("HandleQueryRunnerTransactionFailure")).error(error?.message)
    }

    static async generateUniqueID<T>(repository: Repository<T>, uniqueProperty: string, length = 8, baseString = ""): Promise<string>{
        baseString = baseString ? baseString : `${Math.random().toString(16).slice(2, length)}`
        const entityExists = await repository.findOneBy({[uniqueProperty]: baseString} as FindOptionsWhere<T>);
        if(!entityExists) return baseString;
         baseString = `${baseString}-${Math.random().toString(16).slice(2, (length))}`;
        return await DBUtils.generateUniqueID(repository, uniqueProperty, length, baseString); 
    }

    static addTime(baseDate: Date, duration: number, timeType: "Days" | "Hours" | "Minutes" | "Seconds" | "Milliseconds" = "Minutes"): Date {
        let timeSpan: number;
        switch(timeType){
            case "Days":
                timeSpan = (24 * 60 * 60 * 1000 * duration);
            case "Hours":
                timeSpan = (60 * 60 * 1000 * duration);
            case "Minutes":
                timeSpan = (60 * 1000 * duration);
            case "Seconds":
                timeSpan = (1000 * duration);
            case "Milliseconds":
                timeSpan = (duration);
            default:
                timeSpan = (60 * 1000 * duration);
            break;
        }
        return new Date(baseDate.getTime() + timeSpan);
    }
}

export function handleDateQuery<TEntity>(dto: {
    startDate?: string;
    endDate?: string;
    dDate?: string;
    entityAlias: string
}, queryBuilder: SelectQueryBuilder<TEntity>, dateField = "createdAt"): SelectQueryBuilder<TEntity>{
   const {startDate, endDate, dDate, entityAlias} = dto;
   
    if(startDate && !endDate) queryBuilder.andWhere(`${entityAlias}.${dateField} >= :startDate`, {startDate});
    else if(endDate && !startDate) queryBuilder.andWhere(`${entityAlias}.${dateField} <= :endDate`, {endDate});
    else if(startDate && endDate) queryBuilder.andWhere(`DATE(${entityAlias}.${dateField}) BETWEEN :startDate AND :endDate`, {startDate, endDate});
    else if(dDate) queryBuilder.andWhere(`DATE(${entityAlias}.${dateField}) = :dDate`, {dDate})
  
return queryBuilder;
}