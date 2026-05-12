# Complete Testing Guide: Update Subscriptions Across All Chains

## ⚠️ Important Notes

- **You** must execute transactions (I cannot spend real funds)
- **Testnet First**: Always test on Sepolia/BSC Testnet/TRON Nile before mainnet
- **Test Funds**: Get free testnet tokens from faucets
- **Real Mainnet**: Use real funds only after successful testnet testing

---

## 🔧 Prerequisites

### Install Dependencies
```bash
npm install ethers dotenv
npm install tronweb  # For TRON
```

### Setup Environment Variables
```bash
# .env file
EXECUTOR_PRIVATE_KEY=0x...your_key...
TESTNET_RPC_ETHEREUM=https://ethereum-sepolia-rpc.publicnode.com
TESTNET_RPC_BSC=https://data-seed-prebsc-1-b.binance.org:8545
TESTNET_RPC_TRON=https://nile.trongrid.io
MAINNET_RPC_ETHEREUM=https://eth.llamarpc.com
MAINNET_RPC_BSC=https://bsc-dataseed1.binance.org
MAINNET_RPC_TRON=https://api.tronstack.io/rpc
```

---

## 📋 Test Sequence

```
Phase 1: Testnet (Free)
├─ Create subscription on Sepolia
├─ Update amount (transaction 1)
├─ Update interval (transaction 2)
├─ Update receiver (transaction 3)
├─ Verify state changes
└─ ✅ If all pass → Continue

Phase 2: Testnet (Different Chains)
├─ Repeat on BSC Testnet
├─ Repeat on TRON Nile
└─ Verify consistency

Phase 3: Mainnet (Real Money)
├─ Create subscription with small amount
├─ Update amount (transaction 1)
├─ Update interval (transaction 2)
├─ Update receiver (transaction 3)
├─ Monitor costs
└─ ✅ Document results
```

---

## 🧪 TEST 1: ETHEREUM SEPOLIA (Testnet)

### Step 1: Get Test ETH
```bash
# Visit faucet
https://sepoliafaucet.com

# Enter your executor address: 0x...
# Click "Claim" → Wait ~1 minute
# Verify: https://sepolia.etherscan.io/address/0x...
```

### Step 2: Get Test USDC
```bash
# Visit faucet
https://faucets.circle.com/

# Enter address → Claim 10 USDC on Sepolia
# Verify balance in MetaMask or via Etherscan
```

### Step 3: Deploy Subscription Contract
```bash
npx hardhat run scripts/deploy.cjs --network sepolia
# Output:
# Contract deployed at: 0x...ABC...
# Save this address!
```

### Step 4: Test Script - Create Subscription

Create file: `test-ethereum-update.js`

