# Quick Setup Checklist: ERC20, BEP20, TRC20

## ✅ Before Executing Subscriptions

### 1. Environment Variables (.env)
```bash
# Required for all chains
DEPLOYER_PRIVATE_KEY=0x...your_private_key_here...

# Optional: TRON-specific executor
TRON_EXECUTOR_PRIVATE_KEY=0x...tron_private_key_here...

# Optional: Override default RPC endpoints
BSC_RPC_URL=https://bsc-dataseed1.binance.org
TRON_RPC_URL=https://api.tronstack.io/rpc
```

### 2. Pre-Execution Checks

#### ERC20/BEP20 Executor
```typescript
// Verify executor has balance
✓ Executor address holds 0.05+ ETH (Ethereum) OR 0.1+ BNB (BSC)
✓ Private key format: valid 32-byte hex (0x-prefixed)
✓ Network RPC is responding (Alchemy, Infura, or Ankr)
✓ Subscription contract is deployed at the correct address
✓ Executor is not rate-limited by RPC provider
```

#### TRON Executor
```typescript
// Verify TRON setup
✓ TRON executor wallet holds 1+ TRX
✓ TRON address is valid (T-prefix, 34 characters Base58Check)
✓ Private key format: valid 32-byte hex
✓ TRON RPC is responding (TRON Grid or TronStack)
✓ Executor has sufficient energy (or can afford to rent)
✓ Subscription contract deployed on TRON Nile or Mainnet
```

---

## 🔥 Per-Execution Gas Fee Breakdown

### ERC20 (Ethereum Mainnet)
```
Base Cost: 100,000 gas × 15 gwei = 1,500,000 wei = 0.0015 ETH
At $2,500/ETH: $3.75 per execution

Network Conditions:
- Low: 8 gwei → $2.00
- Normal: 15 gwei → $3.75
- High: 50 gwei → $12.50
- Congested: 100+ gwei → $25+

💡 Optimization: Batch 10 subscriptions together, saves ~10% on gas
```

### BEP20 (Binance Smart Chain)
```
Base Cost: 100,000 gas × 4 gwei = 400,000 wei = 0.00004 BNB
At $250/BNB: $0.01 per execution

Network Conditions:
- Low: 2 gwei → $0.005
- Normal: 4 gwei → $0.01
- High: 8 gwei → $0.02
- Congested: 20+ gwei → $0.05

💡 Optimization: Execute all due subscriptions in one batch (10-50 at a time)
```

### TRC20 (TRON)
```
Base Cost: 25,000 energy + 268 bytes bandwidth
TRX Cost: 0.01 TRX ≈ $0.0008

Using TRON's Free Energy:
- Everyone gets 5,000 bandwidth per day (FREE)
- Users earn energy from staking (FREE if available)
- Cost: $0 if energy/bandwidth available

Using Energy Rental:
- Rent energy: 0.0002 TRX per 100 energy = $0.000002 per energy
- Cost with rental: 0.015 TRX ≈ $0.001 per execution

💡 Optimization: Batch executions, use executor's free bandwidth/energy
```

---

## 📊 Daily Cost Estimate (1,000 Subscriptions)

| Network | Per Execution | Daily (1000x) | Monthly (30k) | Annual (365k) |
|---------|---------------|---------------|--------------|---------------|
| **ERC20** | $3.75 | $3,750 | $112,500 | $1,368,750 |
| **BEP20** | $0.01 | $10 | $300 | $3,650 |
| **TRC20** | $0.001 | $1 | $30 | $365 |

---

## ⚙️ Executor Wallet Funding Guide

### Ethereum Executor
```bash
# Testnet (Sepolia) - Get free testnet ETH
1. Visit https://sepoliafaucet.com
2. Enter executor address: 0x...
3. Claim free 0.5 ETH
4. Confirm in wallet

# Mainnet - Fund with real ETH
1. Send 0.1+ ETH from your main wallet
2. Verify balance: ethers.provider.getBalance(executorAddress)
3. Monitor balance: keep above 0.05 ETH
```

### BSC Executor
```bash
# Testnet (BSC Testnet) - Get free test BNB
1. Visit https://testnet.binance.org/faucet-smart
2. Connect wallet and claim 0.5 BNB
3. Verify balance in MetaMask

# Mainnet - Fund with BNB
1. Send 0.1+ BNB from exchange or main wallet
2. Verify balance: ethers.provider.getBalance(executorAddress)
3. Monitor: keep above 0.05 BNB
4. Low balance alert: < 0.01 BNB
```

### TRON Executor
```bash
# Testnet (Nile) - Get free test TRX
1. Visit https://nile.trongrid.io (TRON Nile Testnet)
2. Create new wallet or import existing
3. Visit TRON Nile faucet: https://nile.trongrid.io/#/drop
4. Claim free 1,000 TRX

# Mainnet - Fund with TRX
1. Buy TRX from exchange (Binance, Kucoin, etc.)
2. Transfer to executor address (starts with T)
3. Verify balance: tronWeb.trx.getBalance(executorAddress)
4. Monitor: keep above 1 TRX
5. Energy status: Check at https://tronscan.org (#/address/T...)
```

---

## 🚨 Failure Scenarios & Recovery

