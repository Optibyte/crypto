/**
 * Gas Fee Optimization Utilities
 * Helpers for managing execution costs across ERC20, BEP20, and TRC20
 */

import type { ChainType } from "./chain";
import { parseEther, parseUnits, Wallet, Contract } from "ethers";

export interface GasCostEstimate {
  chainType: ChainType;
  networkId: string;
  gasLimit: bigint;
  gasPrice: bigint;
  totalCost: bigint;
  currencySymbol: string;
  costUSD: number;
}

export interface ExecutorMetrics {
  address: string;
  chainType: ChainType;
  balance: bigint;
  minimumBalance: bigint;
  isHealthy: boolean;
  daysOfRunway: number;
  lastFunded: Date;
}

/**
 * Get minimum required balance per chain
 */
export function getMinimumExecutorBalance(networkId: string): bigint {
  const minimumBalances: Record<string, bigint> = {
    // Ethereum
    "0x1": parseEther("0.1"),
    "0xaa36a7": parseEther("0.05"), // Sepolia testnet
    
    // Polygon
    "0x89": parseEther("50"),
    
    // BSC
    "0x38": parseEther("0.1"),
    "0x61": parseEther("0.05"), // BSC testnet
    
    // Avalanche
    "0xa86a": parseEther("1"),
    
    // Arbitrum
    "0xa4b1": parseEther("0.01"),
    
    // Optimism
    "0xa": parseEther("0.01"),
    
    // Base
    "0x2105": parseEther("0.01"),
    
    // Fantom
    "0xfa": parseEther("1"),
    
    // TRON
    "0x2b6653dc": parseEther("1"), // TRX (1 TRX in wei)
    "0xcd8690dc": parseEther("1"), // TRON Nile testnet
  };
  
  return minimumBalances[networkId] ?? parseEther("0.05");
}

/**
 * Get optimal gas price based on network conditions
 */
export async function getOptimalGasPrice(
  provider: any,
  networkId: string,
  multiplier: number = 1.0
): Promise<bigint> {
  const basePrice = await provider.getGasPrice();
  
  // Apply network-specific multipliers
  const multipliers: Record<string, number> = {
    "0x1": 1.2,      // Ethereum: 20% premium during normal hours
    "0xaa36a7": 1.0, // Sepolia: no premium needed
    "0x89": 1.1,     // Polygon: 10% premium
    "0x38": 1.0,     // BSC: no premium (low congestion)
    "0x61": 1.0,     // BSC Testnet: no premium
    "0xa86a": 1.05,  // Avalanche: 5% premium
    "0xa4b1": 1.0,   // Arbitrum: no premium
    "0xa": 1.0,      // Optimism: no premium
    "0x2105": 1.0,   // Base: no premium
    "0xfa": 1.05,    // Fantom: 5% premium
  };
  
  const networkMultiplier = multipliers[networkId] ?? 1.0;
  const finalMultiplier = networkMultiplier * multiplier;
  
  return (basePrice * BigInt(Math.floor(finalMultiplier * 100))) / 100n;
}

/**
 * Estimate execution cost in native currency + USD
 */
export async function estimateExecutionCost(
  provider: any,
  networkId: string,
  gasEstimate: bigint = 100_000n,
  nativeTokenPrice: number = 1
): Promise<GasCostEstimate> {
  const gasPrice = await getOptimalGasPrice(provider, networkId);
  const totalCost = gasEstimate * gasPrice;
  
  const nativeCostInEther = parseFloat(totalCost.toString()) / 1e18;
  const costUSD = nativeCostInEther * nativeTokenPrice;
  
  const currencySymbols: Record<string, string> = {
    "0x1": "ETH",
    "0xaa36a7": "ETH",
    "0x89": "MATIC",
    "0x38": "BNB",
    "0x61": "BNB",
    "0xa86a": "AVAX",
    "0xa4b1": "ETH",
    "0xa": "ETH",
    "0x2105": "ETH",
    "0xfa": "FTM",
    "0x2b6653dc": "TRX",
    "0xcd8690dc": "TRX",
  };
  
  return {
    chainType: ["0x2b6653dc", "0xcd8690dc"].includes(networkId) ? "tron" : "evm",
    networkId,
    gasLimit: gasEstimate,
    gasPrice,
    totalCost,
    currencySymbol: currencySymbols[networkId] ?? "ETH",
    costUSD,
  };
}

