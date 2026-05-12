# Subscription Update Functions: Cross-Chain Comparison

## Overview

**YES - The update functionality IS similar across all chains**, but with some **important differences** in permissions and costs.

---

## 📋 Update Functions Available

### 1. **updateSubscription()** - Change Amount & Time/Interval
```solidity
function updateSubscription(
    uint256 _subscriptionId, 
    uint256 _newAmount, 
    uint256 _newInterval
) external
```

**What it changes**:
- ✅ Payment amount (e.g., $10 → $15)
- ✅ Payment interval/frequency (e.g., daily → weekly)

**NOT possible in this function**:
- ❌ Receiver wallet (use `updateReceiver()` instead)
- ❌ Token type (would require creating new subscription)
- ❌ Sender wallet (immutable for security)

---

### 2. **updateReceiver()** - Change Wallet/Receiver
```solidity
function updateReceiver(
    uint256 _subscriptionId, 
    address _newReceiver
) external onlyOwner
```

**What it changes**:
- ✅ Where payments go (e.g., merchant wallet change)

**Security note**:
- 🔒 **ONLY contract owner can call** (prevents malicious rerouting)
- ⚠️ Not callable by user or merchant directly

---

## 🌐 Comparison by Chain

### ERC20 (Ethereum & EVM Chains)

| Feature | Details |
|---------|---------|
| **Contract** | CryptoPaySubscription.sol |
| **Update Amount/Time** | ✅ Supported |
| **Update Receiver** | ✅ Supported (owner only) |
| **Who can update amount/time** | Sender, Receiver, or Owner |
| **Gas cost to update** | ~50,000 gas ($0.75-5 depending on network) |
| **Confirmation time** | 12+ seconds (Ethereum), 3s (BSC) |
| **Validation** | Interval ≥ 60 seconds, Amount > 0 |
| **Event emitted** | `SubscriptionUpdated` |

```solidity
// Example: Ethereum updateSubscription
// Cost: ~$3.75 (Ethereum), ~$0.01 (BSC)

updateSubscription(
    subscriptionId=1,
    newAmount=1500000,  // 1.5 USDC (6 decimals)
    newInterval=86400   // Daily (86400 seconds)
);
```

---

### BEP20 (Binance Smart Chain)

| Feature | Details |
|---------|---------|
| **Contract** | Same as ERC20 (CryptoPaySubscription.sol) |
| **Update Amount/Time** | ✅ Supported |
| **Update Receiver** | ✅ Supported (owner only) |
| **Who can update amount/time** | Sender, Receiver, or Owner |
| **Gas cost to update** | ~50,000 gas = 0.0002 BNB (~$0.00005) |
| **Confirmation time** | 3 seconds |
| **Validation** | Same as ERC20 |
| **Event emitted** | `SubscriptionUpdated` |

```typescript
// Example: BSC updateSubscription
// Cost: ~$0.00005 USD (ultra cheap!)

const tx = await contract.updateSubscription(
    1,           // subscriptionId
    2000000,     // newAmount: 2 USDT (6 decimals)
    604800       // newInterval: Weekly (604800 seconds)
);
```

---

### TRC20 (TRON)

| Feature | Details |
|---------|---------|
| **Contract** | TronPaySubscription.sol |
| **Update Amount/Time** | ✅ Supported |
| **Update Receiver** | ✅ Supported (owner only) |
| **Who can update amount/time** | Sender, Receiver, or Owner |
| **Energy cost to update** | ~50,000 energy ≈ 0.002 TRX (~$0.00015) |
| **Confirmation time** | 1-3 seconds |
| **Validation** | Same as ERC20 |
| **Event emitted** | `SubscriptionUpdated` |
| **Free energy option** | ✅ If executor has bandwidth/staking rewards |

