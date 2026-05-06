import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "ta";

const LANGUAGE_KEY = "bookal_language";

const STRINGS = {
  en: {
    // --- Tab bar ---
    home: "Home",
    reports: "Reports",
    settings: "Settings",
    new: "New",

    // --- Language ---
    selectLanguage: "Choose language",
    english: "English",
    tamil: "Tamil",

    // --- Home screen ---
    goodMorning: "Good Morning",
    goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening",
    total: "Total",
    todaysSchedule: "Today's Schedule",
    tomorrow: "Tomorrow",
    upcomingBookings: "Upcoming Bookings",
    pastHistory: "Past History",
    searchPlaceholder: "Search by name or phone...",
    searchResults: "Search Results",
    noBookingsFound: "No bookings found",
    createBooking: "Create Booking",
    myProfile: "My Profile",
    logout: "Logout",
    revenue: "Revenue",
    halls: "Halls",
    rooms: "Rooms",
    bookings: "Bookings",
    booked: "Booked",

    // --- Venues ---
    noVenues: "No venues added. Add venues to start bookings.",
    free: "Free",
    addVenue: "Add Venue",
    noVenue: "No venue",

    // --- Booking card ---
    cancelled: "Cancelled",
    completed: "Completed",
    today: "Today",
    confirmed: "Confirmed",

    // --- Booking detail ---
    receipt: "Receipt",
    share: "Share",
    call: "Call",
    customerInformation: "Customer Information",
    clientName: "Client Name",
    contactNumbers: "Contact Numbers",
    address: "Address",
    noAddressProvided: "No address provided",
    eventSchedule: "Event Schedule",
    timing: "Timing",
    hoursDuration: "Hours Duration",
    selectedVenues: "Selected Venues",
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
    paymentError: "Payment Error",
    couldNotConnectServer: "Could not connect to server.",
    requiredReason: "Please provide a reason for cancellation",
    errorTitle: "Error",

    // --- Reports ---
    todayPreset: "Today",
    weekPreset: "Week",
    monthPreset: "Month",
    allPreset: "All",
    customPreset: "Custom",
    exportExcel: "Export Excel",
    downloadPdf: "Download PDF",
    adminOnly: "Admin Only",
    reportsAdminOnly: "Reports are only accessible to admins",
    fromPlaceholder: "From (YYYY-MM-DD)",
    toPlaceholder: "To (YYYY-MM-DD)",
    venuePerformance: "Venue Performance",
    byEmployee: "By Employee",
    reportBookings: "Bookings",
    totalBookings: "Total Bookings",
    confirmedBookings: "Confirmed",
    cancelledBookings: "Cancelled",
    avgValue: "Avg Value",
    excelError: "Could not generate Excel report.",
    pdfError: "Could not generate PDF report.",

    // --- Settings ---
    selectLanguageSetting: "Language",
    venuePricing: "Venue Pricing",
    businessInformation: "Business Information",
    rulesDocuments: "Rules & Documents",
    team: "Team",
    account: "Account",
    manageVenues: "Manage Venues & Amenities",
    manageEmployees: "Manage Employees",
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    businessName: "Business Name",
    taglineMotto: "Tagline / Motto",
    gstNumber: "GST Number",
    phone: "Phone",
    email: "Email",
    addressSetting: "Address",
    saveBusinessProfile: "Save Business Profile",
    currentRulesPdf: "Current Rules PDF:",
    noRulesPdf: "No rules PDF uploaded",
    preview: "Preview",
    upload: "Upload",
    uploadComplete: "Upload Complete",
    rulesUploaded: "The Rules PDF has been uploaded and synced successfully.",
    uploadError: "Upload Error",
    settingsSaved: "Settings Saved",
    settingsSavedMsg: "Your business profile and PDF contact details have been updated.",
    saveError: "Save Error",
    fileNotFound: "File Not Found",
    noRulesPdfUploaded: "No rules PDF has been uploaded yet.",

    // --- Employees ---
    teamMembers: "Team Members",
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
    fullName: "Full Name",
    create: "Create",
    cancel: "Cancel",
    delete: "Delete",
    deleteConfirmation: "Delete Confirmation",
    deleteEmployeeConfirm: "Are you sure you want to delete this employee?",
    resetPasswordConfirm: "Reset Password Confirmation",
    enterNewPassword: "Enter new password",
    passwordMinLength: "Password must be at least 6 characters",
    employeeCreated: "Employee created successfully",
    passwordReset: "Password reset successfully",
    employeeDeleted: "Employee deleted successfully",
    profileUpdated: "Profile Updated",
    profileUpdatedMsg: "Employee profile updated",

    // --- Edit profile ---
    editProfileTitle: "Edit Profile",
    fullNameLabel: "Full Name",
    phoneNumber: "Phone Number",
    dateOfBirth: "Date of Birth",
    selectDate: "Select Date",
    saveChanges: "Save Changes",
    profileUpdatedTitle: "Profile Updated",
    profileUpdatedDesc: "Your personal information has been saved successfully.",
    updateFailed: "Update Failed",
    selectBirthDate: "Select Birth Date",
    confirmDate: "Confirm",

    // --- Change password ---
    changePasswordTitle: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    updatePassword: "Update Password",
    passwordChanged: "Password Changed",
    passwordChangedMsg: "Your password has been updated successfully.",
    passwordsDontMatch: "Passwords do not match",
    currentPasswordRequired: "Current password is required",
    mustChangePasswordMsg: "You must change your password before continuing.",

    // --- New booking ---
    newBooking: "New Booking",
    editBooking: "Edit Booking",
    customerNameLabel: "Customer Name",
    phoneNumbersLabel: "Phone Numbers",
    addPhoneNumber: "Add Phone Number",
    addressOptional: "Address (Optional)",
    selectVenues: "Select Venues",
    bookingDate: "Booking Date",
    startTime: "Start Time",
    endTime: "End Time",
    duration: "Duration",
    advanceAmount: "Advance Amount",
    notesOptional: "Notes (Optional)",
    saveBooking: "Save Booking",
    updateBooking: "Update Booking",
    bookingCreated: "Booking created successfully",
    bookingUpdated: "Booking updated successfully",
    fillRequiredFields: "Please fill in all required fields",
    selectAtLeastOneVenue: "Select at least one venue",
    endTimeAfterStart: "End time must be after start time",
    conflictError: "Venue is already booked for this time slot",
    hours: "hours",

    // --- Manage venues ---
    manageVenuesTitle: "Manage Venues",
    venueName: "Venue Name",
    venueType: "Venue Type",
    mahal: "Mahal",
    room: "Room",
    pricePerHour: "Price per Hour",
    displayOrder: "Display Order",
    isActive: "Active",
    saveVenue: "Save Venue",
    createVenue: "Create Venue",
    venueCreated: "Venue created successfully",
    venueUpdated: "Venue updated successfully",
    noVenuesYet: "No venues yet",
    addYourFirstVenue: "Add your first venue to start accepting bookings",
    amenities: "Amenities",
    colorTag: "Color Tag",

    // --- Login ---
    welcomeBack: "Welcome back",
    signInToContinue: "Sign in to continue",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "••••••••",
    signIn: "Sign In",
    pleaseEnterEmailPassword: "Please enter email and password",
    version: "Bookal v1.0",
    networkError: "Network error. Check your internet connection.",
    connectionTimedOut: "Connection timed out. Server may be unreachable.",
    unexpectedResponse: "Server returned an unexpected response. Check the server URL.",
    unexpectedError: "An unexpected error occurred",

    // --- Amenities bill ---
    amenitiesBill: "Amenities",
    amenitiesBills: "Amenities Bills",
    newBill: "New Bill",
    generateBill: "Generate Bill",
    noAmenityBills: "No amenity bills yet",
    recordAdvance: "Record Advance",
    recordAdvancePayment: "Record Advance Payment",
    record: "Record",
    cannotCancel: "Cannot cancel",
    enterValidAmount: "Enter a valid advance amount",
    addAtLeastOneItem: "Add at least one item with name and amount",

    // --- Generic / shared ---
    back: "Back",
    done: "Done",
    ok: "OK",
    success: "Success",
    failed: "Failed",
    loading: "Loading...",
    noData: "No data available",
    required: "Required",
    optional: "Optional",
    save: "Save",
    close: "Close",
  },

  ta: {
    // --- Tab bar ---
    home: "முகப்பு",
    reports: "அறிக்கைகள்",
    settings: "அமைப்புகள்",
    new: "புதியது",

    // --- Language ---
    selectLanguage: "மொழியை தேர்வு செய்யவும்",
    english: "ஆங்கிலம்",
    tamil: "தமிழ்",

    // --- Home screen ---
    goodMorning: "காலை வணக்கம்",
    goodAfternoon: "மதிய வணக்கம்",
    goodEvening: "மாலை வணக்கம்",
    total: "மொத்தம்",
    todaysSchedule: "இன்றைய அட்டவணை",
    tomorrow: "நாளை",
    upcomingBookings: "வரவிருக்கும் முன்பதிவுகள்",
    pastHistory: "கடந்த வரலாறு",
    searchPlaceholder: "பெயர் அல்லது தொலைபேசி மூலம் தேடுங்கள்...",
    searchResults: "தேடல் முடிவுகள்",
    noBookingsFound: "முன்பதிவுகள் எதுவும் இல்லை",
    createBooking: "முன்பதிவு உருவாக்கவும்",
    myProfile: "எனது சுயவிவரம்",
    logout: "வெளியேறு",
    revenue: "வருமானம்",
    halls: "மகால்கள்",
    rooms: "அறைகள்",
    bookings: "முன்பதிவுகள்",
    booked: "பதிவு செய்யப்பட்டவை",

    // --- Venues ---
    noVenues: "இன்னும் இடங்கள் சேர்க்கப்படவில்லை. முன்பதிவை தொடங்க முதலில் இடங்களை சேர்க்கவும்.",
    free: "காலி",
    addVenue: "இடம் சேர்க்கவும்",
    noVenue: "இடம் இல்லை",

    // --- Booking card ---
    cancelled: "ரத்து செய்யப்பட்டது",
    completed: "முடிந்தது",
    today: "இன்று",
    confirmed: "உறுதி செய்யப்பட்டது",

    // --- Booking detail ---
    receipt: "ரசீது",
    share: "பகிர்",
    call: "அழை",
    customerInformation: "வாடிக்கையாளர் தகவல்",
    clientName: "வாடிக்கையாளர் பெயர்",
    contactNumbers: "தொடர்பு எண்கள்",
    address: "முகவரி",
    noAddressProvided: "முகவரி வழங்கப்படவில்லை",
    eventSchedule: "நிகழ்ச்சி அட்டவணை",
    timing: "நேரம்",
    hoursDuration: "மணி நேர காலம்",
    selectedVenues: "தேர்ந்தெடுக்கப்பட்ட இடங்கள்",
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
    paymentError: "கட்டண பிழை",
    couldNotConnectServer: "சர்வருடன் இணைக்க முடியவில்லை.",
    requiredReason: "ரத்துச் செய்வதற்கான காரணத்தை உள்ளிடவும்",
    errorTitle: "பிழை",

    // --- Reports ---
    todayPreset: "இன்று",
    weekPreset: "வாரம்",
    monthPreset: "மாதம்",
    allPreset: "அனைத்தும்",
    customPreset: "தனிப்பயன்",
    exportExcel: "எக்செல் ஏற்றுமதி",
    downloadPdf: "PDF பதிவிறக்கம்",
    adminOnly: "நிர்வாகி மட்டும்",
    reportsAdminOnly: "அறிக்கைகள் நிர்வாகிகளுக்கு மட்டுமே",
    fromPlaceholder: "இருந்து (YYYY-MM-DD)",
    toPlaceholder: "வரை (YYYY-MM-DD)",
    venuePerformance: "இட செயல்திறன்",
    byEmployee: "பணியாளர் வாரியாக",
    reportBookings: "முன்பதிவுகள்",
    totalBookings: "மொத்த முன்பதிவுகள்",
    confirmedBookings: "உறுதி செய்யப்பட்டவை",
    cancelledBookings: "ரத்து செய்யப்பட்டவை",
    avgValue: "சராசரி மதிப்பு",
    excelError: "எக்செல் அறிக்கையை உருவாக்க முடியவில்லை.",
    pdfError: "PDF அறிக்கையை உருவாக்க முடியவில்லை.",

    // --- Settings ---
    selectLanguageSetting: "மொழி",
    venuePricing: "இட விலை நிர்ணயம்",
    businessInformation: "வணிக தகவல்",
    rulesDocuments: "விதிகள் & ஆவணங்கள்",
    team: "குழு",
    account: "கணக்கு",
    manageVenues: "இடங்கள் & வசதிகளை நிர்வகி",
    manageEmployees: "பணியாளர்களை நிர்வகி",
    editProfile: "சுயவிவரத்தை திருத்து",
    changePassword: "கடவுச்சொல்லை மாற்று",
    businessName: "வணிக பெயர்",
    taglineMotto: "குறிக்கோள் வாசகம்",
    gstNumber: "GST எண்",
    phone: "தொலைபேசி",
    email: "மின்னஞ்சல்",
    addressSetting: "முகவரி",
    saveBusinessProfile: "வணிக சுயவிவரத்தை சேமி",
    currentRulesPdf: "தற்போதைய விதிகள் PDF:",
    noRulesPdf: "விதிகள் PDF பதிவேற்றப்படவில்லை",
    preview: "முன்னோட்டம்",
    upload: "பதிவேற்று",
    uploadComplete: "பதிவேற்றம் முடிந்தது",
    rulesUploaded: "விதிகள் PDF பதிவேற்றப்பட்டு ஒத்திசைக்கப்பட்டது.",
    uploadError: "பதிவேற்ற பிழை",
    settingsSaved: "அமைப்புகள் சேமிக்கப்பட்டன",
    settingsSavedMsg: "உங்கள் வணிக சுயவிவரம் மற்றும் PDF தொடர்பு விவரங்கள் புதுப்பிக்கப்பட்டுள்ளன.",
    saveError: "சேமிப்பு பிழை",
    fileNotFound: "கோப்பு கிடைக்கவில்லை",
    noRulesPdfUploaded: "இன்னும் விதிகள் PDF பதிவேற்றப்படவில்லை.",

    // --- Employees ---
    teamMembers: "குழு உறுப்பினர்கள்",
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
    fullName: "முழு பெயர்",
    create: "உருவாக்கு",
    cancel: "ரத்து செய்",
    delete: "நீக்கு",
    deleteConfirmation: "நீக்குதல் உறுதிப்படுத்தல்",
    deleteEmployeeConfirm: "இந்த பணியாளரை நீக்க விரும்புகிறீர்களா?",
    resetPasswordConfirm: "கடவுச்சொல் மாற்ற உறுதிப்படுத்தல்",
    enterNewPassword: "புதிய கடவுச்சொல்லை உள்ளிடவும்",
    passwordMinLength: "கடவுச்சொல் குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும்",
    employeeCreated: "பணியாளர் வெற்றிகரமாக உருவாக்கப்பட்டார்",
    passwordReset: "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது",
    employeeDeleted: "பணியாளர் வெற்றிகரமாக நீக்கப்பட்டார்",
    profileUpdated: "சுயவிவரம் புதுப்பிக்கப்பட்டது",
    profileUpdatedMsg: "பணியாளர் சுயவிவரம் புதுப்பிக்கப்பட்டது",

    // --- Edit profile ---
    editProfileTitle: "சுயவிவரத்தை திருத்து",
    fullNameLabel: "முழு பெயர்",
    phoneNumber: "தொலைபேசி எண்",
    dateOfBirth: "பிறந்த தேதி",
    selectDate: "தேதியை தேர்ந்தெடுக்கவும்",
    saveChanges: "மாற்றங்களை சேமி",
    profileUpdatedTitle: "சுயவிவரம் புதுப்பிக்கப்பட்டது",
    profileUpdatedDesc: "உங்கள் தனிப்பட்ட தகவல் வெற்றிகரமாக சேமிக்கப்பட்டது.",
    updateFailed: "புதுப்பிப்பு தோல்வி",
    selectBirthDate: "பிறந்த தேதியை தேர்ந்தெடுக்கவும்",
    confirmDate: "தேதியை உறுதிப்படுத்து",

    // --- Change password ---
    changePasswordTitle: "கடவுச்சொல்லை மாற்று",
    currentPassword: "தற்போதைய கடவுச்சொல்",
    newPassword: "புதிய கடவுச்சொல்",
    confirmNewPassword: "புதிய கடவுச்சொல்லை உறுதிப்படுத்து",
    updatePassword: "கடவுச்சொல்லை புதுப்பி",
    passwordChanged: "கடவுச்சொல் மாற்றப்பட்டது",
    passwordChangedMsg: "உங்கள் கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது.",
    passwordsDontMatch: "கடவுச்சொற்கள் பொருந்தவில்லை",
    currentPasswordRequired: "தற்போதைய கடவுச்சொல் தேவை",
    mustChangePasswordMsg: "தொடர்வதற்கு முன் உங்கள் கடவுச்சொல்லை மாற்ற வேண்டும்.",

    // --- New booking ---
    newBooking: "புதிய முன்பதிவு",
    editBooking: "முன்பதிவை திருத்து",
    customerNameLabel: "வாடிக்கையாளர் பெயர்",
    phoneNumbersLabel: "தொலைபேசி எண்கள்",
    addPhoneNumber: "தொலைபேசி எண் சேர்க்கவும்",
    addressOptional: "முகவரி (விரும்பினால்)",
    selectVenues: "இடங்களை தேர்ந்தெடுக்கவும்",
    bookingDate: "முன்பதிவு தேதி",
    startTime: "தொடக்க நேரம்",
    endTime: "முடிவு நேரம்",
    duration: "காலம்",
    advanceAmount: "முன்பண தொகை",
    notesOptional: "குறிப்புகள் (விரும்பினால்)",
    saveBooking: "முன்பதிவை சேமி",
    updateBooking: "முன்பதிவை புதுப்பி",
    bookingCreated: "முன்பதிவு வெற்றிகரமாக உருவாக்கப்பட்டது",
    bookingUpdated: "முன்பதிவு வெற்றிகரமாக புதுப்பிக்கப்பட்டது",
    fillRequiredFields: "தேவையான அனைத்து புலங்களையும் நிரப்பவும்",
    selectAtLeastOneVenue: "குறைந்தது ஒரு இடத்தை தேர்ந்தெடுக்கவும்",
    endTimeAfterStart: "முடிவு நேரம் தொடக்க நேரத்திற்கு பிறகு இருக்க வேண்டும்",
    conflictError: "இந்த நேர இடைவெளியில் இடம் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது",
    hours: "மணி",

    // --- Manage venues ---
    manageVenuesTitle: "இடங்களை நிர்வகி",
    venueName: "இட பெயர்",
    venueType: "இட வகை",
    mahal: "மகால்",
    room: "அறை",
    pricePerHour: "மணிக்கு விலை",
    displayOrder: "காட்சி வரிசை",
    isActive: "செயலில்",
    saveVenue: "இடத்தை சேமி",
    createVenue: "இடத்தை உருவாக்கு",
    venueCreated: "இடம் வெற்றிகரமாக உருவாக்கப்பட்டது",
    venueUpdated: "இடம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது",
    noVenuesYet: "இன்னும் இடங்கள் இல்லை",
    addYourFirstVenue: "முன்பதிவுகளை ஏற்க தொடங்க உங்கள் முதல் இடத்தை சேர்க்கவும்",
    amenities: "வசதிகள்",
    colorTag: "வண்ண குறி",

    // --- Login ---
    welcomeBack: "மீண்டும் வருக",
    signInToContinue: "தொடர உள்நுழைக",
    emailPlaceholder: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
    passwordPlaceholder: "••••••••",
    signIn: "உள்நுழை",
    pleaseEnterEmailPassword: "மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்",
    version: "Bookal v1.0",
    networkError: "நெட்வொர்க் பிழை. இணைய இணைப்பை சரிபார்க்கவும்.",
    connectionTimedOut: "இணைப்பு நேரம் முடிந்தது. சர்வர் அணுக முடியாமல் இருக்கலாம்.",
    unexpectedResponse: "சர்வர் எதிர்பாராத பதிலை அளித்தது. சர்வர் URL-ஐ சரிபார்க்கவும்.",
    unexpectedError: "எதிர்பாராத பிழை ஏற்பட்டது",

    // --- Amenities bill ---
    amenitiesBill: "வசதிகள்",
    amenitiesBills: "வசதிகள் பில்கள்",
    newBill: "புதிய பில்",
    generateBill: "பில் உருவாக்கு",
    noAmenityBills: "இன்னும் வசதிகள் பில் இல்லை",
    recordAdvance: "முன்பணம் பதிவு செய்",
    recordAdvancePayment: "முன்பணம் பதிவு செய்யவும்",
    record: "பதிவு",
    cannotCancel: "ரத்து செய்ய முடியாது",
    enterValidAmount: "சரியான முன்பண தொகையை உள்ளிடவும்",
    addAtLeastOneItem: "பெயர் மற்றும் தொகையுடன் குறைந்தது ஒரு உருப்படியைச் சேர்க்கவும்",

    // --- Generic / shared ---
    back: "பின்",
    done: "முடிந்தது",
    ok: "சரி",
    success: "வெற்றி",
    failed: "தோல்வி",
    loading: "ஏற்றுகிறது...",
    noData: "தரவு இல்லை",
    required: "தேவை",
    optional: "விரும்பினால்",
    save: "சேமி",
    close: "மூடு",
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
