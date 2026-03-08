# Tricount App - React Native + Supabase

A simple, clean expense-sharing app inspired by Tricount. Built with React Native (Expo) and Supabase.

## 📱 Features

- **Create Groups** - Start a trip, roommates group, or any shared expense scenario
- **Add Expenses** - Track who paid for what
- **Equal Split** - Automatically split expenses between selected members
- **Balance Overview** - See who owes whom at a glance
- **Smart Settlements** - Get suggestions for minimum transactions to settle up
- **Clean UI** - Modern, intuitive interface

## 🛠️ Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State**: Zustand
- **Navigation**: React Navigation
- **Styling**: Custom design system

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Supabase account

### 1. Clone and Install

```bash
cd tricount-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment

Edit `src/lib/supabase.ts` and replace:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 4. Run the App

```bash
# Start Expo development server
npm start

# Or run directly on iOS/Android
npm run ios
npm run android
```

## 📁 Project Structure

```
tricount-app/
├── App.tsx                 # Entry point
├── src/
│   ├── components/
│   │   └── ui/            # Reusable UI components
│   ├── lib/
│   │   ├── supabase.ts    # Supabase client & auth
│   │   └── services.ts    # API services
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── GroupsScreen.tsx
│   │   ├── GroupDetailScreen.tsx
│   │   ├── CreateGroupScreen.tsx
│   │   ├── AddExpenseScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── store/
│   │   └── authStore.ts   # Zustand auth state
│   ├── theme/
│   │   └── index.ts       # Design system
│   ├── types/
│   │   └── index.ts       # TypeScript types
│   └── utils/
│       └── balance.ts     # Balance calculation
└── supabase/
    └── schema.sql         # Database schema
```

## 🎨 Design System

The app uses a custom design system with:
- **Colors**: Indigo primary, clean neutrals
- **Typography**: System font with consistent sizing
- **Spacing**: 4px base unit (xs: 4, sm: 8, md: 16, lg: 24, xl: 32)
- **Border Radius**: Consistent rounded corners
- **Shadows**: Subtle elevation for depth

## 💡 Key Features Explained

### Balance Calculation

The balance algorithm:
1. Tracks who paid for each expense
2. Calculates each person's share based on splits
3. Computes net balance (credit - debt)
4. Uses greedy algorithm to minimize settlement transactions

### Split Types

Currently supports **equal split** - the amount is divided equally among selected members.

Future enhancements could add:
- Exact amounts per person
- Percentage-based splits
- Shares (1x, 2x, etc.)

## 📝 Database Schema

- **users**: User profiles
- **groups**: Expense groups
- **members**: Group members (can be linked to users)
- **expenses**: Individual expenses
- **expense_splits**: How expenses are split
- **settlements**: Payment records between members

All tables have Row Level Security (RLS) to ensure users only access their own data.

## 🔒 Security

- Supabase Auth for user authentication
- Row Level Security on all tables
- Members can only view/edit their groups
- Secure token storage with Expo SecureStore

## 📦 Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with ❤️ using React Native and Supabase
