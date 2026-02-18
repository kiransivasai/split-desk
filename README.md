# SplitDesk

SplitDesk is a professional expense-sharing web application built with Next.js, Mongoose, and TailwindCSS. It helps friends and teams manage shared expenses, track balances, and settle up efficiently with a focus on privacy and user experience.

## Features

- **Group Management**: Create groups for trips, office supplies, or team lunches.
- **Invite System**: Join groups easily via secure invite codes.
- **Expense Tracking**: Add and edit expenses with multiple split methods (equally, by amount, etc.).
- **Friendship System**: Formal friend requests and mutual consent for better privacy.
- **Settle Up**: Group-scoped settlement flow with support for various payment methods.
- **Analytics & Activity**: Track spending trends and stay updated with live activity feeds.
- **Privacy First**: Data isolate at the group level ensures you only see what you're involved in.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: NextAuth.js
- **Styling**: TailwindCSS
- **State Management**: Zustand

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/[your-username]/split-desk.git
    cd split-desk
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Environment Variables**:
    Create a `.env.local` file with the following variables:
    ```env
    MONGODB_URI=your_mongodb_connection_string
    NEXTAUTH_SECRET=your_auth_secret
    NEXTAUTH_URL=http://localhost:3000
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Build for production**:
    ```bash
    npm run build
    ```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
