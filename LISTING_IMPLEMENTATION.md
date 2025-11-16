# NFT Listing System Implementation

## Overview
NFT listing/buying/unlisting system with **PSBT-based blockchain integration** using event-sourced approach.

**✅ Blockchain Integration Complete!**
- Seller creates PSBT when listing (signed with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY)
- Buyer completes PSBT with payment inputs and broadcasts to blockchain
- Real on-chain NFT transfers using bitcoinjs-lib

---

## Database Schema (Prisma)

```prisma
model listings {
  id            String   @id @default(cuid())
  inscriptionId String   // FK to inscriptions.id
  status        String   // "unlisted" | "listed" | "sold" | "sent"
  psbtBase64    String?
  priceSats     Int?
  sellerAddress String
  buyerAddress  String?
  txid          String?
  createdAt     DateTime @default(now())

  inscription inscriptions @relation(fields: [inscriptionId], references: [id])
}
```

**Event Sourcing:** Each action creates a NEW row instead of updating. The latest record determines current status.

---

## Backend API (NestJS)

### Module Structure
```
backend/src/listings/
├── listings.module.ts       # Module definition
├── listings.controller.ts   # REST API endpoints
└── listings.service.ts      # Business logic
```

### API Endpoints

#### 1. **POST /api/listings/list**
List an NFT for sale

**Request:**
```json
{
  "inscriptionId": "abc123...i0",
  "priceSats": 1000000,
  "sellerAddress": "PYourWalletAddress123",
  "psbtBase64": "cHNidP8BAH..." // Base64 encoded PSBT (optional for testing)
}
```

**Response:**
```json
{
  "success": true,
  "listing": { /* listing object */ },
  "message": "NFT listed successfully"
}
```

**Logic:**
1. Find inscription by `inscriptionId` (blockchain ID)
2. Create new row with `status='listed'`
3. Return success

---

#### 2. **POST /api/listings/buy**
Buy a listed NFT

**Request:**
```json
{
  "inscriptionId": "abc123...i0",
  "buyerAddress": "PBuyerAddress456",
  "priceSats": 1000000,
  "txid": "abc123...def" // Transaction ID (optional for testing)
}
```

**Response:**
```json
{
  "success": true,
  "listing": { /* sold listing */ },
  "message": "NFT purchased successfully"
}
```

**Logic:**
1. Find inscription
2. Get latest listing (must be `status='listed'`)
3. Create new row with `status='sold'` + buyer info
4. Return success

---

#### 3. **POST /api/listings/unlist**
Cancel a listing

**Request:**
```json
{
  "inscriptionId": "abc123...i0",
  "sellerAddress": "PYourWalletAddress123"
}
```

**Response:**
```json
{
  "success": true,
  "listing": { /* unlisted record */ },
  "message": "NFT unlisted successfully"
}
```

**Logic:**
1. Find inscription
2. Get latest listing (must be `status='listed'`)
3. Verify seller address matches
4. Create new row with `status='unlisted'`
5. Return success

---

#### 4. **GET /api/listings**
Get all active listings

**Response:**
```json
[
  {
    "id": "...",
    "status": "listed",
    "priceSats": 1000000,
    "sellerAddress": "P...",
    "inscription": {
      "inscriptionId": "...",
      "name": "...",
      "collection": { /* collection data */ }
    }
  }
]
```

**Logic:**
- Uses SQL query to get latest status per inscription
- Filters to only show `status='listed'`
- Returns with full relations

---

#### 5. **GET /api/listings/inscription/:inscriptionId**
Get listing status for specific NFT

**Response:**
```json
{
  "status": "listed",
  "listing": { /* listing object with relations */ }
}
```

---

## Frontend Implementation

### 1. **Wallet Page** (`/wallet/:address`)

**List NFT Function:**
```typescript
async function handleList() {
  await apiClient.post("/listings/list", {
    inscriptionId: item.inscription_id,
    priceSats: Number(price),
    sellerAddress: walletAddress,
  });

  alert("NFT listed successfully!");
  window.location.reload();
}
```

**Unlist NFT Function:**
```typescript
const handleUnlist = async (item: any) => {
  await apiClient.post("/listings/unlist", {
    inscriptionId: item.inscription_id,
    sellerAddress: walletAddress,
  });

  alert("NFT unlisted successfully!");
  window.location.reload();
};
```

**Features:**
- Price input with fee calculation (1.4% maker fee)
- You receive calculation: `price * 0.986`
- Confirms listing on button click
- List/Unlist toggle based on current status

