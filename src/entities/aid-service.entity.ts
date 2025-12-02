import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Auth } from './auth.entity';
import { Profile } from './user.entity';
import { AidServiceTag } from './aid-service-tag.entity';
import { Booking } from './booking.entity';
import { AidServiceCluster } from './aid-service-cluster.entity';

@Entity()
export class AidService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, default: 0.0 })
  serviceRate?: number;

  @Column({type: "int", nullable: true, default: 0 })
  noOfBookings: number;
  

  
  @OneToMany(() => AidServiceTag, (aidServiceTag) => aidServiceTag.aidService)
  aidServiceTags: AidServiceTag[];
  
  @OneToMany(() => Booking, (booking) => booking.aidService)
    bookings: Booking[];
  
    @ManyToOne(() => Profile)
    profile: Profile;

    @OneToMany(() => AidServiceCluster, (aidServiceCluster) => aidServiceCluster.aidService)
    aidServiceClusters: AidServiceCluster[];
    
  @CreateDateColumn()
  createdAt: Date;

  @Column({type: "bool", default: false})
  isDeleted: boolean;
}
