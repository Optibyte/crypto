# Multi-Chain Token Support Summary

## 📦 What's Been Added

### Smart Contracts (4 new tokens)
```
contracts/
├── MockBEP20.sol              ✅ NEW - BEP20 for BSC
├── MockBEP20Permit.sol        ✅ NEW - BEP20 with permit for BSC
├── MockTRC20Permit.sol        ✅ NEW - TRC20 with permit for TRON
├── MockERC20.sol              ✓ EXISTING - ERC20 for all EVM chains
├── MockERC20Permit.sol        ✓ EXISTING - ERC20 with permit
└── MockTRC20.sol              ✓ EXISTING - TRC20 for TRON
```

### Documentation (3 comprehensive guides)
```
├── EXECUTOR_GAS_GUIDE.md      ✅ NEW - Deep dive on gas/energy costs
├── EXECUTOR_QUICK_SETUP.md    ✅ NEW - Quick reference checklist
└── shared/gas-optimization.ts ✅ NEW - Utility functions for cost management
```

---

## 🌐 Token Support by Chain

### ERC20 (Ethereum Ecosystem - EVM)
**Best For**: Premium services, high security requirements
```
Networks:
- Ethereum Mainnet (0x1)        [Gas: 12+ gwei]
- Sepolia Testnet (0xaa36a7)    [Gas: 1-3 gwei]
- Polygon (0x89)                [Gas: 30-100 gwei]
- Arbitrum (0xa4b1)             [Gas: 0.1-0.5 gwei]
- Optimism (0xa)                [Gas: 0.5-2 gwei]
- Base (0x2105)                 [Gas: 0.1-1 gwei]
- Avalanche (0xa86a)            [Gas: 25-50 gwei]
- Fantom (0xfa)                 [Gas: 5-10 gwei]

Cost per Execution: $3-15 (Ethereum), $0.01-0.10 (L2s)
Confirmation Time: 12+ seconds
Best Batch Size: 5-10 subscriptions
```

### BEP20 (Binance Smart Chain)
**Best For**: Cost-efficient bulk operations
```
Network:
- BSC Mainnet (0x38)            [Gas: 3-5 gwei]
- BSC Testnet (0x61)            [Gas: varies]

Cost per Execution: $0.01-0.05
Confirmation Time: 3 seconds
Best Batch Size: 50+ subscriptions

Key Feature: ~100x cheaper than Ethereum
```

### TRC20 (TRON)
**Best For**: Ultra-low cost, high throughput
```
Networks:
- TRON Mainnet (0x2b6653dc)     [Energy: 25,000 units]
- TRON Nile (0xcd8690dc)        [Energy: 25,000 units]

Cost per Execution: $0.001-0.005 (or FREE with free energy)
Confirmation Time: 1-3 seconds
Best Batch Size: 200+ subscriptions

Key Feature: ~1000x cheaper than Ethereum
              Can be FREE if executor has bandwidth/staking rewards
```

---

## 💰 Gas Fee Comparison

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│ Network         │ Per Execution│ 1,000 Daily  │ Annual (365k)│
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Ethereum        │ $5-15        │ $5k-15k      │ $1.8M-5.5M   │
│ Polygon         │ $0.10-0.50   │ $100-500     │ $36k-182k    │
│ BSC             │ $0.01-0.05   │ $10-50       │ $3.6k-18k    │
│ Arbitrum/Opt    │ $0.001-0.01  │ $1-10        │ $365-3.6k    │
│ TRON            │ $0.001-0.005 │ $1-5         │ $365-1.8k    │
│ TRON (Free*)    │ $0           │ $0           │ $0            │
└─────────────────┴──────────────┴──────────────┴──────────────┘
* If executor has available free energy/bandwidth
```

---

## ⚙️ How to Use Each Token

### 1️⃣ ERC20/BEP20 (Same Interface)
```solidity
// Deploy on Ethereum or BSC
contract Subscription {
    IERC20 token = IERC20(tokenAddress);
    
    // User approves
    token.approve(address(this), amount);
    
    // Execute transfers
    token.transferFrom(user, receiver, amount);
}
```

**Setup**:
```env
EXECUTOR_PRIVATE_KEY=0x...
```

**Deployment**:
```bash
npx hardhat run scripts/deploy.cjs --network ethereum  # ERC20
npx hardhat run scripts/deploy.cjs --network bsc       # BEP20
```

**Gas Estimate**:
```typescript
import { estimateExecutionCost } from "./shared/gas-optimization";