/**
 * Validate executor has sufficient balance and can execute
 */
export async function validateExecutorBalance(
  provider: any,
  executorAddress: string,
  networkId: string,
  minBalance?: bigint
): Promise<{ isValid: boolean; balance: bigint; message: string }> {
  try {
    const balance = await provider.getBalance(executorAddress);
    const minimum = minBalance ?? getMinimumExecutorBalance(networkId);
    
    if (balance < minimum) {
      return {
        isValid: false,
        balance,
        message: `Insufficient balance: ${balance.toString()} < ${minimum.toString()}`,
      };
    }
    
    return {
      isValid: true,
      balance,
      message: "Balance check passed",
    };
  } catch (err) {
    return {
      isValid: false,
      balance: 0n,
      message: `Error checking balance: ${(err as any).message}`,
    };
  }
}

/**
 * Calculate days of runway (how long executor can operate)
 */
export function calculateRunway(
  currentBalance: bigint,
  dailySpend: bigint
): number {
  if (dailySpend === 0n) return Infinity;
  return Number(currentBalance / dailySpend);
}

/**
 * Format cost for display
 */
export function formatCost(
  amount: bigint,
  decimals: number = 18,
  currency: string = "ETH"
): string {
  const humanReadable = parseFloat(amount.toString()) / Math.pow(10, decimals);
  return `${humanReadable.toFixed(6)} ${currency}`;
}

/**
 * Batch execution cost calculator
 */
export function calculateBatchCost(
  costPerExecution: bigint,
  batchSize: number,
  savingsPercent: number = 10
): {
  totalCost: bigint;
  perExecutionCost: bigint;
  savings: bigint;
} {
  const totalCost = costPerExecution * BigInt(batchSize);
  const savingsAmount = (totalCost * BigInt(savingsPercent)) / 100n;
  
  return {
    totalCost: totalCost - savingsAmount,
    perExecutionCost: (totalCost - savingsAmount) / BigInt(batchSize),
    savings: savingsAmount,
  };
}

/**
 * TRON-specific energy calculator
 */
export const TronEnergy = {
  /**
   * Energy cost to execute a TRC20 transfer
   */
  getTransferCost(): number {
    return 25_000; // 25k energy units
  },
  
  /**
   * Energy cost to execute approve + transfer
   */
  getApproveTransferCost(): number {
    return 50_000; // 50k energy units
  },
  
  /**
   * Estimate TRX cost for energy (if no free energy available)
   * Assumes 1 TRX = 25,000 energy
   */
  estimateTrxCostForEnergy(energyNeeded: number): bigint {
    const trxBurned = Math.ceil(energyNeeded / 25_000);
    return parseUnits(trxBurned.toString(), 6); // TRX has 6 decimals
  },
  
  /**
   * Check if executor has sufficient free bandwidth
   * Each address gets 5,000 bandwidth per day
   */
  hasFreeBandwidth(bandwidthUsed: number): boolean {
    const dailyFreeAllowance = 5_000;
    return bandwidthUsed < dailyFreeAllowance;
  },
  
  /**
   * Typical TRC20 transaction size in bytes
   */
  getTransactionSize(): number {
    return 268; // bytes
  },
  
  /**
   * Bandwidth cost (1 byte ≈ 0.001 TRX)
   */
  estimateBandwidthCost(bytes: number = 268): bigint {
    return parseUnits((bytes * 0.001).toString(), 6); // TRX cost
  },
};

/**
 * Generate cost report for operator
 */