### Scenario 1: Low Executor Balance
```
❌ Error: "Insufficient balance for gas"

Recovery:
1. Check balance: ethers.provider.getBalance(executorAddress)
2. If < 0.05 ETH (or equiv): Fund immediately
3. For TRON: Check energy status at tronscan.org
4. Retry execution after 30 seconds

Prevention:
- Set balance alerts at 0.02 ETH / 0.02 BNB / 0.5 TRX
- Auto-fund when below threshold (if using hot wallet)
- Maintain 2-3 weeks worth of execution costs
```

### Scenario 2: High Gas Prices (EVM Only)
```
❌ Error: "Gas price too high" or transaction rejected

Recovery:
1. Wait for network to settle (15-30 min)
2. Retry with same transaction
3. Or increase gas price limit in code

Prevention:
- Monitor base fee: ethers.provider.getFeeData()
- Don't execute during peak hours
- Use gas tracker: ethgasstation.info or gasnow.org
```

### Scenario 3: TRON Energy Shortage
```
❌ Error: "renting_energy" (from billing worker)

Recovery:
1. Burn 1-5 TRX to create temporary energy
2. Or rent energy from TRON marketplace
3. Or delegate TRX for staking rewards

Prevention:
- Pre-charge executor with 5-10 TRX
- Implement energy auto-rental at 20% threshold
- Monitor energy: getTronExecutorEnergy(address)
```

### Scenario 4: RPC Connection Failed
```
❌ Error: "Network timeout" or "RPC unavailable"

Recovery:
1. Check RPC endpoint status
2. Retry with backup RPC URL
3. Use different RPC provider

Fallback RPC URLs:
EVM:
- https://eth.llamarpc.com
- https://eth.meowrpc.com
- https://rpc.mevblocker.io

BSC:
- https://bsc-dataseed2.binance.org
- https://bsc-dataseed3.binance.org

TRON:
- https://api.tronstack.io/rpc
- https://api.trongrid.io/jsonrpc (backup)
```

---

## 📈 Monitoring Checklist

### Daily
- [ ] Check executor balances (all chains)
- [ ] Verify RPC connectivity
- [ ] Monitor subscription execution success rate
- [ ] Check for failed jobs in BullMQ queue

### Weekly
- [ ] Review gas spending trends
- [ ] Check for unusual execution delays
- [ ] Verify no leaked private keys in logs
- [ ] Update RPC endpoints if rate-limited

### Monthly
- [ ] Review cost allocation per chain
- [ ] Audit executor wallet activity
- [ ] Plan capacity for next month (if scaling)
- [ ] Update gas estimates based on network changes

---

## 🔐 Security Best Practices

### Private Key Management
```
✅ DO:
- Store in environment variables or AWS KMS
- Use separate executors per chain
- Rotate keys every 6 months
- Monitor for unauthorized access

❌ DON'T:
- Commit keys to version control
- Share keys in logs or error messages
- Reuse same key across multiple services
- Store unencrypted on public servers
```

### Wallet Monitoring
```
✅ Monitor these events:
- Incoming transactions
- Outgoing transactions > 10% of balance
- Unusual gas spending patterns
- Failed transaction attempts

Tool: https://etherscan.io or https://tronscan.org
```

---

## 📞 Support Matrix

| Issue | ERC20 | BEP20 | TRC20 |
|-------|-------|-------|-------|
| Low balance | ✅ Increase funding | ✅ Increase BNB | ✅ Add TRX |
| High fees | ✅ Wait/retry | ✅ Batch more | ✅ Use free energy |
| RPC down | ✅ Try backup URL | ✅ Try backup URL | ✅ Try backup URL |
| TX stuck | ✅ Resubmit higher | ⚠️ Rare | ⚠️ Rare |
| Energy issues | N/A | N/A | ✅ Rent/burn TRX |

---

## 📋 Deployment Verification

After deploying contracts:

```bash
# 1. Compile contracts
npm run hardhat:compile

# 2. Verify on testnet first
npx hardhat run scripts/deploy.cjs --network sepolia
npx hardhat run scripts/deploy.cjs --network bsc-testnet

# 3. Fund executor on testnet
# (Use faucets for free tokens)

# 4. Test one subscription execution
npm run test

# 5. If successful, deploy to mainnet
npx hardhat run scripts/deploy.cjs --network ethereum
npx hardhat run scripts/deploy.cjs --network bsc

# 6. Monitor first 24 hours closely
npm run dev
```

---

## Quick Reference

### Executor Private Key Format
```
Valid: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Valid: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef (no 0x)
Invalid: 0x123 (too short)
Invalid: not_a_key (not hex)
```

### Network Chain IDs
```
ERC20:
- Ethereum (1): 0x1
- Sepolia (11155111): 0xaa36a7
- Polygon (137): 0x89

BEP20:
- BSC Mainnet (56): 0x38
- BSC Testnet (97): 0x61

TRC20:
- TRON Mainnet: 0x2b6653dc
- TRON Nile: 0xcd8690dc
```

### Gas Limits per Network
```
ERC20/BEP20: 100,000-150,000 gas
TRC20: 25,000-50,000 energy
```

**Last Updated**: May 2026  
**Document Version**: 1.0
