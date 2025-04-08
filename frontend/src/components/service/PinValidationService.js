/**
 * Enhanced service for handling PIN validation and related security operations
 */
class PinValidationService {
  static BASE_URL = '/api/user/pin';
  static SECURITY_URL = '/api/security';

  /**
   * Validates a user's PIN against the backend
   * @param {string} userId User ID
   * @param {string} pin PIN to validate
   * @returns {Promise<Object>} Validation result
   */
  static async validatePin(userId, pin) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!pin || !/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');

      const response = await fetch(`${PinValidationService.BASE_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          if (data.msg?.includes('Try again later') || data.msg?.includes('attempts')) {
            const cooldownMatch = data.msg.match(/Try again in (\d+) seconds/);
            const cooldownTime = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;
            const error = new Error(data.msg);
            error.cooldownTime = cooldownTime;
            throw error;
          }

          if (data.requireSecurityQuestion) {
            return { success: false, requireSecurityQuestion: true };
          }
        }

        throw new Error(data.msg || 'PIN validation failed');
      }

      return { success: true, ...data };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifies security question answer after PIN validation failures
   * @param {string} userId User ID
   * @param {string} securityAnswer User's answer to security question
   * @returns {Promise<Object>} Verification result
   */
  static async verifySecurityQuestion(userId, securityAnswer) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!securityAnswer?.trim()) throw new Error('Security answer is required');

      const response = await fetch(`${PinValidationService.SECURITY_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, securityAnswer }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.msg || 'Security verification failed');

      return {
        success: true,
        canResetPin: data.canResetPin || false,
        canProceed: data.canProceed || false,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches security question for a user
   * @param {string} userId User ID
   * @returns {Promise<Object>} Security question info
   */
  static async getSecurityQuestion(userId) {
    try {
      if (!userId) throw new Error('User ID is required');

      const response = await fetch(`${PinValidationService.SECURITY_URL}/question/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.msg || 'Could not retrieve security question');

      return {
        success: true,
        securityPhrase: data.securityPhrase,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resets a user's PIN after verification with security question
   * @param {string} userId User ID
   * @param {string} newPin New PIN to set
   * @param {string} securityAnswer Security answer for verification
   * @returns {Promise<Object>} Reset result
   */
  static async resetPin(userId, newPin, securityAnswer) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!/^\d{4}$/.test(newPin)) throw new Error('New PIN must be exactly 4 digits');
      if (!securityAnswer?.trim()) throw new Error('Security answer is required to reset PIN');

      const response = await fetch(`${PinValidationService.BASE_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPin, securityAnswer }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.msg || 'PIN reset failed');

      return { success: true, ...data };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Checks the status of PIN lockout for a user
   * @param {string} userId User ID
   * @returns {Promise<Object>} Lockout status information
   */
  static async checkPinLockoutStatus(userId) {
    try {
      if (!userId) throw new Error('User ID is required');

      const response = await fetch(`${PinValidationService.BASE_URL}/status/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.msg || 'Could not retrieve PIN status');

      return {
        success: true,
        isLocked: data.isLocked || false,
        attemptsLeft: data.attemptsLeft || 0,
        cooldownTime: data.cooldownTime || null,
        requiresSecurityQuestion: data.requiresSecurityQuestion || false,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }
}

export default PinValidationService;
