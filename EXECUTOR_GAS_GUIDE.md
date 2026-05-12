# Multi-Chain Token & Gas Fee Management Guide

## Overview
This guide covers prerequisites and gas fee optimization strategies for executing subscriptions across ERC20 (Ethereum/EVM), BEP20 (Binance Smart Chain), and TRC20 (TRON) networks.

---

## 1. ERC20 (Ethereum & EVM Chains)

### Prerequisites

#### Executor Requirements
- **Private Key**: Standard 32-byte hex key (0x-prefixed or raw)
- **Wallet Balance**: Minimum balance in chain's native token (ETH, MATIC, AVAX, etc.)
- **Environment Variable**: `EXECUTOR_PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY`

#### Network Requirements
```typescript
// Supported EVM Networks (from chain.ts)
- Ethereum Mainnet (0x1) - 12 gwei avg gas
- Sepolia Testnet (0xaa36a7) - 1-3 gwei avg gas
- Polygon Mainnet (0x89) - 30-100 gwei avg gas
- BSC Mainnet (0x38) - 3-5 gwei avg gas
- Avalanche C-Chain (0xa86a) - 25-50 gwei avg gas
- Arbitrum One (0xa4b1) - 0.1-0.5 gwei avg gas
- Optimism (0xa) - 0.5-2 gwei avg gas
- Base (0x2105) - 0.1-1 gwei avg gas
```

#### Token Requirements
- **Approval**: Users must approve the subscription contract to transfer tokens
- **Balance**: Users must hold sufficient token balance for subscription amount
- **Decimals**: Token decimals properly configured in smart contract

### Gas Fee Optimization

#### 1. **Dynamic Gas Price Strategy**
```solidity
// Current approach: Single gas price estimation
const gasPrice = await ethers.provider.getGasPrice();

// Better approach: Implement tiered gas pricing
async function calculateOptimalGasPrice(network: string) {
  const currentGas = await provider.getGasPrice();
  const gasLimit = 100_000; // Typical subscription execution
  
  switch(network) {
    case "0x1": // Ethereum mainnet - high cost
      return currentGas.mul(120).div(100); // 20% premium
    case "0x38": // BSC - low cost
      return currentGas; // No premium needed
    case "0x89": // Polygon - medium cost
      return currentGas.mul(110).div(100); // 10% premium
    default:
      return currentGas;
  }
}
```

#### 2. **Batch Execution**
```typescript
// Process multiple subscriptions in single transaction
// Reduces per-subscription overhead

async function batchExecuteSubscriptions(
  subscriptionIds: number[],
  contractAddress: string,
  executorKey: string
): Promise<string> {
  const adapter = await getChainAdapter("evm", networkId);
  
  // Combine multiple subscription executions
  const totalGasUsed = subscriptionIds.length * 100_000; // ~100k gas each
  const gasPrice = await calculateOptimalGasPrice(networkId);
  
  // Execute all at once
  return adapter.executeBatchSubscriptions(
    contractAddress,
    subscriptionIds,
    executorKey,
    gasPrice
  );
}
```

#### 3. **Minimum Balance Threshold**
```typescript
// Maintain minimum balance to ensure execution success
async function hasMinimumExecutorBalance(executorKey: string): Promise<boolean> {
  const wallet = new Wallet(executorKey, provider);
  const balance = await provider.getBalance(wallet.address);
  
  // Different thresholds per chain
  const minimumBalances: Record<string, BigInt> = {
    "0x1": parseEther("0.1"),      // 0.1 ETH
    "0x38": parseEther("0.1"),      // 0.1 BNB
    "0x89": parseEther("50"),       // 50 MATIC
    "0xa86a": parseEther("1"),      // 1 AVAX
    "0xa4b1": parseEther("0.01"),   // 0.01 ETH (Arbitrum)
    "0xa": parseEther("0.01"),      // 0.01 ETH (Optimism)
    "0x2105": parseEther("0.01"),   // 0.01 ETH (Base)
  };
  
  return balance >= (minimumBalances[networkId] ?? parseEther("0.05"));
}
```

