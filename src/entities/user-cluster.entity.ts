import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cluster } from './cluster.entity';
import { Profile } from './user.entity';

@Entity()
export class ProfileCluster {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => Cluster, (cluster) => cluster.profileClusters)
  cluster: Cluster;

  @ManyToOne(() => Profile, (profile) => profile.profileClusters)
  profile: Profile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'bool', default: false })
  isDeleted: boolean;
}
