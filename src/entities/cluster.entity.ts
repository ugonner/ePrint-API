import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "./user.entity";
import { ProfileCluster } from "./user-cluster.entity";
import { AidServiceCluster } from "./aid-service-cluster.entity";

@Entity()
export class Cluster {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    name: string;

    @Column({nullable: true})
    description: string;

    
    
        @OneToMany(() => ProfileCluster, (profileCluster) => profileCluster.cluster )
        profileClusters: ProfileCluster[];

        
            @OneToMany(() => AidServiceCluster, (aidServiceCluster) => aidServiceCluster.aidService)
            aidServiceClusters: AidServiceCluster[];
    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({type: "bool", default: false})
    isDeleted: boolean;
}