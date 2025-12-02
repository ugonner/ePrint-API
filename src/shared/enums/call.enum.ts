
export enum CallState {
  INCOMING = "Incoming",
  ONGOING = "Ongoing",
  DROPPED = "Dropped",
  CALLING = "Calling",
  NONE = "None",
}

export enum RoomType {
  PEER_TO_PEER = "Peer_to_peer",
  CONFERENCE = "Conference"
}

export enum CallType {
  AUDIO = "Audio",
  VIDEO = "Video"
}

export enum SDPType {
  ANSWER = "Answer",
  OFFER = "Offer",
  DATA = "Data"
}

export enum CallQuality {
  HIGH = "High",
  LOW = "Low",
  VERY_LOW = "Very_low"
}

export enum IceConnectionState {
  NEW = "new",
  CONNECTING = "connecting",
  CONNECTED = "connected", 
  DISCONNECTED = "disconnected" ,
  FAILED = "failed",
  CLOSED = "closed"
}

export enum CallStage {
  DIALING = "Dialing",
  DIALING_IN = "Dialing In",
  RINGING = "Ringing",
  RECONNECTING = "Reconnecting",
  ENDED = "Ended",
  DROPPED = "Dropped",
  NONE = "None"
}

export enum callPurpose {
  AID_SERVICE = "Aid_service",
  NORMAL = "Normal"
}