#### 4. **Gas Estimation Pre-flight Check**
```typescript
async function validateTransactionCost(
  contract: Contract,
  subscriptionId: number,
  executorKey: string,
  networkId: string
): Promise<{ gasLimit: BigInt; gasCost: BigInt; willSucceed: boolean }> {
  try {
    // Estimate gas required
    const gasEstimate = await contract.executeSubscription.estimateGas(subscriptionId);
    
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    
    // Calculate total cost
    const gasCost = gasEstimate * gasPrice;
    
    // Check executor balance
    const wallet = new Wallet(executorKey, provider);
    const balance = await provider.getBalance(wallet.address);
    
    return {
      gasLimit: gasEstimate,
      gasCost: gasCost,
      willSucceed: balance > gasCost
    };
  } catch (err) {
    console.error("Gas estimation failed:", err);
    return { gasLimit: 0n, gasCost: 0n, willSucceed: false };
  }
}
```

---

## 2. BEP20 (Binance Smart Chain)

### Prerequisites

#### Executor Requirements
- **Private Key**: Standard EVM-compatible key (same as ERC20)
- **Wallet Balance**: Minimum BNB balance for gas (typically 0.01-0.1 BNB)
- **Environment Variable**: `EXECUTOR_PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY`

#### Network Configuration
```typescript
// Hardhat configuration
networks: {
  bsc: {
    url: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
    chainId: 56,
    accounts: [EXECUTOR_PRIVATE_KEY]
  }
}

// Deployment chainId mapping
chainId: 56 → hex: 0x38
```

#### Token Requirements
- **BEP20 Standard**: Exactly like ERC20 (same interface)
- **Approval**: Users must approve token transfer
- **Gas Units**: ~100,000-120,000 per subscription execution

### Gas Fee Optimization

#### 1. **Ultra-Low Gas Tier**
```typescript
// BSC has the lowest gas costs among EVM chains
const BSC_GAS_OPTIMIZATION = {
  avgGasPrice: "3-5 gwei",
  typicalGasUsed: "100,000 units",
  costPerExecution: "$0.03-0.06 USD",
  recommendation: "Batch multiple subscriptions"
};

async function optimizeBSCExecution(
  subscriptionIds: number[],
  contractAddress: string,
  executorKey: string
): Promise<string> {
  // Can afford to execute ALL due subscriptions at once
  const batchSize = 10; // Execute 10 subscriptions per batch
  const totalCost = batchSize * 100_000 * 3e-9 * 250; // BNB to USD (assuming BNB = $250)
  
  console.log(`Executing ${batchSize} subscriptions: ~$${totalCost.toFixed(2)} USD`);
  return executeAll(subscriptionIds, contractAddress, executorKey);
}
```

#### 2. **Mempool Strategy**
```typescript
// BSC mempool is less congested than Ethereum
async function submitBSCTransaction(
  tx: any,
  executorKey: string
): Promise<string> {
  const wallet = new Wallet(executorKey, bscProvider);
  
  // Can use lower gas price (mempool is predictable)
  const gasPrice = await bscProvider.getGasPrice();
  
  // BSC typically processes in 1-3 seconds
  const txResponse = await wallet.sendTransaction({
    ...tx,
    gasPrice: gasPrice, // Standard price is fine
    gasLimit: 150_000
  });
  
  // Fast confirmation
  const receipt = await txResponse.wait(1);
  return receipt?.transactionHash || txResponse.hash;
}
```

#### 3. **Cost Tracking per Execution**
```typescript
// Track cumulative costs for billing
interface ExecutionCost {
  subscriptionId: number;
  gasPaid: BigInt;
  gasPrice: BigInt;
  txHash: string;
  costUSD: number;
}

async function trackBSCCosts(executions: ExecutionCost[]): Promise<void> {
  const bnbPrice = await fetchBNBPrice(); // Get current BNB/USD rate
  
  const totalCostBNB = executions.reduce((sum, exec) => {
    return sum + parseFloat(formatEther(exec.gasPaid));
  }, 0);
  
  const totalCostUSD = totalCostBNB * bnbPrice;
  
  console.log(`Total execution cost: ${totalCostBNB} BNB = $${totalCostUSD.toFixed(2)} USD`);
  await storage.recordBillingCosts("bsc", totalCostUSD);
}
```

