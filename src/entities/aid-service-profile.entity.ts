import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "./user.entity";
import { Booking } from "./booking.entity";
import { ILocationAddressDTO, ISocialMediaLinksDTO } from "../aid-service/dtos/aid-service.dto";

@Entity()
export class AidServiceProfile {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable: true})
    employeeId: string;

    @Column({type: "int", default: 0})
    noOfServicesCompleted: number;

     @Column({nullable: true})
      contactPhoneNumber?: string;
      
      @Column({nullable: true, type: "json"})
      socialMediaLinks: ISocialMediaLinksDTO;
      
      @Column({nullable: true, type: "json"})
      locationAddress: ILocationAddressDTO;
      
      @Column({nullable: true})
      verificationComment: string;
      
      @Column({type: "float", default: 0})
      averageRating: number;
    
      @Column({type: "float", default: 0})
      noOfRatings: number;
    
      @OneToOne(() => Profile, (profile) => profile.aidServiceProfile)
    profile: Profile;

    @OneToMany(() => Booking, (booking) => booking.aidServiceProfile)
    bookings: Booking[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date

    @Column({type: "bool", default: false})
    isDeleted: boolean;
}