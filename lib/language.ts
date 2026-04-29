export type Language = "en" | "bn";
export type TranslationKey =
  | "dashboard"
  | "transactions"
  | "suppliers"
  | "customers"
  | "stock"
  | "cost"
  | "settings"
  | "main"
  | "management"
  | "system"
  | "menu"
  | "settingsLabel"
  | "logout"
  | "welcomeBack"
  | "continueWithEmail"
  | "emailAddress"
  | "password"
  | "keepMeSignedIn"
  | "forgotPassword"
  | "emailPlaceholder"
  | "passwordPlaceholder"
  | "signIn"
  | "signingIn"
  | "changeLanguage"
  | "admin"
  | "adminHead"
  | "stockPageTitle"
  | "stockPageDescription"
  | "loadingStockDashboard"
  | "errorLoadingStockData"
  | "currentStock"
  | "purchaseStock"
  | "saleStock"
  | "stockCoverage"
  | "availableStock"
  | "printInvoice"
  | "supplierTransactions"
  | "paidTransactions"
  | "customerTransactions"
  | "transactionsPageDescription"
  | "noSupplierTransactions"
  | "noPaidTransactions"
  | "noCustomerTransactions"
  | "supplierProfile"
  | "customerProfile"
  | "supplierSummary"
  | "customerSummary"
  | "phoneLabel"
  | "addressLabel"
  | "outstandingDue"
  | "advanceBalance"
  | "balanceLabel"
  | "dueOrAdvance"
  | "totalSalesLabel"
  | "totalReceived"
  | "totalDue"
  | "saltDelivered"
  | "customerActivityTimeline"
  | "supplierActivityTimeline"
  | "activityTimelineDescription"
  | "entries"
  | "noRecordsFound"
  | "viewLatestSupplier"
  | "viewLatestCustomer"
  | "editedBy"
  | "notEditedYet"
  | "superAdminLabel"
  | "action"
  | "totals"
  | "noSuppliersFound"
  | "remainingDue"
  | "note"
  | "sale"
  | "payment"
  | "saleEntry"
  | "paymentEntry"
  | "saltSaleEntry"
  | "customerPaymentEntry"
  | "addSupplier"
  | "addCustomer"
  | "cancel"
  | "newSupplier"
  | "newCustomer"
  | "newSaleEntry"
  | "newPurchaseEntry"
  | "recordSupplierPurchase"
  | "recordCustomerSale"
  | "nameLabel"
  | "phoneLabelShort"
  | "addressLabelShort"
  | "supplierNameLabel"
  | "customerNameLabel"
  | "dateLabel"
  | "typeLabel"
  | "amountLabel"
  | "typeOrSelectSupplier"
  | "typeOrSelectCustomer"
  | "selectSupplier"
  | "selectCustomer"
  | "saveImage"
  | "saveBranding"
  | "topNavbarImage"
  | "uploadFromDevice"
  | "logoUrl"
  | "uploadLogoUrl"
  | "sidebarBranding"
  | "sidebarBrandingDescription"
  | "manageAdmin"
  | "saveButton"
  | "addingEllipsis"
  | "cancelAction"
  | "newSupplier"
  | "newCustomer"
  | "nameLabel"
  | "phoneLabelShort"
  | "addressLabel"
  | "supplierNameLabel"
  | "customerNameLabel"
  | "pricePerMaund"
  | "pricePerKg"
  | "hockExtendedSack"
  | "trackExpenses"
  | "totalMaund"
  | "totalSaltKg"
  | "totalSaltKgWithBags"
  | "totalPriceTk"
  | "paidAmount"
  | "dueAmount"
  | "paymentNow"
  | "recordSupplierPayment"
  | "recordCustomerPayment"
  | "selectSupplier"
  | "selectCustomer"
  | "paymentAmount"
  | "paymentDate"
  | "savePayment"
  | "close"
  | "supplierAlert"
  | "reviewMessageBeforeContinuing"
  | "captureSupplierPaymentDescription"
  | "captureCustomerPaymentDescription"
  | "pleaseSelectSupplier"
  | "pleaseSelectCustomer"
  | "pleaseSelectPaymentDate"
  | "enterValidAmount"
  | "supplierNotFound"
  | "customerNotFound"
  | "paidAmountCannotExceedDue"
  | "unableToSavePayment"
  | "paidAmountNonNegative"
  | "paidAmountCannotExceedTotal"
  | "failedToRecordPurchase"
  | "purchaseRecordedSuccessfully"
  | "phoneMustBe11Digits"
  | "addressRequired"
  | "unableToAddSupplier"
  | "unableToAddCustomer"
  | "customerNameRequired"
  | "saltQuantityNonNegative"
  | "pricePerMaundNonNegative"
  | "pricePerKgNonNegative"
  | "hockExtendedSackNonNegative"
  | "trackExpensesNonNegative"
  | "totalPriceNonNegative"
  | "dueAmountNonNegative"
  | "unableToSaveSale"
  | "saleRecordedSuccessfully"
  | "noCustomersFound"
  | "view"
  | "print"
  | "printSupplierList"
  | "printCustomerList"
  | "totalSales"
  | "suppliersLabel"
  | "customersLabel"
  | "transactionsLabel"
  | "quickView"
  | "recentActivity"
  | "upLabel"
  | "downLabel"
  | "tx"
  | "unnamedCustomer"
  | "unnamedSupplier"
  | "noMobile"
  | "customerLabel"
  | "supplierLabel"
  | "dailyRevenue"
  | "up"
  | "down"
  | "noContactsFound"
  | "contactDirectory"
  | "liveContactStream"
  | "customerAlert"
  | "editAdmin"
  | "onlySuperAdminEdit"
  | "changePassword"
  | "onlySuperAdminPassword"
  | "editAdminProfile"
  | "changeAdminPassword"
  | "saltQuantityLabel"
  | "saveSaleEntry"
  | "savePurchaseEntry"
  | "paymentDateLabel"
  | "paidAmountLabel"
  | "somethingNeedsAttention"
  | "typeOrSelectCustomer"
  | "totalBuy"
  | "totalSalesTransactions"
  | "fromSuppliers"
  | "toCustomers"
  | "totalStock"
  | "dailySales"
  | "dailyBuy"
  | "totalPurchase"
  | "suppliersDue"
  | "suppliersDueDetail"
  | "supplierDueEquivalentLabel"
  | "totalSalesDetail"
  | "customerDueCard"
  | "customerDueDetail"
  | "dailySalesDetail"
  | "dailyPurchase"
  | "dailyPurchaseDetail"
  | "dailyTransaction"
  | "totalCalculationSection"
  | "dailyCalculationSection"
  | "customerSuffix"
  | "supplierTodaySuffix"
  | "kgUnit"
  | "maundUnit"
  | "costSummary"
  | "newCostEntry"
  | "recordDailyCost"
  | "costForLabel"
  | "costForPlaceholder"
  | "costAmountLabel"
  | "costDateLabel"
  | "purposeLabel"
  | "purposePlaceholder"
  | "saveCost"
  | "savingCost"
  | "totalCost"
  | "todayCost"
  | "costEntries"
  | "dailyCostHistory"
  | "dailyCostHistoryDescription"
  | "dailyCost"
  | "todaysExpenses"
  | "noCostsFound"
  | "unableToSaveCost"
  | "costSavedSuccessfully"
  | "personNameRequired"
  | "purposeRequired"
  | "unknownPerson"
  | "saltKg"
  | "amount"
  | "saltPricePerKg"
  | "bagType"
  | "trackCost"
  | "edit"
  | "stockSummary"
  | "refreshData"
  | "refreshing"
  | "currentStockSummary"
  | "purchasedFromSuppliers"
  | "soldToCustomers"
  | "conversionLabel"
  | "averagePerMaund"
  | "supplierDueApproxDetail"
  | "invoiceTitle"
  | "invoiceWorkspace"
  | "invoiceWorkspaceDescription"
  | "backToProfile"
  | "invoiceTo"
  | "invoiceNumberLabel"
  | "invoiceDateLabel"
  | "periodLabel"
  | "noDatedRecords"
  | "sku"
  | "itemDescription"
  | "unitPrice"
  | "quantityLabel"
  | "totalLabel"
  | "saleInformation"
  | "purchaseInformation"
  | "recordCount"
  | "totalKgLabel"
  | "totalQuantityLabel"
  | "salesCollection"
  | "laterPayment"
  | "purchaseValue"
  | "subTotalLabel"
  | "receivedLabel"
  | "taxRate"
  | "dueAmountBadge"
  | "advanceAmountBadge"
  | "settled"
  | "thankYouBusiness"
  | "customerSignature"
  | "supplierSignature"
  | "authorizedSignature"
  | "customerInvoiceFallback"
  | "supplierInvoiceFallback"
  | "saleEntryLabel"
  | "saleAmountRecorded"
  | "kgDeliveredNote"
  | "paymentReceived"
  | "transactionLabel"
  | "customerPaymentNote"
  | "customerTransactionNote"
  | "saltPurchaseLabel"
  | "supplierPaymentLabel"
  | "purchaseEntryNote"
  | "legacyPurchaseEntryNote"
  | "paymentAdjustmentNote"
  | "printDateLabel"
  | "saltKgShort"
  | "saltMaundShort"
  | "paidAmountShort"
  | "noteLabel"
  | "purchaseLabel"
  | "perMaundPriceLabel"
  | "saltSaleEntryNote"
  | "customerPaymentEntryNote"
  | "supplierPaymentEntryNote"
  | "saltPurchaseEntryNote"
  | "noCustomerRecordsFound"
  | "noSupplierRecordsFound"
  | "bostaSackType"
  | "bagSize50"
  | "bagSize75"
  | "numberOfBostaSack"
  | "editCustomerPriceTitle"
  | "editCustomerPriceDescription"
  | "editSupplierPriceTitle"
  | "editSupplierPriceDescription"
  | "updateDetails"
  | "updating"
  | "showMore";