---

## 3. TRC20 (TRON)

### Prerequisites

#### Executor Requirements
- **Private Key**: TRON-specific private key (standard 32-byte hex)
- **Wallet Address**: TRON address format (T-prefix, Base58Check encoded)
- **TRX Balance**: Minimum 1-5 TRX for energy + bandwidth
- **Environment Variables**:
  ```typescript
  TRON_EXECUTOR_PRIVATE_KEY // Primary TRON executor
  EXECUTOR_PRIVATE_KEY       // Fallback executor
  ```

#### Network Configuration
```typescript
// TRON chain IDs
TRON Mainnet: 0x2b6653dc (728126428)
TRON Nile Testnet: 0xcd8690dc (3448148188)

// RPC URLs
Mainnet: https://api.tronstack.io/rpc
Nile Testnet: https://nile.trongrid.io
```

#### Token Requirements
- **TRC20 Standard**: Mirrors ERC20 interface but TRON-specific
- **Approval**: Users must approve token transfer to contract
- **Decimals**: Typically 6 (USD stablecoins on TRON)
- **Popular TRC20 tokens**:
  ```
  USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t (mainnet)
  USDC: TEkxiTeP4f1ZrMxyvHC3qSZBfY9reN1zXY (less common)
  USDD: TYq8dEjN2chEJzxeMxe7TGJwLtVFCnzEYR (TRON stablecoin)
  ```

### Gas Fee Optimization (Energy & Bandwidth)

#### 1. **Energy System (Unlike EVM)**
```typescript
// TRON doesn't use "gas" like EVM
// Instead uses: Energy (for execution) + Bandwidth (for transaction size)

interface TRONCost {
  energy: number;           // Energy units consumed
  energyCost: number;       // TRX equivalent
  bandwidth: number;        // Bytes transmitted
  bandwidthCost: number;    // TRX equivalent
  total: number;            // Total TRX cost
}

// Typical TRC20 execution costs:
const TRC20_EXECUTION_COSTS = {
  transferFrom: {
    energy: 25_000,        // 25,000 energy units
    bandwidth: 268,        // 268 bytes
    estimatedTRXCost: 0.01 // ~0.01 TRX
  },
  approveAndTransfer: {
    energy: 50_000,        // 50,000 energy units
    bandwidth: 380,        // 380 bytes
    estimatedTRXCost: 0.02 // ~0.02 TRX
  }
};

async function estimateTRONExecutionCost(
  methodName: "transferFrom" | "approveAndTransfer"
): Promise<TRONCost> {
  const costs = TRC20_EXECUTION_COSTS[methodName];
  
  // Check if executor has sufficient energy
  // If not, will need to rent or purchase
  const executorEnergy = await getTRONExecutorEnergy(executorAddress);
  
  if (executorEnergy < costs.energy) {
    // Need to rent energy from TRON
    const energyToRent = costs.energy - executorEnergy;
    const rentalCost = energyToRent * 0.0002; // ~0.0002 TRX per energy
    
    return {
      energy: costs.energy,
      energyCost: costs.energy * 0.00001,
      bandwidth: costs.bandwidth,
      bandwidthCost: costs.bandwidth * 0.001,
      total: costs.estimatedTRXCost + rentalCost
    };
  }
  
  return {
    energy: costs.energy,
    energyCost: costs.energy * 0.00001,
    bandwidth: costs.bandwidth,
    bandwidthCost: costs.bandwidth * 0.001,
    total: costs.estimatedTRXCost
  };
}
```

#### 2. **Energy Optimization Strategies**
```typescript
async function optimizeTRONExecution(
  subscriptionId: number,
  executorKey: string,
  executorAddress: string
): Promise<{
  method: "free" | "burn_energy" | "rent_energy";
  estimatedCost: number;
}> {
  const executorEnergy = await getTRONExecutorEnergy(executorAddress);
  const totalBandwidth = await getTRONExecutorBandwidth(executorAddress);
  
  // Strategy 1: Use free energy if available
  if (executorEnergy > 50_000) {
    return {
      method: "free",
      estimatedCost: 0 // Free energy exists
    };
  }
  
  // Strategy 2: Burn TRX to create temporary energy
  // 1 TRX burned = ~25,000 energy (valid for 24 hours)
  if (await getTRONBalance(executorAddress) > 1) {
    return {
      method: "burn_energy",
      estimatedCost: 0.001 // Minimal cost, still cheaper than renting
    };
  }
  
  // Strategy 3: Rent energy from TRON's energy marketplace
  return {
    method: "rent_energy",
    estimatedCost: 0.02 // About 0.02 TRX per subscription
  };
}
```

