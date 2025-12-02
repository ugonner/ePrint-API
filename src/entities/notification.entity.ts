import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationContext, NotificationEventType } from '../notifiction/enums/notification.enum';
import { Profile } from './user.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({nullable: true})
  description?: string;

  @Column({ type: "json", nullable: true })
  data?: Record<string, unknown>;

  @Column({ nullable: true })
  avatar?: string;

  @Column()
  notificationEventType: NotificationEventType;

  @Column()
  context: NotificationContext;

  @Column({ nullable: true })
  contextEntityId: number;

  @Column({ type: 'boolean', default: false })
  viewed: boolean;

  @ManyToOne(() => Profile)
  creator: Profile;

  @ManyToOne(() => Profile)
  receiver: Profile;


  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({type: "bool", default: false})
  isDeleted: boolean;
}
