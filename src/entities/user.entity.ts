import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Auth } from './auth.entity';
import { DisabilityType, Gender } from '../shared/enums/user.enum';

import { ProfileWallet } from './user-wallet.entity';
import { Booking } from './booking.entity';
import { ProfileCluster } from './user-cluster.entity';
import { AidServiceProfile } from './aid-service-profile.entity';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  gender?: Gender;

  @Column({ nullable: true })
  phoneNumber?: string;
  
  @Column({ nullable: true })
  disabilityType: DisabilityType;

  @OneToOne(() => Auth, (auth) => auth.profile)
  account: Auth;




  
    @OneToOne(() => ProfileWallet, (profileWallet) => profileWallet.profile, {
      cascade: true,
      onDelete: 'CASCADE',
    })
    @JoinColumn()
    wallet: ProfileWallet;
    
    @OneToOne(() => AidServiceProfile, (aidServiceProfile) => aidServiceProfile.profile, {
      cascade: true,
      onDelete: 'CASCADE',
    })
    @JoinColumn()
    aidServiceProfile: AidServiceProfile;

    @OneToMany(() => ProfileCluster, (profileCluster) => profileCluster.profile )
    profileClusters: ProfileCluster[];

    @OneToMany(() => Booking, (booking) => booking.profile)
      bookings: Booking[];
    

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  @Column({type: "bool", default: false})
  isDeleted: boolean;
}