#### 3. **TRON-Specific Implementation**
```typescript
// From: workers-billing.ts (current implementation)
const result = await adapter.executeSubscription(
  contractAddress,
  sub.onChainSubscriptionId,
  executorKey
);

// The result includes:
if (result.txHash === "renting_energy") {
  // Special case: TRON system detected need for energy rental
  // Action: Automatically rent energy or fail gracefully
  await storage.updateExecutionLog(cycleId, "failed");
  
  // Alert: Need to fund executor with TRX
  console.warn(`[TRON] Executor ${executorAddress} needs TRX for energy`);
  
  // Solution: Add TRX to executor wallet
  // Typical recharge: 10 TRX = ~250,000 energy = ~250+ executions
}
```

#### 4. **Energy Reserve Management**
```typescript
async function maintainTRONEnergyReserve(executorAddress: string): Promise<void> {
  const currentEnergy = await getTRONExecutorEnergy(executorAddress);
  const minimumEnergyReserve = 100_000; // ~4 subscriptions worth
  
  if (currentEnergy < minimumEnergyReserve) {
    // Auto-recharge: Burn TRX to create energy
    const energyShortfall = minimumEnergyReserve - currentEnergy;
    const trxNeeded = Math.ceil(energyShortfall / 25_000); // ~1 TRX per 25k energy
    
    console.log(`[TRON] Burning ${trxNeeded} TRX to create ${energyShortfall} energy`);
    
    await burnTRXForEnergy(executorAddress, trxNeeded);
    
    // Verify
    const newEnergy = await getTRONExecutorEnergy(executorAddress);
    console.log(`[TRON] Energy reserve: ${newEnergy} (restored)`);
  }
}
```

---

## 4. Executor Configuration Checklist

### Environment Variables Setup
```bash
# EVM/BEP20 Shared
EXECUTOR_PRIVATE_KEY=0x...          # Standard hex private key
DEPLOYER_PRIVATE_KEY=0x...          # Fallback option

# TRON-specific
TRON_EXECUTOR_PRIVATE_KEY=0x...     # TRON private key (if different)

# RPC URLs (optional - uses defaults if not set)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
POLYGON_RPC_URL=https://polygon.llamarpc.com
TRON_RPC_URL=https://api.tronstack.io/rpc
TRON_NILE_RPC_URL=https://nile.trongrid.io
```

### Pre-Execution Validation
```typescript
async function validateExecutorSetup(
  chainType: "evm" | "tron",
  networkId: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  const executorKey = chainType === "tron"
    ? process.env.TRON_EXECUTOR_PRIVATE_KEY
    : process.env.EXECUTOR_PRIVATE_KEY;
  
  if (!executorKey) {
    issues.push(`Missing private key for ${chainType}`);
    return { valid: false, issues };
  }
  
  try {
    const wallet = chainType === "tron"
      ? new TronWeb().fromPrivateKey(executorKey)
      : new Wallet(executorKey);
    
    // Check balance
    const balance = await getBalance(wallet.address, chainType, networkId);
    const minimumBalance = chainType === "tron" ? 1 : 0.05; // TRX vs ETH
    
    if (balance < minimumBalance) {
      issues.push(`Insufficient balance: ${balance} (need ${minimumBalance})`);
    }
    
    // Check contract address
    const contract = chainType === "tron"
      ? getTronContractForNetwork(networkId)
      : getContractForNetwork(networkId);
    
    if (!contract) {
      issues.push(`No contract configured for network ${networkId}`);
    }
    
  } catch (err) {
    issues.push(`Invalid private key: ${err.message}`);
  }
  
  return { valid: issues.length === 0, issues };
}
```

---

## 5. Cost Comparison Table

