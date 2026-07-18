/**
 * Invitation utility functions for scanning and multi-scan logic
 */

export interface ScanValidationResult {
  isValid: boolean;
  message: string;
  scansRemaining: number;
}

/**
 * Validate if an invitation can be scanned
 * @param scanCount Current number of scans
 * @param maxScans Maximum allowed scans
 * @returns Validation result with status and message
 */
export function validateInvitationScan(
  scanCount: number,
  maxScans: number
): ScanValidationResult {
  if (scanCount >= maxScans) {
    return {
      isValid: false,
      message:
        maxScans === 1
          ? "تم مسح هذه البطاقة من قبل"
          : `تم مسح هذه البطاقة ${maxScans} مرات بالفعل`,
      scansRemaining: 0,
    };
  }

  const remaining = maxScans - scanCount - 1;
  return {
    isValid: true,
    message:
      remaining === 0
        ? "هذا هو آخر مسح لهذه البطاقة"
        : `يمكن مسح هذه البطاقة ${remaining} مرات إضافية`,
    scansRemaining: remaining,
  };
}

/**
 * Format scan count for display
 * @param scanCount Current number of scans
 * @param maxScans Maximum allowed scans
 * @returns Formatted string for display
 */
export function formatScanCount(scanCount: number, maxScans: number): string {
  if (maxScans === 1) {
    return scanCount === 0 ? "لم تُمسح" : "تم مسحها";
  }
  return `${scanCount}/${maxScans}`;
}

/**
 * Determine if invitation needs multi-scan
 * @param maxScans Maximum allowed scans
 * @returns true if maxScans > 1
 */
export function isMultiScan(maxScans: number): boolean {
  return maxScans > 1;
}
