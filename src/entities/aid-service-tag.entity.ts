import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tag } from "./tag.entity";
import { AidService } from "./aid-service.entity";

@Entity()
export class AidServiceTag {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tag, (tag) => tag.aidServiceTags)
  tag: Tag;

  @ManyToOne(() => AidService, (aidService) => aidService.aidServiceTags)
  aidService: AidService;

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date;

  
    @Column({type: "bool", default: false})
    isDeleted: boolean;
}