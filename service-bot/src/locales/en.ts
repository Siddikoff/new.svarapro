// src/locales/en.ts
export const en = {
  welcome: (name: string) => `Hello, ${name}!`,

  help: {
    title: "📋 Available commands:\n\n",
    common: ["No available commands"],
  },

  errors: {
    tooManyRequests: "⚠️ Too many requests. Try again later.",
    userNotFound: "❌ User not found",
    insufficientBalance: "❌ Insufficient balance",
    invalidAmount: "❌ Invalid amount",
    serverError: "❌ Server error. Try again later.",
    accessDenied: "❌ Access denied",
    invalidCommand: "❌ Invalid command",
    invalidPassword:
      "❌ Password must contain only letters and numbers (6-20 characters)",
  },

  success: {
    balanceUpdated: "✅ Balance updated",
    userBanned: "✅ User banned",
    userUnbanned: "✅ User unbanned",
    transactionCreated: "✅ Transaction created",
    passwordCreated: "✅ Password created! Now you can use /admin to login.",
    loginSuccess: "✅ Successful authorization! Welcome to admin panel.",
  },

  admin: {
    panel: "🔧 Admin panel\n\nSelect action:",
    menu: "🔧 Admin menu\n\nWelcome to admin panel!",
    users: "👥 Users",
    stats: "📊 Statistics",
    userInfo: "👤 User information",
    banUser: "🚫 Ban user",
    unbanUser: "✅ Unban user",
    enterPassword: "🔐 Enter admin password:",
    createPassword:
      "🔐 Create new admin password (only letters and numbers, 6-20 characters):",
    wrongPassword: "❌ Wrong password",
    alreadyLoggedIn: "✅ You are already logged in as administrator.",
    notInAdminList: "❌ You are not in the administrators list.",
    firstTimeAdmin:
      "🔐 Welcome! This is your first login. Create admin password:",
    back: "⬅️ Back",
    search: "🔍 Search",
    next: "➡️ Next",
    prev: "⬅️ Previous",
    balance: "💰 Balance",
    addBalance: "➕ Add balance",
    removeBalance: "➖ Remove balance",
    amount: "Amount:",
    enterAmount: "Enter amount:",
    balanceUpdated: "Balance updated:",
    userNotFound: "User not found",
    noUsers: "No users found",
    totalUsers: "Total users:",
    showingUsers: "Showing users:",
    period: {
      day: "Day",
      week: "Week",
      month: "Month",
      total: "Total",
    },
  },

  balance: {
    current: (amount: number) => `💰 Your current balance: ${amount} USDT`,
    history: "📊 Transaction history:",
    noTransactions: "📊 No transactions found",
  },

  deposit: {
    title: "💳 Deposit funds",
    selectAmount: "Select amount to deposit:",
    processing: "⏳ Processing payment...",
    address: (address: string) => `💳 Deposit address:\n\`${address}\``,
  },

  withdraw: {
    title: "💸 Withdraw funds",
    enterAmount: "Enter amount to withdraw:",
    enterAddress: "Enter wallet address:",
    processing: "⏳ Processing withdrawal...",
  },
};
