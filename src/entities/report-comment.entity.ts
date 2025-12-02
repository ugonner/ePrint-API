import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "./user.entity";
import { Report } from "./report.entity";

@Entity()
export class ReportComment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    comment: string;

    @ManyToOne(() => Profile)
    profile: Profile

    @ManyToOne(() => Report)
    report: Report;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({type: "bool", default: false})
    isDeleted: boolean;
}