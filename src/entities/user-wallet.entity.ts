import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Profile } from './user.entity';

@Entity()
export class ProfileWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("numeric", { precision: 12, scale: 2, default: 0 })
  fundedBalance: number;
  
 @Column("numeric", { precision: 12, scale: 2, default: 0 })
  earnedBalance: number;
  
  @Column("numeric", { precision: 12, scale: 2, default: 0 })
  pendingBalance: number;

  @OneToOne(() => Profile, (profile) => profile.wallet)
  profile: Profile;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  
  @Column({type: "bool", default: false})
  isDeleted: boolean;
}
