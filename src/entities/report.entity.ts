import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ServiceType } from "../shared/enums/review";
import { Profile } from "./user.entity";

@Entity()
export class Report {
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

    @Column({type: "bool", default: false})
    isResolved: boolean;

    @Column({nullable: true})
    resolvedById: number;

    @ManyToOne(() => Profile)
    @JoinColumn({
        name: "profile_id"
    })
    profile: Profile;

    @ManyToOne(() => Profile)
    entityOwner: Profile;

    @Column({nullable: true})
    comment?: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({default: false})
    isDeleted: boolean;
}