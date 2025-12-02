import { BadRequestException, Injectable, NotFoundException, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Not, SelectQueryBuilder } from 'typeorm';
import { Profile } from '../entities/user.entity';
import { Auth } from '../entities/auth.entity';
import { QueryUserDTO, UpdateProfileDTO, UserProfileDTO } from '../shared/dtos/user.dto';
import { ApiResponse, IApiResponse } from '../shared/helpers/apiresponse';
import { ClusterDTO, ManageUserClustersDTO } from './dtos/cluster.dto';
import { Cluster } from '../entities/cluster.entity';
import { ProfileCluster } from '../entities/user-cluster.entity';
import cluster from 'cluster';
import { IQueryResult } from '../shared/interfaces/api-response.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async updateUser(userId: string, dto: UpdateProfileDTO): Promise<Profile> {
    let newUser: Profile;
    let errorData: unknown;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const { firstName, lastName } = dto;
      const authUser = await queryRunner.manager.findOne(Auth, {
        where: { userId },
        relations: ['profile'],
      });
      if (!authUser) throw new NotFoundException('No user found');
      const profile = authUser.profile;

      if (firstName || lastName) {
        const authData = { firstName, lastName };
        await queryRunner.manager.save(Auth, { ...authUser, ...authData });
      }
      const userData = { ...profile, ...dto };
      const user = await queryRunner.manager.save(Profile, userData);
      await queryRunner.commitTransaction();
      newUser = user;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newUser;
    }
  }

  async getUser(userId: string): Promise<Profile> {
    const user = await this.dataSource.getRepository(Profile).findOne({
      where: { userId },
      relations: ["account","account.role", "profileClusters", "profileClusters.cluster", 'aidServiceProfile'],
    });
    if (!user) throw new NotFoundException('User not found');
    user.account = {
      userId: user.account?.userId,
      firstName: user.account?.firstName,
      role: user?.account?.role
    } as Auth;
    return user;
  }

  async createCluster(dto: ClusterDTO): Promise<Cluster> {
    let newCluster: Cluster;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try{
        await queryRunner.startTransaction();
        const name = dto.name.toLowerCase();
        const existingCluster = await queryRunner.manager.findOneBy(Cluster, {name});
        if(existingCluster) throw new BadRequestException("cluster already exists");
        const clusterData: Partial<Cluster> = {...dto, name};
        const cluster = queryRunner.manager.create(Cluster, clusterData);
        const savedCluster = await queryRunner.manager.save(Cluster, cluster);
        await queryRunner.commitTransaction();
        newCluster = savedCluster;
    }catch(error){
        errorData = error;
        await queryRunner.rollbackTransaction();
    }finally{
        await queryRunner.release();
        if(errorData) throw errorData;
        return newCluster;
    }
  }

