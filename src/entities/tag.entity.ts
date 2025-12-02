import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AidServiceTag } from "./aid-service-tag.entity";

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => AidServiceTag, (aidServiceTag) => aidServiceTag.tag)
  aidServiceTags: AidServiceTag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date

  @Column({type: "bool", default: false})
  isDeleted: boolean;
}