import { BattleManager } from './battle-manager';

/**
 * Singleton instance of BattleManager for centralized battle management
 * This ensures all components use the same instance for managing battles
 */
export const battleManager = new BattleManager(); 