async updateCluster( clusterId: number, dto: ClusterDTO): Promise<Cluster> {
    let updatedCluster: Cluster;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try{
        await queryRunner.startTransaction();
        const name = dto.name.toLowerCase();
        const existingCluster = await queryRunner.manager.findOneBy(Cluster, {name, id: Not(clusterId)});
        if(existingCluster) throw new BadRequestException("cluster already exists");

        const cluster = await queryRunner.manager.findOneBy(Cluster, {id: clusterId})
        if(!cluster) throw new NotFoundException("CLUSTER NOT FOUND");

        const clusterData: Partial<Cluster> = {...cluster, ...dto, name};
        const clusterInstance = queryRunner.manager.create(Cluster, clusterData);
        const savedCluster = await queryRunner.manager.save(Cluster, clusterInstance);
        await queryRunner.commitTransaction();
        updatedCluster = savedCluster;
    }catch(error){
        errorData = error;
        await queryRunner.rollbackTransaction();
    }finally{
        await queryRunner.release();
        if(errorData) throw errorData;
        return updatedCluster;
    }
  }

  async getClusters(): Promise<Cluster[]> {
    return this.dataSource.getRepository(Cluster).findBy({});
  }

  async manageUserClusters(
    userId: string,
    dto: ManageUserClustersDTO,
    config: { action: 'Add' | 'Remove'; override: boolean },
  ): Promise<Profile> {
    let updatedUser: Profile;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      const profile = await queryRunner.manager.findOne(Profile, {
        where: { userId },
        relations: ['profileClusters', 'profileClusters.cluster'],
      });
      if (!profile) throw new NotFoundException('No profile found');
      const clusters = await queryRunner.manager.findBy(Cluster, {
        id: In(dto.clusterIds),
      });

      if (config.action === 'Add') {
        let targetProfileClusters: ProfileCluster[];

        if (config.override) {
          targetProfileClusters = queryRunner.manager.create(
            ProfileCluster,
            clusters.map((cl) => ({ profile, cluster: cl })),
          );
          await queryRunner.manager.remove(ProfileCluster, [
            ...(profile.profileClusters || []),
          ]);
        } else {
          const newUserClusters = clusters.filter(
            (clstr) =>
              !Boolean(
                profile.profileClusters?.find(
                  (pClstr) => pClstr.cluster?.id === clstr.id,
                ),
              ),
          );
          targetProfileClusters = queryRunner.manager.create(
            ProfileCluster,
            newUserClusters.map((clstr) => ({
              profile,
              cluster: clstr,
            })),
          );
        }
        await queryRunner.manager.save(ProfileCluster, targetProfileClusters);
      } else if (config.action === 'Remove') {
        if (!profile.profileClusters || profile.profileClusters.length === 0)
          throw new NotFoundException('User has no cluster ');
        const targetProfileClusters = profile.profileClusters.filter((pCltr) =>
          Boolean(dto.clusterIds.find((cId) => cId === pCltr.cluster.id)),
        );
        await queryRunner.manager.save(ProfileCluster, targetProfileClusters);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return updatedUser;
    }
  }

  
    getQueryBuilder(): SelectQueryBuilder<Profile> {
      const repository = this.dataSource.manager.getRepository(Profile);
      return repository.createQueryBuilder('profile')
      .leftJoinAndSelect("profile.profileClusters", "profileClusters")
      .leftJoinAndSelect(`profileClusters.cluster`, "clusters")
      .where("profile.isDeleted = false")
    }
  
    async getUsers(
      dto: QueryUserDTO,
      userid?: string,
    ): Promise<IQueryResult<Profile>> {
      const {clusterIds, searchTerm, order, page, limit, ...queryFields } = dto;
      const queryPage = page ? Number(page) : 1;
      const queryLimit = limit ? Number(limit) : 10;
      const queryOrder = order ? order.toUpperCase() : 'DESC';
      const queryOrderBy = 'createdAt';
  
      const queryBuilder = this.getQueryBuilder();
  
      if (queryFields) {
        Object.keys(queryFields).forEach((field) => {
          queryBuilder.andWhere(`profile.${field} = :value`, {
            value: queryFields[field],
          });
        });
      }
  
      
      
      if (searchTerm) {
        const searchFields = ['address'];
        let queryStr = `LOWER(Profile.firstName) LIKE :searchTerm OR LOWER(users.lastName) LIKE :searchTerm OR LOWER(users.email) LIKE :searchTerm OR LOWER(users.phoneNumber) LIKE :searchTerm`;
        searchFields.forEach((field) => {
          queryStr += ` OR LOWER(Profile.${field}) LIKE :searchTerm`;
        });
        queryBuilder.andWhere(queryStr, {
          searchTerm: `%${searchTerm.toLowerCase().trim()}%`,
        });
      }
  
      const [data, total] = await queryBuilder
        .orderBy(`profile.${queryOrderBy}`, queryOrder as 'ASC' | 'DESC')
        .skip((queryPage - 1) * queryLimit)
        .limit(queryLimit)
        .getManyAndCount();
  
      return { page: queryPage, limit: queryLimit, total, data };
    }
  
}
