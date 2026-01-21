# QR Order System - Self Service Food Ordering Platform

A production-ready QR-based self-service food ordering website similar to Moka/Majoo QR Order, built with Next.js, TypeScript, Tailwind CSS, and Firebase.

## 🚀 Features

- **QR Code Table Access**: Each table (Meja 1-20) has a unique QR code
- **Real-time Menu**: Browse menu with categories, real-time updates
- **Shopping Cart**: Add items, adjust quantities, add notes
- **Order Management**: Real-time order status updates (WAITING → PREPARING → READY → PAID)
- **QRIS Payment**: Integrated payment flow with QRIS (simulated)
- **Admin Dashboard**: Manage tables, products, and orders
- **Mobile-First Design**: Optimized for mobile devices

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore enabled

## 🛠️ Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure Firebase:**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Copy your Firebase config
   - Create `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

3. **Set up Firestore Security Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products - public read, admin write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null; // Admin only
    }
    
    // Tables - public read, admin write
    match /tables/{tableId} {
      allow read: if true;
      allow write: if request.auth != null; // Admin only
    }
    
    // Orders - public create, admin update
    match /orders/{orderId} {
      allow create: if true;
      allow read: if true;
      allow update: if request.auth != null; // Admin only
    }
    
    // Payments - public create, admin update
    match /payments/{paymentId} {
      allow create: if true;
      allow read: if true;
      allow update: if request.auth != null; // Admin only
    }
  }
}
```

4. **Create Firestore Collections:**

   The app will automatically create collections when you add data through the admin panel. Collections needed:
   - `tables`
   - `products`
   - `orders`
   - `payments`

5. **Run development server:**

```bash
npm run dev
```

6. **Open your browser:**

   - Customer: `http://localhost:3000/menu/1` (replace 1 with table number)
   - Admin: `http://localhost:3000/admin/tables`

## 📱 Usage

### Customer Flow

1. Scan QR code on table
2. Browser opens menu page for that table
3. Browse menu by category
4. Add items to cart
5. Review cart and checkout
6. Track order status in real-time
7. When order is READY, click "Pay with QRIS"
8. Scan QRIS code to complete payment

### Admin Flow

1. **Manage Tables** (`/admin/tables`):
   - Create tables (Meja 1-20)
   - Generate QR codes
   - Activate/deactivate tables

2. **Manage Products** (`/admin/products`):
   - Add/edit products
   - Set categories, prices, images
   - Manage stock

3. **Manage Orders** (`/admin/orders`):
   - View all orders
   - Filter by status/table
   - Update order status
   - Mark orders as paid

## 🏗️ Project Structure

```
app/
 ├─ layout.tsx              # Root layout
 ├─ page.tsx                # Home page
 ├─ menu/
 │   └─ [table]/
 │       ├─ page.tsx        # Menu page (customer)
 │       ├─ MenuList.tsx    # Menu list component
 │       └─ Cart.tsx        # Cart component
 ├─ admin/
 │   ├─ orders/             # Orders management
 │   ├─ tables/             # Tables management
 │   └─ products/           # Products management
 └─ payment/
     └─ qris/               # QRIS payment page

lib/
 ├─ firebase.ts             # Firebase initialization
 ├─ firestore.ts            # Firestore utilities
 ├─ types.ts                # TypeScript types
 ├─ cart-store.ts           # Zustand cart store
 └─ utils.ts                # Utility functions

components/
 ├─ Button.tsx              # Reusable button
 ├─ MenuCard.tsx            # Menu item card
 ├─ CategoryTabs.tsx        # Category filter tabs
 ├─ OrderStatus.tsx         # Order status component
 └─ QRCodeGenerator.tsx     # QR code generator
```

## 🔥 Firebase Collections

### tables
```typescript
{
  number: number,
  active: boolean
}
```

### products
```typescript
{
  name: string,
  price: number,
  category: string,
  image: string,
  stock: number
}
```

### orders
```typescript
{
  tableNumber: number,
  items: Array<{
    productId: string,
    name: string,
    qty: number,
    note?: string
  }>,
  status: "WAITING" | "PREPARING" | "READY" | "PAID",
  total: number,
  createdAt: Timestamp
}
```

### payments
```typescript
{
  orderId: string,
  method: "QRIS",
  amount: number,
  status: "PENDING" | "SUCCESS" | "FAILED",
  createdAt: Timestamp
}
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **State Management**: Zustand
- **Icons**: Lucide React
- **QR Codes**: react-qr-code

## 📝 Notes

- QRIS payment is simulated for demo purposes
- Table numbers are locked to the session via localStorage
- Cart persists across page refreshes
- Real-time updates use Firestore `onSnapshot` listeners
- Mobile-first responsive design

## 🚀 Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Vercel/Netlify or your preferred hosting
3. Update Firebase config with production URLs
4. Set environment variables in your hosting platform

## 📄 License

MIT









