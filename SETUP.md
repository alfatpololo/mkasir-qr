# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Firestore Database
   - Copy your Firebase config to `.env.local`
   - Deploy Firestore security rules from `firestore.rules`

3. **Initialize Data (Optional)**
   
   You can manually add initial data through Firebase Console or use the admin panel:
   
   - Go to `/admin/tables` to create tables
   - Go to `/admin/products` to add menu items

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Firebase Collections Setup

### 1. Tables Collection
Create tables through admin panel at `/admin/tables` or manually:

```javascript
// Example table document
{
  number: 1,
  active: true
}
```

### 2. Products Collection
Add products through admin panel at `/admin/products`:

```javascript
// Example product document
{
  name: "Nasi Goreng",
  price: 25000,
  category: "Makanan",
  image: "https://example.com/image.jpg",
  stock: 100
}
```

### 3. Orders & Payments
These collections are created automatically when customers place orders.

## Testing the Flow

1. **Create Tables**: Go to `/admin/tables` and create a few tables
2. **Add Products**: Go to `/admin/products` and add menu items
3. **Test Customer Flow**: 
   - Visit `/menu/1` (replace 1 with your table number)
   - Add items to cart
   - Checkout
   - View order status
4. **Test Admin Flow**:
   - Go to `/admin/orders`
   - Update order status (WAITING → PREPARING → READY)
   - Customer can then pay
5. **Test Payment**:
   - When order is READY, customer clicks "Pay with QRIS"
   - Use "Simulate Payment" button for demo
   - Order status updates to PAID

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Security Rules

Deploy the security rules from `firestore.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

Or copy-paste the rules from `firestore.rules` into Firebase Console → Firestore → Rules.

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Vercel/Netlify:
   - Connect your repository
   - Add environment variables
   - Deploy

3. Update Firebase authorized domains with your production URL

4. Test QR codes work with production URL