const cost = await estimateExecutionCost(provider, "0x1", 100_000n);
console.log(`Cost: ${cost.costUSD.toFixed(2)} USD`);
```

---

### 2️⃣ TRC20 (Energy-Based)
```solidity
// Deploy on TRON
contract Subscription {
    address token = tokenAddress;
    
    // Use TRON adapters for execution
    // Energy used instead of gas
}
```

**Setup**:
```env
TRON_EXECUTOR_PRIVATE_KEY=0x...
# OR
EXECUTOR_PRIVATE_KEY=0x...
```

**Deployment**:
```bash
node scripts/deploy-tron.cjs nile      # Testnet
node scripts/deploy-tron.cjs mainnet   # Mainnet
```

**Energy Estimate**:
```typescript
import { TronEnergy } from "./shared/gas-optimization";

const transferCost = TronEnergy.getTransferCost();  // 25,000 energy
const trxNeeded = TronEnergy.estimateTrxCostForEnergy(transferCost);
console.log(`TRON cost: ${trxNeeded} TRX`);
```

---

## 🚀 Executor Setup Checklist

### Before Running Production

#### ✅ Environment Variables
```bash
# Required
DEPLOYER_PRIVATE_KEY=0x...your_key...

# Optional but recommended
TRON_EXECUTOR_PRIVATE_KEY=0x...tron_specific...
BSC_RPC_URL=https://bsc-dataseed1.binance.org
```

#### ✅ Fund Executors
| Network | Min Balance | Testnet Faucet |
|---------|------------|-----------------|
| Ethereum | 0.1 ETH | N/A (pay gas) |
| Sepolia | 0.05 ETH | https://sepoliafaucet.com |
| BSC | 0.1 BNB | https://testnet.binance.org/faucet-smart |
| TRON | 1 TRX | https://nile.trongrid.io/#/drop |

#### ✅ Deploy Contracts
```bash
# Compile all
npm run hardhat:compile

# Test networks
npx hardhat run scripts/deploy.cjs --network sepolia
npx hardhat run scripts/deploy.cjs --network bsc-testnet
node scripts/deploy-tron.cjs nile

# If tests pass, deploy to mainnet
npx hardhat run scripts/deploy.cjs --network ethereum
npx hardhat run scripts/deploy.cjs --network bsc
node scripts/deploy-tron.cjs mainnet
```

#### ✅ Start Billing Worker
```bash
npm run dev
# Billing worker monitors queue and executes subscriptions
```

#### ✅ Monitor Costs
```typescript
// Use utility functions
import { checkExecutorHealth, AlertThresholds } from "./shared/gas-optimization";

const health = await checkExecutorHealth(provider, executorAddress, "0x1");
if (health.daysOfRunway < AlertThresholds.CriticalRunway) {
  console.warn("⚠️ Executor running low on funds!");
  // Auto-fund or alert operator
}
```

---

## 📊 Cost Optimization Strategies

### Strategy 1: Chain Selection
```
High Volume (1000+/day):   → Use TRON (cheapest)
Medium Volume (100-500/day): → Use BSC
Low Volume (< 100/day):      → Use Ethereum (premium)
```

### Strategy 2: Batch Execution
```typescript
// Instead of executing subscriptions one-by-one:
// Execute 10-50 at once → saves ~10-20% on gas

const optimalBatchSize = {
  "0x1": 5,        // Ethereum
  "0x38": 50,      // BSC
  "0x2b6653dc": 200, // TRON
};
```

### Strategy 3: Timing
```
EVM: Execute during low-congestion hours (e.g., 2-6 AM UTC)
TRON: Can execute anytime (consistent costs, 1-3 sec confirmation)
```

### Strategy 4: Executor Capacity
```
Maintain minimum balance:
- Ethereum: 0.05 ETH (2-3 days runway)
- BSC: 0.05 BNB (weeks of runway)
- TRON: 5 TRX (hundreds of executions)

Alert if balance < 3 days of expected spend
```

---

## 🔍 Monitoring & Debugging

### Check Executor Health
```bash
node -e "
  const { checkExecutorHealth } = require('./shared/gas-optimization');
  checkExecutorHealth(provider, '0x...', '0x1').then(h => console.log(h));
"
```

### View Execution Logs
```bash
# BullMQ job queue
npm run dev
# Watch terminal for job statuses