| Metric | ERC20 (Ethereum) | BEP20 (BSC) | TRC20 (TRON) |
|--------|-----------------|-----------|------------|
| **Gas/Energy** | 12+ gwei | 3-5 gwei | 0.01 TRX (~0.001 USD) |
| **Avg Cost/Execution** | $5-15 | $0.03-0.10 | $0.001-0.005 |
| **Daily Cost (1000 executions)** | $5,000-15,000 | $30-100 | $1-5 |
| **Min Balance** | 0.1+ ETH | 0.1+ BNB | 1+ TRX |
| **Confirmation Time** | 12+ seconds | 3 seconds | 1-3 seconds |
| **Congestion Risk** | HIGH | LOW | LOW |
| **Best For** | Premium services | High volume | Ultra-low cost |

---

## 6. Implementation Best Practices

### 1. **Executor Key Management**
- ✅ Store keys in environment variables or AWS KMS
- ✅ Use separate executor wallets per chain
- ✅ Rotate keys periodically
- ✅ Monitor unauthorized access attempts

### 2. **Gas Price Management**
```typescript
// DO: Implement dynamic gas pricing
const gasPrice = await provider.getGasPrice();
const adjustedPrice = gasPrice.mul(chainFactor); // 1.1 for high-traffic hours

// DON'T: Use fixed gas prices
const fixedPrice = parseUnits("50", "gwei"); // Will fail if network is congested
```

### 3. **Failure Handling**
```typescript
async function executeWithFallback(
  subscriptionId: number,
  contractAddress: string,
  executorKey: string,
  chainType: "evm" | "tron",
  networkId: string
): Promise<string> {
  try {
    // Primary execution
    return await primaryAdapter.executeSubscription(
      contractAddress,
      subscriptionId,
      executorKey
    );
  } catch (err) {
    if (err.message.includes("insufficient balance")) {
      // Action: Alert operator to fund executor wallet
      await alertOperator("Executor wallet depleted", { chainType, networkId });
      throw err;
    }
    
    if (err.message.includes("gas")) {
      // Action: Retry with higher gas or different time
      await schedule.retryLater(subscriptionId, 5 * 60 * 1000);
      return "retrying";
    }
    
    throw err;
  }
}
```

### 4. **Monitoring & Alerting**
```typescript
// Track metrics per chain
const metrics = {
  erc20: {
    successRate: 98.5,
    avgGasPaid: "0.02 ETH",
    totalCost: "$15,420",
    failureReasons: ["low_balance", "gas_price_spike"]
  },
  bep20: {
    successRate: 99.8,
    avgGasPaid: "0.000003 BNB",
    totalCost: "$12.50",
    failureReasons: []
  },
  trc20: {
    successRate: 99.9,
    avgEnergyUsed: "25000",
    totalCost: "$2.30",
    failureReasons: ["energy_shortage"]
  }
};
```

---

## 7. Deployment Instructions

### Compile All Contracts
```bash
npm run hardhat:compile
```

### Deploy to Specific Chain
```bash
# ERC20 Ethereum
npx hardhat run scripts/deploy.cjs --network ethereum

# BEP20 BSC
npx hardhat run scripts/deploy.cjs --network bsc

# TRC20 TRON
node scripts/deploy-tron.cjs mainnet

# Testnets
npx hardhat run scripts/deploy.cjs --network sepolia
node scripts/deploy-tron.cjs nile
```

### Verify Executor Setup
```bash
# Check all executor wallets
node scripts/verify-executor-setup.js

# Output:
# ✅ EVM Executor: 0x... (Balance: 0.25 ETH)
# ✅ BSC Executor: 0x... (Balance: 1.5 BNB)
# ⚠️  TRON Executor: T... (Balance: 2 TRX - LOW)
```

---

## Summary

- **ERC20**: Higher costs but essential for Ethereum mainnet
- **BEP20**: Best cost-efficiency for EVM chains (~100x cheaper than Ethereum)
- **TRC20**: Lowest costs globally (~1000x cheaper than Ethereum)

**Optimal Strategy**: Use TRON for high-frequency subscriptions, BEP20 for cost-effective scaling, ERC20 for premium/institutional services.
