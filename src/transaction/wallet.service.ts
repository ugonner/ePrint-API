import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ProfileWallet } from "../entities/user-wallet.entity";

@Injectable()
export class WalletService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ){}

    async getUserWallet(userId: string): Promise<ProfileWallet> {
        return await this.dataSource.getRepository(ProfileWallet).findOneBy({
            profile: {userId}
        })
    }
}