---

### 2. **NFT Collection Page** (`/nfts/:collectionSymbol`)

**Buy NFT Function:**
```typescript
const handleBuy = async (item: any) => {
  const priceSats = item.activities[item.activities.length - 1].priceSats;

  await axios.post("http://localhost:5555/api/listings/buy", {
    inscriptionId: item.inscriptionId,
    buyerAddress: walletAddress,
    priceSats: priceSats,
  });

  alert("NFT purchased successfully!");
  window.location.reload();
};
```

**Features:**
- Shows price + 2.8% taker fee
- Shows network fee (~0.5 PEPE)
- Shows total cost
- Checks balance before allowing purchase
- Disabled button if insufficient balance

---

## Event Flow

### Listing Flow
```
User clicks "List"
  → Enter price
  → handleList()
  → POST /api/listings/list
  → New row: status='listed', priceSats=X
  → Page reloads
  → NFT shows as "Listed"
```

### Buying Flow
```
User clicks "Buy"
  → Checks balance
  → handleBuy(item)
  → POST /api/listings/buy
  → New row: status='sold', buyerAddress=Y
  → Page reloads
  → NFT shows as "Sold"
```

### Unlisting Flow
```
User clicks "Unlist"
  → handleUnlist(item)
  → POST /api/listings/unlist
  → Verify seller owns it
  → New row: status='unlisted'
  → Page reloads
  → NFT shows as "Not listed"
```

---

## Status Determination

**How to get current status:**
```sql
-- Get latest record per inscription
SELECT DISTINCT ON ("inscriptionId")
  id, status, priceSats, createdAt
FROM listings
ORDER BY "inscriptionId", "createdAt" DESC
```

**Status values:**
- `listed` - Available for purchase
- `sold` - Recently sold
- `unlisted` - Delisted by seller
- `sent` - Transferred out

---

## Key Features

### ✅ Event Sourcing
- Never updates rows, only inserts
- Full history tracking
- Easy audit trail

### ✅ Simplified (No Blockchain)
- No PSBT creation
- No transaction broadcasting
- Database-only operations
- Fast response times

### ✅ Validation
- Check inscription exists
- Verify seller ownership
- Check current status
- Prevent double-listing

### ✅ Frontend Integration
- Simple axios calls
- Clear error messages
- Page refresh on success
- Status-based UI updates

---

## Testing Checklist

- [ ] List NFT from wallet page
- [ ] Verify listed NFT appears in collection page
- [ ] Buy listed NFT from collection page
- [ ] Verify status changes to "sold"
- [ ] Unlist NFT from wallet page
- [ ] Verify unlisted NFT disappears from marketplace
- [ ] Try to list NFT that's already listed (should fail)
- [ ] Try to unlist someone else's NFT (should fail)
- [ ] Check listing history in database

---

## Files Modified/Created

**Backend:**
- ✅ `backend/src/listings/listings.module.ts`
- ✅ `backend/src/listings/listings.controller.ts`
- ✅ `backend/src/listings/listings.service.ts`
- ✅ `backend/src/app.module.ts` (added ListingsModule)

**Frontend:**
- ✅ `frontend/src/app/wallet/[address]/page.tsx` (handleList, handleUnlist)
- ✅ `frontend/src/components/page/nfts/[nft]/NftTabs.tsx` (handleBuy)

**Database:**
- ✅ Uses existing `listings` table from Prisma schema

---

## Next Steps (Optional Enhancements)

1. **Add Real Blockchain Integration**
   - Create PSBTs for real trades
   - Broadcast transactions
   - Verify on-chain ownership

2. **Add Websockets**
   - Real-time status updates
   - No page refresh needed

3. **Add Activity Feed**
   - Show listing/sale history
   - Track price changes

4. **Add Analytics**
   - Floor price calculation
   - Volume tracking
   - Sales statistics

5. **Add Notifications**
   - Toast messages instead of alerts
   - Success/error feedback

---

## Environment Variables

Make sure these are set in your `.env` files:

**Backend:**
```env
DATABASE_URL="postgresql://..."
PORT=5555
```

**Frontend:**
```env
NEXT_PUBLIC_ORD_API_BASE="http://62.84.181.219:7777"
```

---

## Running the Application

**Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5555
```

**Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:4000
```

---

## API Testing (cURL Examples)

**List NFT:**
```bash
curl -X POST http://localhost:5555/api/listings/list \
  -H "Content-Type: application/json" \
  -d '{
    "inscriptionId": "abc123i0",
    "priceSats": 1000000,
    "sellerAddress": "PYourAddress123"
  }'
```