```typescript
// Example: TRON updateSubscription
// Cost: ~$0.00015 USD (or FREE with bandwidth!)

const txid = await tronWeb.transactionBuilder.triggerSmartContract(
    contractAddress,
    "updateSubscription(uint256,uint256,uint256)",
    { feeLimit: 100000000 },  // 100 TRX max (only uses ~0.002)
    [
        { type: 'uint256', value: 1 },          // subscriptionId
        { type: 'uint256', value: 2000000 },    // newAmount (2 USDT)
        { type: 'uint256', value: 604800 }      // newInterval (weekly)
    ]
);
```

---

## 🔐 Permission Model

### Who Can Call `updateSubscription()`?

```
✅ Subscription Sender (payer)
   └─ Can change their own payment amount/frequency
   └─ Example: User reduces daily subscription from $5 to $3

✅ Subscription Receiver (merchant)
   └─ Can change the subscription terms
   └─ Example: Shop increases subscription price

✅ Contract Owner
   └─ Can update any subscription
   └─ Use case: Admin adjustments or dispute resolution
```

### Who Can Call `updateReceiver()`?

```
✅ Contract Owner ONLY
   ⚠️ NOT available to sender or receiver
   
Reason: Security
   └─ Prevents attacker from rerouting payments
   └─ Owner maintains control over wallet addresses
   └─ Reduces phishing attack surface
```

---

## 💰 Cost Comparison: Update Transaction

```
┌──────────────┬────────────────┬─────────────┬──────────────┐
│ Chain        │ Gas/Energy     │ Cost (USD)  │ Batch Savings│
├──────────────┼────────────────┼─────────────┼──────────────┤
│ Ethereum     │ 50,000 gas     │ $1.88       │ 10% per batch│
│ Sepolia      │ 50,000 gas     │ $0.03       │ 10% per batch│
│ BSC          │ 50,000 gas     │ $0.00005    │ 10% per batch│
│ TRON         │ 50,000 energy  │ $0.00015    │ FREE possible│
│ TRON (Free*) │ Free bandwidth │ $0          │ $0           │
└──────────────┴────────────────┴─────────────┴──────────────┘
*With available staking rewards or daily bandwidth quota
```

---

## 🔄 Update Flow Comparison

### ERC20/BEP20 (Same Code)
```
User initiates update
    ↓
Call updateSubscription(id, newAmount, newInterval)
    ↓
Validate (amount > 0, interval ≥ 60)
    ↓
Update state: sub.amount = newAmount, sub.interval = newInterval
    ↓
Emit SubscriptionUpdated event
    ↓
Pay gas (~50,000 gas)
    ↓
Transaction confirmed (12-15s for Ethereum, 3s for BSC)
```

### TRC20
```
User initiates update
    ↓
Call updateSubscription(id, newAmount, newInterval) via TronWeb
    ↓
Validate (amount > 0, interval ≥ 60)
    ↓
Update state: sub.amount = newAmount, sub.interval = newInterval
    ↓
Emit SubscriptionUpdated event
    ↓
Use energy (~50,000 energy = 0.002 TRX or FREE)
    ↓
Transaction confirmed (1-3 seconds)
```

---

## 📝 Implementation Examples

### Update Amount & Interval

**Scenario**: Merchant raises price from $10/month to $15/month

#### Ethereum/BSC
```javascript
const { ethers } = require("ethers");
const contract = new ethers.Contract(
    contractAddress,
    CONTRACT_ABI,
    signer  // Sender, Receiver, or Owner
);

// Update to $15/month (assuming USDC with 6 decimals)
const tx = await contract.updateSubscription(
    1,              // subscriptionId
    15000000,       // newAmount: 15 USDC (15 * 10^6)
    2592000         // newInterval: 30 days in seconds
);

await tx.wait();
console.log("✅ Subscription updated");
```

**Gas Cost**:
```
Ethereum: 50,000 gas × 25 gwei = $1.88
BSC:      50,000 gas × 4 gwei = $0.00005
```

