import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class AppVersion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable: true})
    detail?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({type: "bool", default: false})
    isDeleted: boolean;
}