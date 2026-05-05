import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "ta";

const LANGUAGE_KEY = "bookal_language";

const STRINGS = {
  en: {
    home: "Home",
    reports: "Reports",
    settings: "Settings",
    new: "New",
    selectLanguage: "Choose language",
    english: "English",
    tamil: "Tamil",
    noVenues: "No venues added. Add venues to start bookings.",
    halls: "Halls",
    rooms: "Rooms",
    revenue: "Revenue",
    bookings: "Bookings",
    free: "Free",
    booked: "Booked",
    addVenue: "Add Venue",
    receipt: "Receipt",
    share: "Share",
    call: "Call",
    customerInformation: "Customer Information",
    eventSchedule: "Event Schedule",
    paymentSummary: "Payment Summary",
    totalAmount: "Total Amount",
    totalFees: "Total Fees",
    advancePaid: "Advance Paid",
    balanceDue: "Balance Due",
    markFullyPaid: "Mark as Fully Paid",
    cancelBooking: "Cancel Booking",
    cancellationReason: "Cancellation Reason",
    submit: "Submit",
    paid: "PAID",
    pending: "PENDING",
    cancelled: "CANCELLED",
    teamMembers: "Team Members",
    total: "Total",
    active: "Active",
    admins: "Admins",
    employees: "Employees",
    addEmployee: "Add Employee",
    noEmployees: "No employees yet",
    addFirstEmployee: "Add First Employee",
    createEmployee: "Create Employee",
    administrators: "Administrators",
    role: "Role",
    password: "Password",
    resetPassword: "Reset Password",
    deleteEmployee: "Delete Employee",
    requiredReason: "Please provide a reason for cancellation",
  },
  ta: {
    home: "முகப்பு",
    reports: "அறிக்கைகள்",
    settings: "அமைப்புகள்",
    new: "புதியது",
    selectLanguage: "மொழியை தேர்வு செய்யவும்",
    english: "ஆங்கிலம்",
    tamil: "தமிழ்",
    noVenues: "இன்னும் இடங்கள் சேர்க்கப்படவில்லை. முன்பதிவை தொடங்க முதலில் இடங்களை சேர்க்கவும்.",
    halls: "மகால்கள்",
    rooms: "அறைகள்",
    revenue: "வருமானம்",
    bookings: "முன்பதிவுகள்",
    free: "காலி",
    booked: "பதிவு செய்யப்பட்டவை",
    addVenue: "இடம் சேர்க்கவும்",
    receipt: "ரசீது",
    share: "பகிர்",
    call: "அழை",
    customerInformation: "வாடிக்கையாளர் தகவல்",
    eventSchedule: "நிகழ்ச்சி அட்டவணை",
    paymentSummary: "கட்டண சுருக்கம்",
    totalAmount: "மொத்த தொகை",
    totalFees: "மொத்த கட்டணம்",
    advancePaid: "முன்பணம் செலுத்தப்பட்டது",
    balanceDue: "மீதமுள்ள தொகை",
    markFullyPaid: "முழுமையாக செலுத்தியதாக குறிக்கவும்",
    cancelBooking: "முன்பதிவை ரத்து செய்",
    cancellationReason: "ரத்து காரணம்",
    submit: "சமர்ப்பிக்கவும்",
    paid: "செலுத்தப்பட்டது",
    pending: "நிலுவையில்",
    cancelled: "ரத்து செய்யப்பட்டது",
    teamMembers: "குழு உறுப்பினர்கள்",
    total: "மொத்தம்",
    active: "செயலில்",
    admins: "நிர்வாகிகள்",
    employees: "பணியாளர்கள்",
    addEmployee: "பணியாளர் சேர்க்கவும்",
    noEmployees: "இன்னும் பணியாளர்கள் இல்லை",
    addFirstEmployee: "முதல் பணியாளரை சேர்க்கவும்",
    createEmployee: "பணியாளரை உருவாக்கவும்",
    administrators: "நிர்வாகிகள்",
    role: "பங்கு",
    password: "கடவுச்சொல்",
    resetPassword: "கடவுச்சொல்லை மாற்று",
    deleteEmployee: "பணியாளரை நீக்கு",
    requiredReason: "ரத்துச் செய்வதற்கான காரணத்தை உள்ளிடவும்",
  },
} as const;

interface LanguageContextValue {
  language: Language | null;
  isReady: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: keyof typeof STRINGS.en) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (value === "en" || value === "ta") {
          setLanguageState(value);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (next: Language) => {
    setLanguageState(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    isReady,
    setLanguage,
    t: (key) => STRINGS[language ?? "en"][key],
  }), [language, isReady]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