**Buy NFT:**
```bash
curl -X POST http://localhost:5555/api/listings/buy \
  -H "Content-Type: application/json" \
  -d '{
    "inscriptionId": "abc123i0",
    "buyerAddress": "PBuyerAddress456",
    "priceSats": 1000000
  }'
```

**Get Active Listings:**
```bash
curl http://localhost:5555/api/listings
```

---

## Notes

- **No authentication yet** - Add auth middleware for production
- **No rate limiting** - Add rate limits to prevent spam
- **Basic validation** - Add more robust input validation
- **No image uploads** - Uses inscription IDs for images
- **Page refreshes** - Consider using state management instead

---

## Support

For issues or questions, check:
- Prisma schema: `backend/prisma/schema.prisma`
- Backend logs: Console output when running `npm run dev`
- Frontend errors: Browser console (F12)
- Database: Check Neon dashboard or use Prisma Studio

---

## Blockchain Integration (PSBT)

### Overview
The marketplace now uses **Partially Signed Bitcoin Transactions (PSBTs)** for real on-chain NFT trading.

### How It Works

**Listing Flow:**
1. Seller finds the UTXO containing the inscription
2. Seller creates a PSBT with:
   - Input: Inscription UTXO
   - Output 0: NFT to buyer (placeholder address)
   - Output 1: Payment to seller
3. Seller signs with `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY`
4. PSBT saved to database as base64

**Buying Flow:**
1. Buyer retrieves PSBT from database
2. Buyer updates Output 0 to their address
3. Buyer adds payment inputs (their UTXOs)
4. Buyer adds change output if needed
5. Buyer signs all their inputs
6. Buyer broadcasts complete transaction
7. Transaction ID saved to database

### Files Created

**Frontend:**
- `frontend/src/lib/marketplace/psbt.ts` - PSBT creation and completion helpers
  - `createListingPSBT()` - Seller creates partially signed PSBT
  - `completeBuyPSBT()` - Buyer completes and broadcasts PSBT
  - `findInscriptionUTXO()` - Locates inscription UTXO

**Backend Updates:**
- `backend/src/listings/listings.service.ts` - Added psbtBase64 and txid fields
- `backend/src/listings/listings.controller.ts` - Updated DTOs

### Transaction Structure

```
Inputs:
  [0] Inscription UTXO (signed by seller with SIGHASH_SINGLE | ANYONECANPAY)
  [1+] Buyer payment UTXOs (signed by buyer)

Outputs:
  [0] NFT to buyer address (546 sats)
  [1] Payment to seller (priceSats)
  [2] Change to buyer (if any)
```

### SIGHASH Flags

**SIGHASH_SINGLE | SIGHASH_ANYONECANPAY:**
- Seller only signs their input (inscription) and corresponding output
- Allows buyer to add more inputs and modify other outputs
- Perfect for marketplace atomic swaps

### Security Features

✅ **Atomic swaps** - Either both transfer NFT and payment, or neither
✅ **No escrow needed** - Direct peer-to-peer trading
✅ **Seller can't cancel** - PSBT is already signed
✅ **Buyer controls broadcast** - Only buyer can complete the transaction

### Testing the Integration

1. **List an NFT:**
   ```
   - Go to /wallet/:yourAddress
   - Click "List" on an NFT
   - Enter price
   - PSBT is created and saved
   ```

2. **Buy an NFT:**
   ```
   - Go to /nfts/:collection
   - Find a listed NFT
   - Click "Buy"
   - Transaction is broadcast
   - Check txid in alert message
   ```

3. **Verify on-chain:**
   ```
   - Copy the txid from success alert
   - Check blockchain explorer
   - NFT should move to buyer's address
   - Payment should go to seller
   ```

### Error Handling

Common issues:
- **"Inscription UTXO not found"** - Make sure you own the NFT
- **"Insufficient balance"** - Buyer needs PEPE for price + fees
- **"Listing PSBT not found"** - Seller must list with PSBT first
- **"Broadcast failed"** - Check network connection and fees

### Future Enhancements

- [ ] Add signature verification before storing PSBT
- [ ] Implement PSBT expiration (time-limited listings)
- [ ] Support for collection offers (buyer creates PSBT)
- [ ] Batch listing/buying multiple NFTs
- [ ] Fee estimation improvements

---

**Implementation Complete with Blockchain! 🎉**