export function generateCostReport(
  executions: Array<{
    chainType: ChainType;
    cost: bigint;
    timestamp: Date;
  }>
): string {
  const byChain = executions.reduce(
    (acc, ex) => {
      if (!acc[ex.chainType]) {
        acc[ex.chainType] = { count: 0, totalCost: 0n };
      }
      acc[ex.chainType].count += 1;
      acc[ex.chainType].totalCost += ex.cost;
      return acc;
    },
    {} as Record<string, { count: number; totalCost: bigint }>
  );
  
  let report = "=== EXECUTION COST REPORT ===\n\n";
  
  for (const [chain, data] of Object.entries(byChain)) {
    const avgCost = data.totalCost / BigInt(data.count);
    report += `${chain.toUpperCase()}:\n`;
    report += `  Executions: ${data.count}\n`;
    report += `  Total Cost: ${formatCost(data.totalCost)}\n`;
    report += `  Avg Cost: ${formatCost(avgCost)}\n\n`;
  }
  
  const totalCost = executions.reduce((sum, ex) => sum + ex.cost, 0n);
  report += `TOTAL: ${formatCost(totalCost)}\n`;
  
  return report;
}

/**
 * Executor health check
 */
export async function checkExecutorHealth(
  provider: any,
  executorAddress: string,
  networkId: string,
  expectedDailySpend: bigint = parseEther("0.01")
): Promise<ExecutorMetrics> {
  const balance = await provider.getBalance(executorAddress);
  const minimum = getMinimumExecutorBalance(networkId);
  const runway = calculateRunway(balance, expectedDailySpend);
  
  return {
    address: executorAddress,
    chainType: ["0x2b6653dc", "0xcd8690dc"].includes(networkId) ? "tron" : "evm",
    balance,
    minimumBalance: minimum,
    isHealthy: balance >= minimum && runway > 7, // At least 7 days runway
    daysOfRunway: runway === Infinity ? 365 : Math.floor(runway),
    lastFunded: new Date(),
  };
}

/**
 * Alert thresholds for operator monitoring
 */
export const AlertThresholds = {
  /**
   * Alert if balance falls below 3 days of runway
   */
  CriticalRunway: 3,
  
  /**
   * Alert if gas price is > 2x normal
   */
  HighGasMultiplier: 2.0,
  
  /**
   * Alert if execution fails 3 times in a row
   */
  ConsecutiveFailureLimit: 3,
  
  /**
   * Alert if avg execution cost increases > 25%
   */
  CostIncreasePercent: 25,
};

/**
 * Calculate recommended batch size for cost optimization
 */
export function getOptimalBatchSize(
  networkId: string,
  gasLimitPerTx: bigint = 100_000n
): number {
  const batchSizes: Record<string, number> = {
    "0x1": 5,        // Ethereum: batch 5 (high cost)
    "0xaa36a7": 10,  // Sepolia: batch 10
    "0x89": 15,      // Polygon: batch 15
    "0x38": 50,      // BSC: batch 50 (cheap)
    "0x61": 50,      // BSC Testnet: batch 50
    "0xa86a": 20,    // Avalanche: batch 20
    "0xa4b1": 100,   // Arbitrum: batch 100 (very cheap)
    "0xa": 100,      // Optimism: batch 100 (very cheap)
    "0x2105": 100,   // Base: batch 100 (very cheap)
    "0xfa": 20,      // Fantom: batch 20
    "0x2b6653dc": 200, // TRON: batch 200 (ultra cheap)
    "0xcd8690dc": 200, // TRON Nile: batch 200
  };
  
  return batchSizes[networkId] ?? 10;
}

export default {
  getMinimumExecutorBalance,
  getOptimalGasPrice,
  estimateExecutionCost,
  validateExecutorBalance,
  calculateRunway,
  formatCost,
  calculateBatchCost,
  TronEnergy,
  generateCostReport,
  checkExecutorHealth,
  AlertThresholds,
  getOptimalBatchSize,
};
