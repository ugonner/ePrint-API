import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ServiceType } from "../shared/enums/review";

@Entity()
export class ReviewAndRating {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    rating: number;

    @Column({nullable: true})
    review: string;

    @Column()
    serviceType: ServiceType;

    @Column()
    serviceTypeEntityId: number;

    @Column()
    profileId: number;

    @CreateDateColumn()
    createdAt: Date;

    @Column({default: false})
    isDeleted: boolean;
}