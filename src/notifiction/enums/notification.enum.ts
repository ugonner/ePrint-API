export enum NotificationEventType {
  AID_SERVICE_PROFILE_APPLICATION = "Aid Service Profile Application",
  AID_SERVICE_PROFILE_VERIFICATION_UPDATE = "Aid Service Profile Verification Update",
  AID_SERVICE_PROFILE_APPLICATION_UPDATE = "Aid Service Profile Application Update",
  AID_SERVICE_PROFILE_APPLICATION_APPROVED = "Aid Service Profile Application Approved",
  
  AID_SERVICE_BOOKING_CREATION = "Aid Service Booking Creation",
  AID_SERVICE_BOOKING_UPDATE = "Aid Service Booking Update",
  AID_SERVICE_BOOKING_PROVIDER_MATCH = "Aid Service Booking Provider Match",

  PAYMENT_MADE = "Payment Made",

  REVIEW_AND_RATING_MADE = "Review Rating Made",

  REPORT = "Reported",
  REPORT_COMMENT = "Report Response",
  REPORT_RESOLUTION = "Report resolution"

  
}

export enum NotificationContext {
  SERVICE_PROFILE = "Service Profile",
  SERVICE = "Service",
  SERVICE_BOOKING = "Service Booking",
  PAYMENT = "Payment",
  REPORT = "Report",
  REVIEW_RATING = "Review Rating",
  USER = "User"
}