#### TRON
```javascript
const tronWeb = require("tronweb");

// Update to 15 USDT/month
const txid = await tronWeb.transactionBuilder.triggerSmartContract(
    contractAddress,
    "updateSubscription(uint256,uint256,uint256)",
    { feeLimit: 100000000 },  // Max 100 TRX
    [
        { type: "uint256", value: 1 },          // subscriptionId
        { type: "uint256", value: 15000000 },   // 15 USDT
        { type: "uint256", value: 2592000 }     // 30 days
    ]
);

console.log("✅ TRON transaction:", txid);
```

**Energy Cost**:
```
50,000 energy ≈ 0.002 TRX ≈ $0.0003 USD
OR FREE if executor has bandwidth
```

---

### Change Receiver Wallet

**Scenario**: Merchant moves to new wallet address

#### All Chains (Owner Only)
```javascript
// ONLY contract owner can call this

const tx = await contract.updateReceiver(
    1,                                    // subscriptionId
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" // New wallet address
);

await tx.wait();
console.log("✅ Receiver updated");
```

**Important**:
- ⚠️ Non-owner calls will REVERT
- 🔒 Prevents hacks where attacker redirects funds
- ✅ Event `ReceiverUpdated` is emitted for transparency

---

## ✅ Validation Rules (Same Across All Chains)

```solidity
// All chains enforce these rules:

updateSubscription validation:
├─ _newAmount > 0
├─ _newInterval > 0
├─ _newInterval >= 60 seconds (minimum 1 minute)
├─ Subscription must be active
├─ Caller must be: sender, receiver, or owner
└─ Updates amount AND interval (both required)

updateReceiver validation:
├─ _newReceiver != address(0)
├─ _newReceiver != current receiver (prevent no-op)
├─ Subscription must be active
├─ Caller must be: owner ONLY
└─ Updates receiver wallet address
```

---

## 🔔 Events Emitted

### SubscriptionUpdated (Amount/Interval)
```solidity
event SubscriptionUpdated(
    uint256 indexed subscriptionId,
    uint256 newAmount,
    uint256 newInterval
);
```

**Emitted when**:
- User updates their subscription terms

**Useful for**:
- Frontend notifications
- Audit logging
- Tracking price changes

---

### ReceiverUpdated (Wallet)
```solidity
event ReceiverUpdated(
    uint256 indexed subscriptionId,
    address indexed oldReceiver,
    address indexed newReceiver
);
```

**Emitted when**:
- Owner changes the receiver address

**Useful for**:
- Security alerts (someone changed payment destination!)
- Wallet migration tracking
- Compliance logging

---

## 📊 State Changes (Before → After)

### Example: Update Amount & Interval

**Before Update**:
```
Subscription #1:
├─ Sender: 0x123... (payer)
├─ Receiver: 0xABC... (merchant)
├─ Amount: 10 USDC
├─ Interval: 86400 seconds (daily)
├─ NextPaymentTime: 2026-05-10T12:00:00Z
└─ Active: true
```

**After Update** (call: `updateSubscription(1, 15000000, 2592000)`):
```
Subscription #1:
├─ Sender: 0x123... (unchanged)
├─ Receiver: 0xABC... (unchanged)
├─ Amount: 15 USDC ← CHANGED
├─ Interval: 2592000 seconds (30 days) ← CHANGED
├─ NextPaymentTime: 2026-05-10T12:00:00Z (unchanged)
└─ Active: true (unchanged)
```

**Result**:
- ✅ Next payment: 15 USDC
- ✅ Payment frequency: Monthly instead of daily
- ✅ Previous payments not refunded
- ✅ New terms apply to future payments only

---

## 🚨 Edge Cases & Limitations

| Scenario | ERC20/BEP20 | TRC20 | Resolution |
|----------|-----------|-------|-----------|
| Update non-existent subscription | ❌ Reverts | ❌ Reverts | Must use valid subscriptionId |
| Update cancelled subscription | ❌ Reverts | ❌ Reverts | Can't modify inactive subscriptions |
| Zero amount update | ❌ Reverts | ❌ Reverts | Amount must be > 0 |
| Interval < 60 seconds | ❌ Reverts | ❌ Reverts | Minimum interval: 1 minute |
| Receiver to same address | ❌ Reverts | ❌ Reverts | Must be different address |
| Non-owner change receiver | ❌ Reverts | ❌ Reverts | Only owner can update receiver |

