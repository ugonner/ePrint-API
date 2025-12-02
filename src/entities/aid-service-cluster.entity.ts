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
import { AidService } from './aid-service.entity';

@Entity()
export class AidServiceCluster {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => Cluster, (cluster) => cluster.aidServiceClusters)
  cluster: Cluster;

  @ManyToOne(() => AidService, (aidService) => aidService.aidServiceClusters)
  aidService: AidService;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'bool', default: false })
  isDeleted: boolean;
}
