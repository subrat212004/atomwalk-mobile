export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { mobile: string; devOtp?: string; otpMessage?: string };
};

export type AppTabsParamList = {
  Home: undefined;
  Appointments: undefined;
  Health: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  FindDoctors:
    | {
        tenantId?: number;
        hospitalName?: string;
        initialSpecialty?: string;
        initialComplaint?: string;
        patientAwpid?: string;
        patientName?: string;
      }
    | undefined;
  DoctorDetail: { tenantId: number; doctorId: number; initialComplaint?: string; patientAwpid?: string; patientName?: string };
  ConfirmBooking: {
    tenantId: number;
    doctorId: number;
    doctorName: string;
    hospitalName: string;
    date: string;
    time?: string;
    paymentPreference?: "pay_at_desk" | "pay_online";
    chiefComplaint?: string;
    patientAwpid?: string;
    patientName: string;
  };
  BookingSuccess: { hospital: string; doctor: string; date: string; time?: string; tokenNumber: number };
  PrescriptionDetail: { record: import("@/api/types").MedicalRecord };
  Prescriptions: undefined;
  LabReports: { patientAwpid?: string; patientName?: string } | undefined;
  Documents: undefined;
  Notifications: undefined;
  Reschedule: { bookingId: number; tenantId: number; doctorId: number; doctorName: string; hospitalName: string; patientName: string };
  Vaccinations: { patientAwpid?: string; patientName: string };
  ReportVaccination: { patientAwpid?: string; patientName: string };
  HealthTimeline: { patientAwpid?: string; patientName: string };
  HealthVisits: { patientAwpid?: string; patientName: string };
  Growth: { patientAwpid?: string; patientName: string };
  AddFamilyMember: undefined;
};