---

## 💡 Best Practices

### For Users/Merchants
```
✅ DO:
- Update frequently if terms change
- Notify other party before updating amount
- Keep interval reasonable (not < 1 minute)
- Monitor SubscriptionUpdated events

❌ DON'T:
- Try to change receiver (only owner can)
- Update to $0 or negative amount
- Attempt hundreds of updates per day (batching is better)
- Assume old terms apply after update
```

### For Contract Owners
```
✅ DO:
- Keep updateReceiver calls minimal (only when necessary)
- Use multisig wallet for updateReceiver calls
- Log all receiver changes (compliance)
- Alert users when receiver changes

❌ DON'T:
- Change receiver without notification
- Use updateReceiver for other purposes
- Allow automated receiver updates
```

---

## 📈 Cost-Effective Strategies

### Batch Updates (For Multiple Subscriptions)
```javascript
// Instead of updating one by one:
// ❌ Bad: 100 updates × $1.88 (ETH) = $188

// ✅ Better: Group similar updates
// If 50 subscriptions need same new amount:
// Still 50 calls, but can coordinate in single transaction block

// ✅ Best: Use Backend service for aggregated updates
// 1 database update affecting many subscriptions
```

### Timing Updates
```
ERC20 (Ethereum):
├─ Update during low-gas hours (2-6 AM UTC)
├─ Avoid peak hours (saves 50-80% on gas)
└─ Cost: $0.38-1.88 depending on time

BEP20:
├─ Cost is always low (~$0.00005)
└─ Timing doesn't matter much

TRC20:
├─ Cost is stable (~$0.0003 or FREE)
├─ Always optimal timing
└─ Batch updates for maximum efficiency
```

---

## 🔍 Monitoring & Auditing

### Track All Updates
```typescript
// Listen for update events
contract.on("SubscriptionUpdated", (subId, newAmount, newInterval) => {
    console.log(`Sub #${subId}: Amount=${newAmount}, Interval=${newInterval}`);
});

contract.on("ReceiverUpdated", (subId, oldReceiver, newReceiver) => {
    console.log(`🚨 ALERT: Sub #${subId} receiver changed!`);
    console.log(`  From: ${oldReceiver}`);
    console.log(`  To: ${newReceiver}`);
});
```

### Database Tracking
```sql
-- Log all updates
INSERT INTO subscription_updates (
    subscription_id,
    old_amount,
    new_amount,
    old_interval,
    new_interval,
    updated_by,
    chain_id,
    tx_hash
) VALUES (...)

-- Monitor receiver changes
INSERT INTO receiver_updates (
    subscription_id,
    old_receiver,
    new_receiver,
    updated_at,
    updater_address
) VALUES (...)
```

---

## Summary Table

| Aspect | ERC20 | BEP20 | TRC20 | Status |
|--------|-------|-------|-------|--------|
| **Update Amount** | ✅ | ✅ | ✅ | SAME |
| **Update Interval** | ✅ | ✅ | ✅ | SAME |
| **Update Receiver** | ✅ | ✅ | ✅ | SAME |
| **Validation Rules** | ✅ | ✅ | ✅ | IDENTICAL |
| **Permission Model** | ✅ | ✅ | ✅ | IDENTICAL |
| **Gas/Energy Cost** | Different | Cheaper | Cheapest | VARIES |
| **Confirmation Time** | 12-15s | 3s | 1-3s | VARIES |

✅ **Conclusion**: Functionality is **IDENTICAL across chains**, but **costs vary dramatically** (100-1000x difference).

---

**Last Updated**: May 2026  
**Document Version**: 1.0
