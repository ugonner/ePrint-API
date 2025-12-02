import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "./user.entity";
import { PaymentMethod, PaymentPurpose, PaymentStatus } from "../transaction/enums/payment.enum";
import { Booking } from "./booking.entity";

@Entity()
export class PaymentTransaction {
    @PrimaryGeneratedColumn('uuid')
      id?: string;

      @Column({nullable: true})
      paymentRef: string;

      @Column()
      paymentMethod: PaymentMethod;

      @Column()
      paymentStatus: PaymentStatus

      @Column()
      paymentPurpose: PaymentPurpose;

      @Column()
      amount: number;

      @OneToOne(() => Booking, (booking) => booking.paymentTransaction)
      @JoinColumn()
      booking: Booking;

      @ManyToOne(() => Profile)
      profile: Profile;

      @CreateDateColumn()
      createdAt: Date

      @UpdateDateColumn()
      updatedAt: Date;
    
}