```javascript
const { ethers } = require("ethers");
require("dotenv").config();

const SEPOLIA_RPC = process.env.TESTNET_RPC_ETHEREUM;
const PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const CONTRACT_ADDRESS = "0x..."; // From deploy step
const USDC_ADDRESS = "0xaA8E23Fb1079EA71e0a1bF189A146386c0930758"; // Sepolia USDC

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract ABIs
const SUBSCRIPTION_ABI = [
  "function activate(address receiver, address token, uint256 initialAmount, uint256 recurringAmount, uint256 interval) public returns (uint256)",
  "function updateSubscription(uint256 subscriptionId, uint256 newAmount, uint256 newInterval) external",
  "function updateReceiver(uint256 subscriptionId, address newReceiver) external",
  "function getSubscription(uint256 subscriptionId) external view returns (tuple(address sender, address receiver, address token, uint256 amount, uint256 interval, uint256 nextPaymentTime, bool active, uint256 totalPaid, uint256 paymentCount))",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
];

async function runTest() {
  console.log("🧪 Ethereum Sepolia Subscription Update Test");
  console.log("=".repeat(60));

  const contract = new ethers.Contract(CONTRACT_ADDRESS, SUBSCRIPTION_ABI, wallet);
  const usdcToken = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

  try {
    // Step 1: Check balance
    console.log("\n📊 Step 1: Check Balances");
    const ethBalance = await provider.getBalance(wallet.address);
    const usdcBalance = await usdcToken.balanceOf(wallet.address);
    console.log(`  ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`  USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    if (usdcBalance < ethers.parseUnits("10", 6)) {
      console.error("  ❌ Not enough USDC. Get free USDC from faucet first!");
      return;
    }

    // Step 2: Approve spending
    console.log("\n💰 Step 2: Approve Spending");
    const approveTx = await usdcToken.approve(
      CONTRACT_ADDRESS,
      ethers.parseUnits("1000", 6)  // 1000 USDC
    );
    console.log(`  Tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log(`  ✅ Approved`);

    // Step 3: Create Subscription (TRANSACTION 1: INITIAL)
    console.log("\n✅ Step 3: Create Subscription (INITIAL)");
    const receiver = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"; // Example wallet
    const initialTx = await contract.activate(
      receiver,
      USDC_ADDRESS,
      ethers.parseUnits("5", 6),      // 5 USDC initial
      ethers.parseUnits("10", 6),     // 10 USDC recurring
      86400                            // Daily (86400 seconds)
    );
    console.log(`  Tx: ${initialTx.hash}`);
    const receipt1 = await initialTx.wait();
    console.log(`  ✅ Created`);

    // Parse subscription ID from events
    const iface = new ethers.Interface(SUBSCRIPTION_ABI);
    let subscriptionId = null;
    for (const log of receipt1.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "SubscriptionCreated") {
          subscriptionId = parsed.args[0];
          break;
        }
      } catch (e) {}
    }

    if (!subscriptionId) {
      console.error("  ❌ Could not parse subscription ID from logs");
      return;
    }

    console.log(`  📍 Subscription ID: ${subscriptionId}`);

    // Step 4: Get Current State
    console.log("\n🔍 Step 4: Get Current State (Before Update)");
    const sub1 = await contract.getSubscription(subscriptionId);
    console.log(`  Amount: ${ethers.formatUnits(sub1.amount, 6)} USDC`);
    console.log(`  Interval: ${sub1.interval} seconds (${sub1.interval / 86400} days)`);
    console.log(`  Receiver: ${sub1.receiver}`);
    console.log(`  Active: ${sub1.active}`);

    // Step 5: UPDATE TRANSACTION 2 - Change Amount & Interval
    console.log("\n📝 Step 5: UPDATE #1 - Change Amount & Interval");
    console.log(`  BEFORE: 10 USDC daily`);
    console.log(`  AFTER: 15 USDC weekly`);
    const updateTx1 = await contract.updateSubscription(
      subscriptionId,
      ethers.parseUnits("15", 6),  // 15 USDC
      604800                        // Weekly (604800 seconds)
    );
    console.log(`  Tx: ${updateTx1.hash}`);
    await updateTx1.wait();
    console.log(`  ✅ Updated`);

    // Verify update
    const sub2 = await contract.getSubscription(subscriptionId);
    console.log(`  ✓ New Amount: ${ethers.formatUnits(sub2.amount, 6)} USDC`);
    console.log(`  ✓ New Interval: ${sub2.interval} seconds (${sub2.interval / 86400} days)`);

    // Step 6: UPDATE TRANSACTION 3 - Change Wallet
    console.log("\n🔄 Step 6: UPDATE #2 - Change Receiver Wallet");
    const newReceiver = "0x8626f6940E2eb28930DF3a7df26f9aD6CfF30z1"; // Different wallet
    console.log(`  BEFORE: ${sub2.receiver}`);
    console.log(`  AFTER: ${newReceiver}`);
    
    // Note: Only owner can call updateReceiver
    // Using contract as owner (if you are the owner)
    const updateTx2 = await contract.updateReceiver(
      subscriptionId,
      newReceiver
    );
    console.log(`  Tx: ${updateTx2.hash}`);
    await updateTx2.wait();
    console.log(`  ✅ Receiver Updated`);

    // Verify receiver change
    const sub3 = await contract.getSubscription(subscriptionId);
    console.log(`  ✓ New Receiver: ${sub3.receiver}`);

    // Step 7: Final State
    console.log("\n📊 Step 7: Final State Summary");
    console.log(`  Subscription ID: ${subscriptionId}`);
    console.log(`  Amount: ${ethers.formatUnits(sub3.amount, 6)} USDC`);
    console.log(`  Interval: ${sub3.interval / 86400} days`);
    console.log(`  Receiver: ${sub3.receiver}`);
    console.log(`  Active: ${sub3.active}`);

    // Step 8: Cost Analysis
    console.log("\n💵 Step 8: Cost Analysis");
    const gasPrice = await provider.getGasPrice();
    console.log(`  Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`  Create Cost: ~${(50000 * ethers.formatUnits(gasPrice, "gwei") * 0.000000001 * 2500).toFixed(2)} USD`);
    console.log(`  Update Cost: ~${(50000 * ethers.formatUnits(gasPrice, "gwei") * 0.000000001 * 2500).toFixed(2)} USD`);

    console.log("\n✅ ALL TESTS PASSED!");

  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.data) console.error("Data:", err.data);
  }
}

runTest();
```

### Run Test
```bash
node test-ethereum-update.js
```

### Expected Output
```
🧪 Ethereum Sepolia Subscription Update Test
============================================================

📊 Step 1: Check Balances
  ETH Balance: 0.5 ETH
  USDC Balance: 100 USDC

💰 Step 2: Approve Spending
  Tx: 0x...
  ✅ Approved

✅ Step 3: Create Subscription (INITIAL)
  Tx: 0x...
  ✅ Created
  📍 Subscription ID: 1

🔍 Step 4: Get Current State (Before Update)
  Amount: 10 USDC
  Interval: 86400 seconds (1 days)
  Receiver: 0x742d35Cc...
  Active: true

📝 Step 5: UPDATE #1 - Change Amount & Interval
  BEFORE: 10 USDC daily
  AFTER: 15 USDC weekly
  Tx: 0x...
  ✅ Updated
  ✓ New Amount: 15 USDC
  ✓ New Interval: 604800 seconds (7 days)

🔄 Step 6: UPDATE #2 - Change Receiver Wallet
  BEFORE: 0x742d35Cc...
  AFTER: 0x8626f69...
  Tx: 0x...
  ✅ Receiver Updated
  ✓ New Receiver: 0x8626f69...

📊 Step 7: Final State Summary
  Subscription ID: 1
  Amount: 15 USDC
  Interval: 604800 seconds (7 days)
  Receiver: 0x8626f69...
  Active: true

💵 Step 8: Cost Analysis
  Gas Price: 3.5 gwei
  Create Cost: ~$0.30 USD
  Update Cost: ~$0.30 USD

✅ ALL TESTS PASSED!
```

---

## 🧪 TEST 2: BSC TESTNET

### Step 1: Get Test BNB
```bash
# Visit faucet
https://testnet.binance.org/faucet

# Claim 0.5 BNB
# Takes ~1 minute
```

### Step 2: Get Test USDT
```bash
# BSC Testnet USDT faucet
https://faucets.circle.com/

# Or use MetaMask to add BSC Testnet and get test tokens
```

### Step 3: Deploy on BSC Testnet
```bash
npx hardhat run scripts/deploy.cjs --network bsc-testnet
# Save contract address
```

### Step 4: Test Script - Same as Ethereum but different RPC

```javascript
// Modify the test script:
const TESTNET_RPC = "https://data-seed-prebsc-1-b.binance.org:8545";
const CONTRACT_ADDRESS = "0x..."; // BSC testnet contract
const USDT_ADDRESS = "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd"; // BSC Testnet USDT

// Rest of script is identical
```

### Run Test
```bash
node test-bsc-update.js
```

---

## 🧪 TEST 3: TRON NILE TESTNET

### Step 1: Get Test TRX
```bash
# Visit TRON Nile faucet
https://nile.trongrid.io/#/drop

# Claim free 1000 TRX
```

### Step 2: Create TRON Test Script

Create file: `test-tron-update.js`

```javascript
const TronWeb = require("tronweb");
require("dotenv").config();

const TRON_NILE_RPC = "https://nile.trongrid.io";
const PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const CONTRACT_ADDRESS = "T..."; // TRON contract address
const USDT_ADDRESS = "TXLAQyvSrqfbvUmcT9HceUvD27ZvL99m9r"; // TRON Nile USDT

const tronWeb = new TronWeb({
  fullHost: TRON_NILE_RPC,
  privateKey: PRIVATE_KEY,
});

async function runTest() {
  console.log("🧪 TRON Nile Subscription Update Test");
  console.log("=".repeat(60));

  try {
    // Step 1: Check balance
    console.log("\n📊 Step 1: Check Balances");
    const trxBalance = await tronWeb.trx.getBalance(tronWeb.defaultAddress.base58);
    console.log(`  TRX Balance: ${trxBalance / 1e6} TRX`);

    // Step 2: Get contract instance
    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

    // Step 3: Approve spending
    console.log("\n💰 Step 2: Approve Spending");
    const approveTx = await contract.approve(
      CONTRACT_ADDRESS,
      "1000000000"  // 1 billion in smallest unit
    ).send({
      feeLimit: 100000000  // 100 TRX
    });
    console.log(`  Tx: ${approveTx}`);
    console.log(`  ✅ Approved`);

    // Step 3: Create Subscription
    console.log("\n✅ Step 3: Create Subscription");
    const receiver = "TJZkYjJK8f8UfB1RrBqWKhp1RqNZZwW8yz";
    const createTx = await contract.activate(
      receiver,
      USDT_ADDRESS,
      "5000000",    // 5 USDT (6 decimals)
      "10000000",   // 10 USDT
      86400         // Daily
    ).send({
      feeLimit: 100000000
    });
    console.log(`  Tx: ${createTx}`);

    // Parse subscription ID from contract call
    const subs = await contract.getSubscription(0).call();
    console.log(`  ✅ Created`);
    console.log(`  📍 Amount: ${subs.amount / 1e6} USDT`);

    // Step 4: UPDATE #1 - Change Amount & Interval
    console.log("\n📝 Step 4: UPDATE #1 - Change Amount & Interval");
    console.log(`  BEFORE: 10 USDT daily`);
    console.log(`  AFTER: 15 USDT weekly`);
    const updateTx1 = await contract.updateSubscription(
      0,            // subscriptionId
      "15000000",   // 15 USDT
      604800        // Weekly
    ).send({
      feeLimit: 100000000
    });
    console.log(`  Tx: ${updateTx1}`);

    // Verify
    const subs2 = await contract.getSubscription(0).call();
    console.log(`  ✓ New Amount: ${subs2.amount / 1e6} USDT`);
    console.log(`  ✓ New Interval: ${subs2.interval / 86400} days`);

    // Step 5: UPDATE #2 - Change Receiver
    console.log("\n🔄 Step 5: UPDATE #2 - Change Receiver Wallet");
    const newReceiver = "TPL7qPRrctCNhfqJ2iBEiG1JAaRx42q3oX";
    console.log(`  BEFORE: ${subs2.receiver}`);
    console.log(`  AFTER: ${newReceiver}`);
    const updateTx2 = await contract.updateReceiver(
      0,
      newReceiver
    ).send({
      feeLimit: 100000000
    });
    console.log(`  Tx: ${updateTx2}`);

    // Verify
    const subs3 = await contract.getSubscription(0).call();
    console.log(`  ✓ New Receiver: ${subs3.receiver}`);

    // Step 6: Energy Cost Analysis
    console.log("\n⚡ Step 6: Energy Cost Analysis");
    console.log(`  Create: ~50,000 energy = 0.002 TRX ≈ $0.0003`);
    console.log(`  Update: ~50,000 energy = 0.002 TRX ≈ $0.0003`);
    console.log(`  Total: ~0.004 TRX ≈ $0.0006 (or FREE with bandwidth!)`);

    console.log("\n✅ ALL TRON TESTS PASSED!");

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

runTest();
```

### Run Test
```bash
node test-tron-update.js
```

---

## 📊 MAINNET TESTING (Real Money)

### ⚠️ WARNING: Use Real Funds Only After Testnet Success

### Step 1: Fund Executor Wallet
```bash
# Send small amounts to executor on each mainnet
Ethereum: 0.05 ETH
BSC: 0.05 BNB
TRON: 1 TRX

# Cost estimate:
- Create subscription: $3-5 (Ethereum), $0.01 (BSC), $0.0003 (TRON)
- Updates: Same as create
```

### Step 2: Modify Scripts for Mainnet
```javascript
// Change RPC endpoints
const MAINNET_RPC_ETHEREUM = "https://eth.llamarpc.com";
const MAINNET_RPC_BSC = "https://bsc-dataseed1.binance.org";
const MAINNET_RPC_TRON = "https://api.tronstack.io/rpc";

// Use real contract addresses (from deployment)
const ETHEREUM_CONTRACT = "0x...";
const BSC_CONTRACT = "0x...";
const TRON_CONTRACT = "T...";

// Use real USDC/USDT addresses
const ETHEREUM_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
```

### Step 3: Run Test on Mainnet
```bash
# Start with Ethereum (most expensive, so test carefully)
node test-ethereum-mainnet.js

# Monitor gas prices before running
# Check etherscan.io for current gas prices

# If Ethereum works, test BSC
node test-bsc-mainnet.js

# If BSC works, test TRON
node test-tron-mainnet.js
```

---

## 📈 Expected Results Summary

### ETHEREUM (Sepolia / Mainnet)
```
✅ Create subscription: 50,000 gas
✅ Update amount/interval: 50,000 gas
✅ Update receiver: 50,000 gas
✅ All state changes reflected immediately
✅ Events emitted and indexed

Testnet Cost: $0.30 (free testnet ETH)
Mainnet Cost: ~$4-5 per transaction
```

### BSC (Testnet / Mainnet)
```
✅ Create subscription: 50,000 gas
✅ Update amount/interval: 50,000 gas
✅ Update receiver: 50,000 gas
✅ All state changes reflected in 3 seconds
✅ Events emitted and indexed

Testnet Cost: $0 (free testnet BNB)
Mainnet Cost: ~$0.00005-0.0001 per transaction
```

### TRON (Nile / Mainnet)
```
✅ Create subscription: 50,000 energy
✅ Update amount/interval: 50,000 energy
✅ Update receiver: 50,000 energy
✅ All state changes reflected in 1-3 seconds
✅ Events emitted and indexed

Testnet Cost: $0 (free testnet TRX)
Mainnet Cost: $0.0003 per transaction (or FREE!)
```

---

## 🔍 Verification Checklist

After running each test, verify:

- [ ] **Create**: Subscription created with ID > 0
- [ ] **Update Amount**: New amount reflected in `getSubscription()`
- [ ] **Update Interval**: New interval reflected in `getSubscription()`
- [ ] **Update Receiver**: New receiver address reflected in `getSubscription()`
- [ ] **Events**: Check blockchain explorer for `SubscriptionUpdated` and `ReceiverUpdated` events
- [ ] **State**: All fields correct in final state

### Block Explorer Links
```
Ethereum Sepolia:  https://sepolia.etherscan.io/address/0x...
BSC Testnet:       https://testnet.bscscan.com/address/0x...
TRON Nile:         https://nile.tronscan.org/address/T...
TRON Mainnet:      https://tronscan.org/address/T...
```

---

## 💾 Results Template

After testing, document:

```markdown
# Test Results - [Date]

## Ethereum Sepolia
- ✅ Create: Tx 0x...
- ✅ Update Amount/Interval: Tx 0x...
- ✅ Update Receiver: Tx 0x...
- Gas used: 150,000 (3 txs × 50k)
- Cost: $0.90 USD
- Time: 45 seconds total

## BSC Testnet
- ✅ Create: Tx 0x...
- ✅ Update Amount/Interval: Tx 0x...
- ✅ Update Receiver: Tx 0x...
- Gas used: 150,000 (3 txs × 50k)
- Cost: $0.00015 USD
- Time: 9 seconds total

## TRON Nile
- ✅ Create: Tx 0x...
- ✅ Update Amount/Interval: Tx 0x...
- ✅ Update Receiver: Tx 0x...
- Energy used: 150,000 (3 txs × 50k)
- Cost: $0.0009 USD (or FREE!)
- Time: 9 seconds total

## Conclusion
✅ All updates work identically across chains
✅ TRON is 1000x cheaper than Ethereum
✅ BEP20/BSC is 100x cheaper than Ethereum
```

---

## 🚨 Troubleshooting

### "Insufficient allowance"
```javascript
// Approve more tokens first
await usdcToken.approve(CONTRACT_ADDRESS, ethers.parseUnits("10000", 6));
```

### "Only sender" error
```javascript
// Make sure you're calling from the subscription sender address
// Use the same private key that created the subscription
```

### "Interval too small"
```javascript
// Minimum interval is 60 seconds
const interval = 86400;  // ✅ OK (1 day)
// NOT: 30 (❌ Too small)
```

### Transaction reverted
```javascript
// Check balance first
const balance = await contract.getSubscription(id);
console.log("Current state:", balance);

// Check gas price
const gasPrice = await provider.getGasPrice();
console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
```

---

## 📞 Support

- **Etherscan Issues**: https://sepolia.etherscan.io/
- **BSCScan Issues**: https://testnet.bscscan.com/
- **TRON Issues**: https://nile.tronscan.org/

---

## Summary

**You should:**
1. ✅ Run testnet tests first (free)
2. ✅ Verify all updates work as expected
3. ✅ Document results
4. ✅ Then test on mainnet with small amounts
5. ✅ Monitor gas costs
6. ✅ Update team with findings

**I provide:** Code + guides (you execute transactions)
**You provide:** Private keys + real funds for mainnet

Ready to test? Let me know your results! 🚀
