import { RoomType } from "../enums/call.enum";
import { UserCallState } from "../enums/user.enum";

export interface IConnectedUser {
  userId?: string;
  userName?: string;
  avatar?: string;
  socketId?: string;
  peerId?: string;
  callState?: UserCallState;
  roomId?: string;
  roomType?: RoomType;
  isVideoTurnedOff?: boolean;
  isAudioTurnedOff?: boolean;
}


export interface IConnectedSocketUsersRecord {
  totalUsers: number;
  totalAidServiceProfiles: number;
}