# Database logs
SELECT * FROM scheduler_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Insufficient balance" | Executor out of funds | Add ETH/BNB/TRX to wallet |
| "Gas price too high" | Network congestion | Retry in 30 min (EVM only) |
| "renting_energy" | TRON executor low energy | Burn TRX or add more balance |
| "RPC timeout" | Network unreachable | Check RPC URL, try backup |
| "Invalid signature" | Wrong private key | Verify key format |

---

## 📈 Scaling Recommendations

### Phase 1: Low Volume (< 100/day)
- Use Sepolia testnet for development
- Single executor per chain
- Basic monitoring

### Phase 2: Medium Volume (100-1000/day)
- Move to BSC for cost efficiency
- Multiple executors per chain
- Auto-funding mechanism
- Daily cost tracking

### Phase 3: High Volume (1000+/day)
- Primary: TRON (cheapest, fastest)
- Secondary: BSC (cost-effective backup)
- Tertiary: Ethereum (premium users only)
- Dynamic routing based on user tier
- Real-time monitoring dashboard

---

## 🔐 Security Notes

### Private Key Security
```
✅ Store in:
   - Environment variables (development)
   - AWS KMS (production)
   - HashiCorp Vault (enterprise)

❌ Never:
   - Commit to git
   - Log to console
   - Share in error messages
   - Reuse across services
```

### Executor Wallet Security
```
✅ Use:
   - Separate wallets per chain
   - Limited balance (only needed for gas)
   - Monitor all transactions
   - Rotate keys every 6 months

❌ Don't:
   - Reuse exchange account
   - Keep large balances
   - Share access credentials
```

---

## 📚 File Structure

```
contracts/
├── MockERC20.sol              # ERC20 token
├── MockERC20Permit.sol        # ERC20 with EIP-2612 permit
├── MockBEP20.sol              # BEP20 token (BSC)
├── MockBEP20Permit.sol        # BEP20 with permit (BSC)
├── MockTRC20.sol              # TRC20 token (TRON)
├── MockTRC20Permit.sol        # TRC20 with permit (TRON)
├── CryptoPaySubscription.sol   # Main subscription contract
└── TronPaySubscription.sol     # TRON-specific subscription contract

server/
├── workers-billing.ts         # Handles subscription execution
├── chain-adapter.ts           # Abstract adapter for chains
├── chain-adapter-evm.ts       # EVM-specific implementation
├── chain-adapter-tron.ts      # TRON-specific implementation
└── ...

shared/
├── chain.ts                   # Chain type definitions
├── contracts.ts               # Contract ABIs
├── tron-contracts.ts          # TRON-specific configs
├── gas-optimization.ts        # ✨ NEW - Gas fee utilities
└── token-registry.ts          # Token metadata

docs/
├── EXECUTOR_GAS_GUIDE.md      # ✨ NEW - Comprehensive guide
├── EXECUTOR_QUICK_SETUP.md    # ✨ NEW - Quick reference
└── DOCUMENTATION.md           # Original documentation
```

---

## 🎯 Quick Reference

### Deploy Token Contract
```bash
npm run hardhat:compile
npx hardhat run scripts/deploy.cjs --network [ethereum|bsc|sepolia|...]
node scripts/deploy-tron.cjs [mainnet|nile]
```

### Start Execution Service
```bash
npm run dev
# Watches subscription queue and executes billing
```

### Test Execution
```bash
npm test
npm run hardhat:test
```

### Monitor Costs
```bash
# Check executor balance
ethers.provider.getBalance('0x...')

# Check TRON executor energy
tronWeb.trx.getAccountResources('T...')
```

### Fund Executor Wallets
```
Ethereum: Send ETH to 0x... address
BSC: Send BNB to 0x... address
TRON: Send TRX to T... address
```

---

## 📞 Support

For detailed information, see:
- **Setup Guide**: [EXECUTOR_QUICK_SETUP.md](EXECUTOR_QUICK_SETUP.md)
- **Cost Guide**: [EXECUTOR_GAS_GUIDE.md](EXECUTOR_GAS_GUIDE.md)
- **Code Utilities**: [shared/gas-optimization.ts](shared/gas-optimization.ts)
- **Original Docs**: [DOCUMENTATION.md](DOCUMENTATION.md)

---

**Last Updated**: May 2026  
**Version**: 1.0