export const LANGUAGE_STORAGE_KEY = "salt-mill-language";

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  en: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    suppliers: "Suppliers",
    customers: "Customers",
    stock: "Stock",
    cost: "Cost",
    settings: "Settings",
    main: "MAIN",
    management: "MANAGEMENT",
    system: "SYSTEM",
    menu: "Menu",
    settingsLabel: "Settings",
    logout: "Log Out",
    welcomeBack: "Welcome back!",
    continueWithEmail: "Continue with Email",
    emailAddress: "Email address",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Enter password",
    keepMeSignedIn: "Keep me signed in",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
    signingIn: "Signing in...",
    changeLanguage: "Change language",
    admin: "Admin",
    adminHead: "Admin Head",
    stockPageTitle: "Stock Management",
    stockPageDescription: "Live stock overview with purchase, sale, and available balance metrics.",
    loadingStockDashboard: "Loading stock dashboard...",
    errorLoadingStockData: "Error loading stock data.",
    currentStock: "Current Stock",
    purchaseStock: "Purchase Stock",
    saleStock: "Total Salt Maund",
    stockCoverage: "Stock Coverage",
    availableStock: "Available stock",
    printInvoice: "Print invoice",
    supplierTransactions: "Supplier Transactions",
    paidTransactions: "Payment History",
    customerTransactions: "Customer Transactions",
    transactionsPageDescription: "All payment and purchase transactions with dates.",
    noSupplierTransactions: "No supplier transactions found.",
    noPaidTransactions: "No paid transactions found.",
    noCustomerTransactions: "No customer transactions found.",
    supplierProfile: "Supplier profile",
    customerProfile: "Customer profile",
    supplierSummary: "Supplier account details, payment activity, and salt movement history in one place.",
    customerSummary: "Sales, payment receipts, and account standing for this customer in a clean timeline view.",
    phoneLabel: "Phone",
    addressLabel: "Address",
    outstandingDue: "Outstanding due",
    advanceBalance: "Advance balance",
    balanceLabel: "Balance",
    dueOrAdvance: "Due / Advance",
    totalDue: "Total due",
    totalSalesLabel: "Total amount",
    totalReceived: "Paid amount",
    saltDelivered: "Total salt delivered",
    customerActivityTimeline: "Customer activity timeline",
    supplierActivityTimeline: "Supplier activity timeline",
    activityTimelineDescription: "Sales and payment entries merged into one historical ledger.",
    entries: "entries",
    noRecordsFound: "No records found.",
    viewLatestSupplier: "View latest supplier",
    viewLatestCustomer: "View latest customer",
    action: "Action",
    editedBy: "Edited by",
    notEditedYet: "Not edited yet",
    superAdminLabel: "Super Admin",
    totals: "Totals",
    noSuppliersFound: "No suppliers found.",
    remainingDue: "Remaining due",
    note: "Note",
    sale: "Sale",
    payment: "Payment",
    saleEntry: "Sale entry",
    paymentEntry: "Payment entry",
    saltSaleEntry: "Salt sale entry",
    customerPaymentEntry: "Customer payment entry",
    addSupplier: "Add supplier",
    addCustomer: "Add customer",
    cancel: "Cancel",
    newSupplier: "New supplier",
    newCustomer: "New customer",
    newSaleEntry: "New sale entry",
    newPurchaseEntry: "New purchase entry",
    recordSupplierPurchase: "Record a supplier purchase and payment.",
    recordCustomerSale: "Record customer salt sales and payment details.",
    nameLabel: "Name",
    phoneLabelShort: "Phone",
    addressLabelShort: "Address",
    supplierNameLabel: "Supplier name",
    customerNameLabel: "Customer name",
    dateLabel: "Date",
    typeLabel: "Type",
    amountLabel: "Amount",
    typeOrSelectSupplier: "Type or select supplier",
    typeOrSelectCustomer: "Type or select customer",
    selectSupplier: "Select supplier",
    selectCustomer: "Select customer",
    saveImage: "Save image",
    saveBranding: "Save branding",
    topNavbarImage: "Top Navbar Image",
    uploadFromDevice: "Or upload from device",
    logoUrl: "Logo URL",
    uploadLogoUrl: "Or upload logo from device",
    sidebarBranding: "Sidebar Branding",
    sidebarBrandingDescription: "Update the sidebar logo and heading text shown above the menu.",
    manageAdmin: "Manage admin accounts, top navbar image, and sidebar branding.",
    saveButton: "Save",
    addingEllipsis: "Adding...",
    cancelAction: "Cancel",
    up: "Up",
    down: "Down",
    pricePerMaund: "Price per Maund (Tk)",
    pricePerKg: "Price per KG (Tk)",
    hockExtendedSack: "Hock/Extended sack (Tk)",
    trackExpenses: "Track expenses (Tk)",
    totalMaund: "Total Maund",
    totalSaltKg: "Total Salt KG",
    totalSaltKgWithBags: "Total Salt KG (Bags)",
    totalPriceTk: "Total price (Tk)",
    paidAmount: "Paid amount (Tk)",
    dueAmount: "Due amount (Tk)",
    paymentNow: "Payment Now",
    recordSupplierPayment: "Record supplier payment",
    recordCustomerPayment: "Record customer payment",
    paymentAmount: "Payment amount",
    paymentDate: "Payment date",
    savePayment: "Save payment",
    close: "Close",
    supplierAlert: "Supplier alert",
    reviewMessageBeforeContinuing: "Please review this message before continuing with the purchase flow.",
    captureSupplierPaymentDescription: "Capture a supplier payment and update the outstanding balance instantly.",
    captureCustomerPaymentDescription: "Capture a payment and apply it to the selected customer account.",
    pleaseSelectSupplier: "Please select a supplier.",
    pleaseSelectCustomer: "Please select a customer.",
    pleaseSelectPaymentDate: "Please select a payment date.",
    enterValidAmount: "Enter a valid amount.",
    supplierNotFound: "Selected supplier not found.",
    customerNotFound: "Selected customer not found.",
    paidAmountCannotExceedDue: "Paid amount cannot exceed current due.",
    unableToSavePayment: "Unable to save payment.",
    paidAmountNonNegative: "Paid amount must be a non-negative number.",
    paidAmountCannotExceedTotal: "Paid amount cannot exceed total price.",
    failedToRecordPurchase: "Failed to record purchase.",
    purchaseRecordedSuccessfully: "Purchase entry recorded successfully.",
    phoneMustBe11Digits: "Phone number must be exactly 11 digits and contain only numbers.",
    addressRequired: "Address is required.",
    unableToAddSupplier: "Unable to add supplier.",
    unableToAddCustomer: "Unable to add customer.",
    customerNameRequired: "Customer name is required and must match an existing customer.",
    saltQuantityNonNegative: "Salt quantity must be a non-negative number.",
    pricePerMaundNonNegative: "Price per Maund must be a non-negative number.",
    pricePerKgNonNegative: "Price per KG must be a non-negative number.",
    hockExtendedSackNonNegative: "Hock/Extended sack must be a non-negative number.",
    trackExpensesNonNegative: "Track expenses must be a non-negative number.",
    totalPriceNonNegative: "Total price must be a non-negative number.",
    dueAmountNonNegative: "Due amount must be a non-negative number.",
    unableToSaveSale: "Unable to save sale.",
    saleRecordedSuccessfully: "Sale entry recorded successfully.",
    noCustomersFound: "No customers found.",
    view: "View",
    edit: "Edit",
    print: "Print",
    printSupplierList: "Print Supplier List",
    printCustomerList: "Print Customer List",
    totalSales: "Total Amount",
    suppliersLabel: "Suppliers",
    customersLabel: "Customers",
    transactionsLabel: "Transactions",
    quickView: "Quick View",
    recentActivity: "Recent Activity",
    upLabel: "Up",
    downLabel: "Down",
    tx: "tx",
    unnamedCustomer: "Unnamed customer",
    unnamedSupplier: "Unnamed supplier",
    noMobile: "No mobile",
    customerLabel: "Customer",
    supplierLabel: "Supplier",
    dailyRevenue: "Daily revenue",
    noContactsFound: "No customer or supplier contacts found.",
    contactDirectory: "Customers & Suppliers",
    liveContactStream: "Live contact stream",
    customerAlert: "Customer alert",
    editAdmin: "Edit admin",
    onlySuperAdminEdit: "Only super admin can edit this account",
    changePassword: "Change password",
    onlySuperAdminPassword: "Only super admin can change passwords",
    editAdminProfile: "Edit admin profile",
    changeAdminPassword: "Change admin password",
    saltQuantityLabel: "Salt quantity (kg)",
    saveSaleEntry: "Save sale entry",
    savePurchaseEntry: "Save purchase entry",
    paymentDateLabel: "Payment date",
    paidAmountLabel: "Paid amount (Tk)",
    somethingNeedsAttention: "Something needs your attention before this entry can be saved.",
    totalBuy: "Total Buy",
    totalSalesTransactions: "Total Sales",
    fromSuppliers: "From suppliers",
    toCustomers: "To customers",
    totalStock: "Total Salt Stock",
    dailySales: "Daily Sales",
    dailyBuy: "Daily Buy",
    totalPurchase: "Total Purchase",
    suppliersDue: "Suppliers Due",
    suppliersDueDetail: "Total amount owed to suppliers",
    supplierDueEquivalentLabel: "Approx. due value:",
    totalSalesDetail: "Total customer sale amount (paid + due)",
    customerDueCard: "Customer Due",
    customerDueDetail: "Total amount owed by customers",
    dailySalesDetail: "Salt sold today",
    dailyPurchase: "Daily Purchase",
    dailyPurchaseDetail: "Salt purchased today",
    dailyTransaction: "Daily Transaction",
    totalCalculationSection: "Total Calculation Section",
    dailyCalculationSection: "Daily Calculation Section",
    customerSuffix: "customer",
    supplierTodaySuffix: "supplier today",
    kgUnit: "KG",
    maundUnit: "Maund",
    costSummary: "Track daily expenses, who received the money, and the purpose of each cost entry.",
    newCostEntry: "New cost entry",
    recordDailyCost: "Add your daily operating costs with person name, amount, purpose, and date.",
    costForLabel: "Paid to",
    costForPlaceholder: "Enter person name",
    costAmountLabel: "Cost amount (Tk)",
    costDateLabel: "Cost date",
    purposeLabel: "Purpose",
    purposePlaceholder: "Why did you spend this money?",
    saveCost: "Save cost",
    savingCost: "Saving...",
    totalCost: "Total cost",
    todayCost: "Today's cost",
    costEntries: "Cost entries",
    dailyCostHistory: "Daily cost history",
    dailyCostHistoryDescription: "Latest cost entries for day-to-day expense tracking.",
    dailyCost: "Daily Cost",
    todaysExpenses: "Today's expenses",
    noCostsFound: "No cost entries found.",
    unableToSaveCost: "Unable to save cost entry.",
    costSavedSuccessfully: "Cost entry saved successfully.",
    personNameRequired: "Person name is required.",
    purposeRequired: "Purpose is required.",
    unknownPerson: "Unknown person",
    saltKg: "Salt KG",
    amount: "Amount",
    saltPricePerKg: "Salt Price/kg",
    bagType: "Bag Type",
    trackCost: "Track Cost",
    stockSummary: "Stock Summary",
    refreshData: "Refresh Data",
    refreshing: "Refreshing...",
    currentStockSummary: "Current stock",
    purchasedFromSuppliers: "Purchased from suppliers",
    soldToCustomers: "Sold to customers",
    conversionLabel: "Conversion",
    averagePerMaund: "Average / Maund",
    supplierDueApproxDetail: "Approx. due",
    invoiceTitle: "Invoice",
    invoiceWorkspace: "Invoice Workspace",
    invoiceWorkspaceDescription: "Review the statement layout, then print a clean copy for records.",
    backToProfile: "Back to profile",
    invoiceTo: "Invoice To",
    invoiceNumberLabel: "Invoice Number",
    invoiceDateLabel: "Invoice Date",
    periodLabel: "Period",
    noDatedRecords: "No dated records",
    sku: "SKU",
    itemDescription: "Item Description",
    unitPrice: "Unit Price",
    quantityLabel: "Quantity",
    totalLabel: "Total",
    saleInformation: "Sale Information",
    purchaseInformation: "Purchase Information",
    recordCount: "Record Count",
    totalKgLabel: "Total Kg",
    totalQuantityLabel: "Total Quantity",
    salesCollection: "Sales Collection",
    laterPayment: "Later Payment",
    purchaseValue: "Purchase Value",
    subTotalLabel: "Sub Total",
    receivedLabel: "Received",
    taxRate: "Tax Rate",
    dueAmountBadge: "Due Amount",
    advanceAmountBadge: "Advance Amount",
    settled: "Settled",
    thankYouBusiness: "Thank you for business!",
    customerSignature: "Customer Signature",
    supplierSignature: "Supplier Signature",
    authorizedSignature: "Authorized Signature",
    customerInvoiceFallback: "Customer",
    supplierInvoiceFallback: "Supplier",
    saleEntryLabel: "Sale entry",
    saleAmountRecorded: "Sale amount recorded",
    kgDeliveredNote: "kg delivered",
    paymentReceived: "Payment received",
    transactionLabel: "Transaction",
    customerPaymentNote: "Customer payment",
    customerTransactionNote: "Customer transaction",
    saltPurchaseLabel: "Salt purchase",
    supplierPaymentLabel: "Supplier payment",
    purchaseEntryNote: "Purchase entry",
    legacyPurchaseEntryNote: "Legacy purchase entry",
    paymentAdjustmentNote: "Payment adjustment",
    printDateLabel: "Print Date",
    saltKgShort: "Salt (KG)",
    saltMaundShort: "Salt (MAUND)",
    paidAmountShort: "Paid amount",
    noteLabel: "Note",
    purchaseLabel: "Purchase",
    perMaundPriceLabel: "Per maund Tk",
    saltSaleEntryNote: "Salt sale entry",
    customerPaymentEntryNote: "Customer payment entry",
    supplierPaymentEntryNote: "Supplier payment entry",
    saltPurchaseEntryNote: "Salt purchase entry",
    noCustomerRecordsFound: "No records found for this customer.",
    noSupplierRecordsFound: "No records found for this supplier.",
    bostaSackType: "Bosta/Sack Type",
    bagSize50: "50 kg per bag",
    bagSize75: "75 kg per bag",
    numberOfBostaSack: "Number of Bosta/Sack",
    editCustomerPriceTitle: "Edit customer price",
    editCustomerPriceDescription: "Update the latest sale price for this customer.",
    editSupplierPriceTitle: "Edit supplier price",
    editSupplierPriceDescription: "Update the latest purchase price for this supplier.",
    updateDetails: "Update details",
    updating: "Updating...",
    showMore: "Show more",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড",
    transactions: "লেনদেন",
    suppliers: "সরবরাহকারী",
    customers: "গ্রাহক",
    stock: "স্টক",
    cost: "খরচ",
    settings: "সেটিংস",
    main: "প্রধান",
    management: "ম্যানেজমেন্ট",
    system: "সিস্টেম",
    menu: "মেনু",
    settingsLabel: "সেটিংস",
    logout: "লগ আউট",
    welcomeBack: "ফিরে স্বাগতম!",
    continueWithEmail: "ইমেইল দিয়ে চালিয়ে যান",
    emailAddress: "ইমেইল ঠিকানা",
    emailPlaceholder: "you@example.com",
    password: "পাসওয়ার্ড",
    passwordPlaceholder: "পাসওয়ার্ড লিখুন",
    keepMeSignedIn: "মনে রাখুন",
    forgotPassword: "পাসওয়ার্ড ভুলেছেন?",
    signIn: "সাইন ইন",
    signingIn: "সাইন ইন হচ্ছে...",
    changeLanguage: "ভাষা পরিবর্তন করুন",
    admin: "অ্যাডমিন",
    adminHead: "অ্যাডমিন হেড",
    stockPageTitle: "স্টক ব্যবস্থাপনা",
    stockPageDescription: "ক্রয়, বিক্রয় ও ব্যালেন্স সহ লাইভ স্টক ওভারভিউ।",
    loadingStockDashboard: "স্টক ড্যাশবোর্ড লোড হচ্ছে...",
    errorLoadingStockData: "স্টক ডেটা লোড করতে ত্রুটি হয়েছে।",
    currentStock: "বর্তমান স্টক",
    purchaseStock: "ক্রয় স্টক",
    saleStock: "বিক্রয় স্টক",
    stockCoverage: "স্টক কভারেজ",
    availableStock: "উপলব্ধ স্টক",
    printInvoice: "প্রিন্ট",
    supplierTransactions: "সরবরাহকারী লেনদেন",
    paidTransactions: "পেমেন্ট ইতিহাস",
    customerTransactions: "গ্রাহক লেনদেন",
    transactionsPageDescription: "তারিখ সহ সব পেমেন্ট এবং ক্রয় লেনদেন।",
    noSupplierTransactions: "কোনো সরবরাহকারী লেনদেন পাওয়া যায়নি।",
    noPaidTransactions: "কোনো পরিশোধ লেনদেন পাওয়া যায়নি।",
    noCustomerTransactions: "কোনো গ্রাহক লেনদেন পাওয়া যায়নি।",
    supplierProfile: "সরবরাহকারী প্রোফাইল",
    customerProfile: "গ্রাহক প্রোফাইল",
    supplierSummary: "এক জায়গায় সরবরাহকারী হিসাব, পেমেন্ট, এবং লবণ লেনদেনের ইতিহাস।",
    customerSummary: "এই গ্রাহকের বিক্রয়, রসিদ এবং অ্যাকাউন্ট অবস্থা।",
    phoneLabel: "ফোন",
    addressLabel: "ঠিকানা",
    outstandingDue: "বাকী বাকি",
    advanceBalance: "অগ্রিম ব্যালেন্স",
    balanceLabel: "ব্যালেন্স",
    dueOrAdvance: "বাকি / অগ্রিম",
    totalDue: "মোট বকেয়া",
    totalSalesLabel: "মোট পরিমাণ",
    totalReceived: "পরিশোধিত পরিমাণ",
    saltDelivered: "মোট সরবরাহিত লবণ",
    customerActivityTimeline: "গ্রাহক কার্যকলাপ টাইমলাইন",
    supplierActivityTimeline: "সরবরাহকারী কার্যকলাপ টাইমলাইন",
    activityTimelineDescription: "বিক্রয় ও পেমেন্ট এন্ট্রি একত্রিত ইতিহাসে দেখুন।",
    entries: "এন্ট্রি",
    noRecordsFound: "এই গ্রাহকের জন্য কোনো রেকর্ড পাওয়া যায়নি।",
    viewLatestSupplier: "সর্বশেষ সরবরাহকারী দেখুন",
    viewLatestCustomer: "সর্বশেষ গ্রাহক",
    action: "কর্ম",
    editedBy: "সম্পাদনা করেছেন",
    notEditedYet: "সম্পাদনা হয়নি",
    superAdminLabel: "সুপার অ্যাডমিন",
    totals: "মোট",
    noSuppliersFound: "কোনো সরবরাহকারী পাওয়া যায়নি।",
    remainingDue: "অবশিষ্ট বাকি",
    note: "নোট",
    sale: "বিক্রয়",
    payment: "পরিশোধ",
    saleEntry: "বিক্রয় এন্ট্রি",
    paymentEntry: "পরিশোধ এন্ট্রি",
    saltSaleEntry: "লবণ বিক্রয় এন্ট্রি",
    customerPaymentEntry: "গ্রাহক পেমেন্ট এন্ট্রি",
    pricePerMaund: "মণ প্রতি মূল্য (টাকা)",
    pricePerKg: "কেজি প্রতি মূল্য (টাকা)",
    hockExtendedSack: "হক/এক্সটেন্ডেড বস্তা (টাকা)",
    trackExpenses: "ট্র্যাক খরচ (টাকা)",
    totalMaund: "মোট মণ",
    totalSaltKg: "মোট লবণ কেজি",
    totalSaltKgWithBags: "মোট লবণ কেজি (বস্তা)",
    totalPriceTk: "মোট মূল্য (টাকা)",
    paidAmount: "পরিশোধিত পরিমাণ",
    dueAmount: "বাকি পরিমাণ",
    paymentNow: "এখন পরিশোধ করুন",
    recordSupplierPayment: "সরবরাহকারী পরিশোধ রেকর্ড করুন",
    selectSupplier: "সরবরাহকারী নির্বাচন করুন",
    paymentAmount: "পরিশোধ পরিমাণ",
    paymentDate: "পরিশোধ তারিখ",
    savePayment: "পরিশোধ সংরক্ষণ করুন",
    close: "বন্ধ করুন",
    pleaseSelectSupplier: "অনুগ্রহ করে একটি সরবরাহকারী নির্বাচন করুন।",
    pleaseSelectPaymentDate: "অনুগ্রহ করে পরিশোধ তারিখ নির্বাচন করুন।",
    enterValidAmount: "একটি বৈধ পরিমাণ লিখুন।",
    supplierNotFound: "নির্বাচিত সরবরাহকারী পাওয়া যায়নি।",
    paidAmountCannotExceedDue: "পরিশোধিত পরিমাণ বর্তমান বাকি অতিক্রম করতে পারে না।",
    unableToSavePayment: "পরিশোধ সংরক্ষণ করতে অসমর্থ।",
    paidAmountNonNegative: "পরিশোধিত পরিমাণ অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    paidAmountCannotExceedTotal: "পরিশোধিত পরিমাণ মোট মূল্য অতিক্রম করতে পারে না।",
    failedToRecordPurchase: "ক্রয় রেকর্ড করতে ব্যর্থ।",
    purchaseRecordedSuccessfully: "ক্রয় এন্ট্রি সফলভাবে রেকর্ড করা হয়েছে।",
    phoneMustBe11Digits: "ফোন নম্বর অবশ্যই ১১ টি সংখ্যা এবং শুধুমাত্র সংখ্যা ধারণ করতে হবে।",
    addressRequired: "ঠিকানা প্রয়োজন।",
    unableToAddSupplier: "সরবরাহকারী যোগ করতে অসমর্থ।",
    noCustomersFound: "কোনো গ্রাহক পাওয়া যায়নি।",
    view: "দেখুন",
    edit: "সম্পাদনা",
    print: "প্রিন্ট",
    printSupplierList: "প্রিন্ট সরবরাহকারী লিস্ট",
    printCustomerList: "প্রিন্ট গ্রাহক লিস্ট",
    totalSales: "মোট বিক্রয়",
    suppliersLabel: "সরবরাহকারী",
    customersLabel: "গ্রাহক",
    transactionsLabel: "লেনদেন",
    quickView: "দ্রুত দেখুন",
    recentActivity: "সাম্প্রতিক কার্যকলাপ",
    upLabel: "উপরে",
    downLabel: "নিচে",
    tx: "টিএক্স",
    unnamedCustomer: "নামহীন গ্রাহক",
    unnamedSupplier: "নামহীন সরবরাহকারী",
    noMobile: "মোবাইল নেই",
    customerLabel: "গ্রাহক",
    supplierLabel: "সরবরাহকারী",
    dailyRevenue: "দৈনিক আয়",
    noContactsFound: "কোনো গ্রাহক বা সরবরাহকারী যোগাযোগ পাওয়া যায়নি।",
    contactDirectory: "গ্রাহক ও সরবরাহকারী",
    liveContactStream: "লাইভ যোগাযোগ তালিকা",
    customerAlert: "গ্রাহক সতর্কতা",
    editAdmin: "অ্যাডমিন সম্পাদনা করুন",
    onlySuperAdminEdit: "শুধুমাত্র সুপার অ্যাডমিন এই অ্যাকাউন্ট সম্পাদনা করতে পারেন",
    changePassword: "পাসওয়ার্ড পরিবর্তন করুন",
    onlySuperAdminPassword: "শুধুমাত্র সুপার অ্যাডমিন পাসওয়ার্ড পরিবর্তন করতে পারেন",
    editAdminProfile: "অ্যাডমিন প্রোফাইল সম্পাদনা করুন",
    changeAdminPassword: "অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন",
    saltQuantityLabel: "লবণের পরিমাণ (কেজি)",
    saveSaleEntry: "বিক্রয় এন্ট্রি সংরক্ষণ করুন",
    savePurchaseEntry: "ক্রয় এন্ট্রি সংরক্ষণ করুন",
    paymentDateLabel: "পেমেন্ট তারিখ",
    paidAmountLabel: "পরিশোধিত পরিমাণ (টাকা)",
    somethingNeedsAttention: "এই এন্ট্রি সংরক্ষণ করার আগে আপনার মনোযোগের প্রয়োজন।",
    unableToAddCustomer: "গ্রাহক যোগ করতে অসমর্থ।",
    customerNameRequired: "গ্রাহকের নাম প্রয়োজন এবং অবশ্যই একটি বিদ্যমান গ্রাহকের সাথে মিলতে হবে।",
    saltQuantityNonNegative: "লবণ পরিমাণ অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    pricePerMaundNonNegative: "মণ প্রতি মূল্য অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    pricePerKgNonNegative: "কেজি প্রতি মূল্য অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    hockExtendedSackNonNegative: "হক/এক্সটেন্ডেড বস্তার পরিমাণ অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    trackExpensesNonNegative: "ট্র্যাক খরচ অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    totalPriceNonNegative: "মোট মূল্য অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    dueAmountNonNegative: "বাকি পরিমাণ অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।",
    unableToSaveSale: "বিক্রয় সংরক্ষণ করতে অসমর্থ।",
    saleRecordedSuccessfully: "বিক্রয় এন্ট্রি সফলভাবে রেকর্ড করা হয়েছে।",
    pleaseSelectCustomer: "অনুগ্রহ করে একটি গ্রাহক নির্বাচন করুন।",
    customerNotFound: "নির্বাচিত গ্রাহক পাওয়া যায়নি।",
    selectCustomer: "গ্রাহক নির্বাচন করুন",
    captureSupplierPaymentDescription: "একটি সরবরাহকারী পরিশোধ ক্যাপচার করুন এবং বকেয়া ব্যালেন্স তাত্ক্ষণিকভাবে আপডেট করুন।",
    supplierAlert: "সরবরাহকারী সতর্কতা",
    reviewMessageBeforeContinuing: "চালিয়ে যাওয়ার আগে এই বার্তাটি পর্যালোচনা করুন।",
    recordCustomerPayment: "গ্রাহক পরিশোধ রেকর্ড করুন",
    captureCustomerPaymentDescription: "একটি পরিশোধ ক্যাপচার করুন এবং নির্বাচিত গ্রাহক অ্যাকাউন্টে প্রয়োগ করুন।",
    addSupplier: "সরবরাহকারী যোগ করুন",
    addCustomer: "গ্রাহক যোগ করুন",
    cancel: "বাতিল",
    newSupplier: "নতুন সরবরাহকারী",
    newCustomer: "নতুন গ্রাহক",
    newSaleEntry: "নতুন বিক্রয় এন্ট্রি",
    newPurchaseEntry: "নতুন ক্রয় এন্ট্রি",
    recordSupplierPurchase: "সরবরাহকারী ক্রয় এবং পেমেন্ট রেকর্ড করুন।",
    recordCustomerSale: "গ্রাহক লবণ বিক্রয় ও পেমেন্ট ডিটেইল রেকর্ড করুন।",
    nameLabel: "নাম",
    phoneLabelShort: "ফোন",
    addressLabelShort: "ঠিকানা",
    supplierNameLabel: "সরবরাহকারীর নাম",
    customerNameLabel: "গ্রাহকের নাম",
    dateLabel: "তারিখ",
    typeLabel: "টাইপ",
    amountLabel: "পরিমান",
    typeOrSelectSupplier: "টাইপ বা সরবরাহকারী নির্বাচন করুন",
    typeOrSelectCustomer: "টাইপ বা গ্রাহক নির্বাচন করুন",
    saveImage: "ইমেজ সেভ করুন",
    saveBranding: "ব্র্যান্ডিং সেভ করুন",
    topNavbarImage: "টপ ন্যাভবার ইমেজ",
    uploadFromDevice: "অথবা ডিভাইস থেকে আপলোড করুন",
    logoUrl: "লোগো URL",
    uploadLogoUrl: "অথবা ডিভাইস থেকে লোগো আপলোড করুন",
    sidebarBranding: "সাইডবার ব্র্যান্ডিং",
    sidebarBrandingDescription: "মেনুর উপরে দেখানো সাইডবার লোগো এবং হেডিং আপডেট করুন।",
    manageAdmin: "অ্যাডমিন অ্যাকাউন্ট, টপ ন্যাভবার ইমেজ, এবং সাইডবার ব্র্যান্ডিং পরিচালনা করুন।",
    saveButton: "সেভ",
    addingEllipsis: "যোগ করা হচ্ছে…",
    cancelAction: "বাতিল",
    up: "উপ",
    down: "ডাউন",
    totalBuy: "মোট ক্রয়",
    totalSalesTransactions: "মোট বিক্রয়",
    fromSuppliers: "সরবরাহকারী থেকে",
    toCustomers: "গ্রাহকদের কাছে",
    totalStock: "মোট লবণ স্টক",
    dailySales: "দৈনিক বিক্রয়",
    dailyBuy: "দৈনিক ক্রয়",
    totalPurchase: "মোট ক্রয়",
    suppliersDue: "সরবরাহকারীর বাকি",
    suppliersDueDetail: "সরবরাহকারীদের কাছে মোট বকেয়া",
    supplierDueEquivalentLabel: "বাকির আনুমানিক মূল্য:",
    totalSalesDetail: "গ্রাহক বিক্রয়ের মোট পরিমাণ (পরিশোধ + বাকি)",
    customerDueCard: "গ্রাহকের বাকি",
    customerDueDetail: "গ্রাহকদের কাছে মোট বকেয়া",
    dailySalesDetail: "আজকে মোট লবণ বিক্রয়",
    dailyPurchase: "দৈনিক ক্রয়",
    dailyPurchaseDetail: "আজকে মোট লবণ ক্রয়",
    dailyTransaction: "দৈনিক লেনদেন",
    totalCalculationSection: "মোট হিসাব সেকশন",
    dailyCalculationSection: "দৈনিক হিসাব সেকশন",
    customerSuffix: "গ্রাহক",
    supplierTodaySuffix: "সরবরাহকারী আজ",
    kgUnit: "কেজি",
    maundUnit: "মণ",
    costSummary: "দৈনিক খরচ, কাকে টাকা দেওয়া হয়েছে, এবং কী উদ্দেশ্যে খরচ হয়েছে তা হিসাব রাখুন।",
    newCostEntry: "নতুন খরচ এন্ট্রি",
    recordDailyCost: "নাম, টাকার পরিমাণ, উদ্দেশ্য এবং তারিখসহ দৈনিক খরচ যোগ করুন।",
    costForLabel: "যাকে দেওয়া হয়েছে",
    costForPlaceholder: "ব্যক্তির নাম লিখুন",
    costAmountLabel: "খরচের পরিমাণ (টাকা)",
    costDateLabel: "খরচের তারিখ",
    purposeLabel: "উদ্দেশ্য",
    purposePlaceholder: "কী উদ্দেশ্যে এই খরচ করা হয়েছে?",
    saveCost: "খরচ সেভ করুন",
    savingCost: "সেভ হচ্ছে...",
    totalCost: "মোট খরচ",
    todayCost: "আজকের খরচ",
    costEntries: "খরচ এন্ট্রি",
    dailyCostHistory: "দৈনিক খরচের তালিকা",
    dailyCostHistoryDescription: "দিনভিত্তিক খরচের সর্বশেষ এন্ট্রিগুলো এখানে দেখা যাবে।",
    dailyCost: "দৈনিক খরচ",
    todaysExpenses: "আজকের খরচ",
    noCostsFound: "কোনো খরচ এন্ট্রি পাওয়া যায়নি।",
    unableToSaveCost: "খরচ এন্ট্রি সেভ করা যায়নি।",
    costSavedSuccessfully: "খরচ এন্ট্রি সফলভাবে সেভ হয়েছে।",
    personNameRequired: "ব্যক্তির নাম প্রয়োজন।",
    purposeRequired: "উদ্দেশ্য লিখতে হবে।",
    unknownPerson: "অজানা ব্যক্তি",
    saltKg: "লবণ কেজি",
    amount: "পরিমাণ",
    saltPricePerKg: "লবণ মূল্য/কেজি",
    bagType: "বস্তার ধরন",
    trackCost: "ট্র্যাক খরচ",
    stockSummary: "স্টক সারসংক্ষেপ",
    refreshData: "তথ্য রিফ্রেশ করুন",
    refreshing: "রিফ্রেশ হচ্ছে...",
    currentStockSummary: "বর্তমান স্টক",
    purchasedFromSuppliers: "সরবরাহকারীদের থেকে ক্রয়",
    soldToCustomers: "গ্রাহকদের কাছে বিক্রয়",
    conversionLabel: "রূপান্তর",
    averagePerMaund: "গড় / মণ",
    supplierDueApproxDetail: "আনুমানিক বাকি",
    invoiceTitle: "ইনভয়েস",
    invoiceWorkspace: "ইনভয়েস ওয়ার্কস্পেস",
    invoiceWorkspaceDescription: "স্টেটমেন্ট দেখে নিন, তারপর রেকর্ডের জন্য পরিষ্কার কপি প্রিন্ট করুন।",
    backToProfile: "প্রোফাইলে ফিরুন",
    invoiceTo: "ইনভয়েস গ্রহণকারী",
    invoiceNumberLabel: "ইনভয়েস নম্বর",
    invoiceDateLabel: "ইনভয়েস তারিখ",
    periodLabel: "সময়সীমা",
    noDatedRecords: "তারিখযুক্ত কোনো রেকর্ড নেই",
    sku: "ক্রমিক",
    itemDescription: "বিবরণ",
    unitPrice: "একক মূল্য",
    quantityLabel: "পরিমাণ",
    totalLabel: "মোট",
    saleInformation: "বিক্রয়ের তথ্য",
    purchaseInformation: "ক্রয়ের তথ্য",
    recordCount: "রেকর্ড সংখ্যা",
    totalKgLabel: "মোট কেজি",
    totalQuantityLabel: "মোট পরিমাণ",
    salesCollection: "বিক্রয় আদায়",
    laterPayment: "পরবর্তী পরিশোধ",
    purchaseValue: "ক্রয় মূল্য",
    subTotalLabel: "সাব টোটাল",
    receivedLabel: "গৃহীত",
    taxRate: "কর হার",
    dueAmountBadge: "বাকি পরিমাণ",
    advanceAmountBadge: "অগ্রিম পরিমাণ",
    settled: "সমন্বয় সম্পন্ন",
    thankYouBusiness: "আপনার ব্যবসার জন্য ধন্যবাদ!",
    customerSignature: "গ্রাহকের স্বাক্ষর",
    supplierSignature: "সরবরাহকারীর স্বাক্ষর",
    authorizedSignature: "অনুমোদিত স্বাক্ষর",
    customerInvoiceFallback: "গ্রাহক",
    supplierInvoiceFallback: "সরবরাহকারী",
    saleEntryLabel: "বিক্রয় এন্ট্রি",
    saleAmountRecorded: "বিক্রয়ের পরিমাণ রেকর্ড করা হয়েছে",
    kgDeliveredNote: "কেজি সরবরাহ",
    paymentReceived: "পরিশোধ গ্রহণ",
    transactionLabel: "লেনদেন",
    customerPaymentNote: "গ্রাহকের পরিশোধ",
    customerTransactionNote: "গ্রাহক লেনদেন",
    saltPurchaseLabel: "লবণ ক্রয়",
    supplierPaymentLabel: "সরবরাহকারী পরিশোধ",
    purchaseEntryNote: "ক্রয় এন্ট্রি",
    legacyPurchaseEntryNote: "পুরোনো ক্রয় এন্ট্রি",
    paymentAdjustmentNote: "পরিশোধ সমন্বয়",
    printDateLabel: "প্রিন্ট তারিখ",
    saltKgShort: "লবণ (কেজি)",
    saltMaundShort: "লবণ (মণ)",
    paidAmountShort: "পরিশোধিত পরিমাণ",
    noteLabel: "নোট",
    purchaseLabel: "ক্রয়",
    perMaundPriceLabel: "প্রতি মণ Tk",
    saltSaleEntryNote: "লবণ বিক্রয় এন্ট্রি",
    customerPaymentEntryNote: "গ্রাহক পরিশোধ এন্ট্রি",
    supplierPaymentEntryNote: "সরবরাহকারী পরিশোধ এন্ট্রি",
    saltPurchaseEntryNote: "লবণ ক্রয় এন্ট্রি",
    noCustomerRecordsFound: "এই গ্রাহকের জন্য কোনো রেকর্ড পাওয়া যায়নি।",
    noSupplierRecordsFound: "এই সরবরাহকারীর জন্য কোনো রেকর্ড পাওয়া যায়নি।",
    bostaSackType: "বস্তা/স্যাকের ধরন",
    bagSize70: "প্রতি বস্তা ৭০ কেজি",
    bagSize65: "প্রতি বস্তা ৬৫ কেজি",
    bagSize60: "প্রতি বস্তা ৬০ কেজি",
    bagSize55: "প্রতি বস্তা ৫৫ কেজি",
    bagSize50: "প্রতি বস্তা ৫০ কেজি",
    bagSize45: "প্রতি বস্তা ৪৫ কেজি",
    bagSize40: "প্রতি বস্তা ৪০ কেজি",
    bagSize35: "প্রতি বস্তা ৩৫ কেজি",
    bagSize30: "প্রতি বস্তা ৩০ কেজি",
    bagSize25: "প্রতি বস্তা ২৫ কেজি",
    bagSize20: "প্রতি বস্তা ২০ কেজি",
    numberOfBostaSack: "বস্তা/স্যাকের সংখ্যা",
    editCustomerPriceTitle: "গ্রাহকের মূল্য সম্পাদনা করুন",
    editCustomerPriceDescription: "এই গ্রাহকের সর্বশেষ বিক্রয়মূল্য আপডেট করুন।",
    editSupplierPriceTitle: "সরবরাহকারীর মূল্য সম্পাদনা করুন",
    editSupplierPriceDescription: "এই সরবরাহকারীর সর্বশেষ ক্রয়মূল্য আপডেট করুন।",
    updateDetails: "তথ্য আপডেট করুন",
    updating: "আপডেট হচ্ছে...",
    showMore: "আরও দেখুন",
  },
};

export const DEFAULT_LANGUAGE: Language = "en";

export function loadStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "bn" ? "bn" : "en";
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
export function saveStoredLanguage(language: Language) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Ignore write failures.
  }
}

export function translate(language: Language, key: TranslationKey): string {
  return TRANSLATIONS[language][key] ?? key;
}
