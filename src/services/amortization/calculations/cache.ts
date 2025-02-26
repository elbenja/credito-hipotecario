import type {
  BaseAmortizationValues,
  CalculationResults,
  Property
} from '../types/common';
import type { ScenarioType } from '../types/scenarios';

interface CacheKey {
  property: Property;
  baseValues: BaseAmortizationValues;
  scenarioType: ScenarioType;
}

interface CacheEntry {
  results: CalculationResults;
  timestamp: number;
}

class CalculationCache {
  private static instance: CalculationCache;
  private cache: Map<string, CacheEntry>;
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  private constructor(maxEntries = 100, ttlMinutes = 30) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  static getInstance(): CalculationCache {
    if (!CalculationCache.instance) {
      CalculationCache.instance = new CalculationCache();
    }
    return CalculationCache.instance;
  }

  private generateKey(key: CacheKey): string {
    return JSON.stringify({
      property: {
        id: key.property.id,
        cost: key.property.cost,
        currency: key.property.currency,
        bonus: key.property.bonus,
        property_insurance: key.property.property_insurance,
        property_insurance_type: key.property.property_insurance_type
      },
      baseValues: {
        property_id: key.baseValues.property_id,
        down_payment: key.baseValues.down_payment,
        term_years: key.baseValues.term_years,
        interest_rate: key.baseValues.interest_rate,
        first_installment_date: key.baseValues.first_installment_date,
        installments_per_year: key.baseValues.installments_per_year,
        loan_protection_insurance: key.baseValues.loan_protection_insurance,
        loan_protection_type: key.baseValues.loan_protection_type
      },
      scenarioType: key.scenarioType
    });
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMaxEntries(): void {
    if (this.cache.size > this.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const entriesToRemove = entries.slice(0, entries.length - this.maxEntries);
      
      for (const [key] of entriesToRemove) {
        this.cache.delete(key);
      }
    }
  }

  get(key: CacheKey): CalculationResults | null {
    this.cleanExpiredEntries();
    
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.results;
  }

  set(key: CacheKey, results: CalculationResults): void {
    const cacheKey = this.generateKey(key);
    
    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });

    this.enforceMaxEntries();
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

export default CalculationCache; 