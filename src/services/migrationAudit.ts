/**
 * Service: Migration Audit
 * Issue #131 — Verify migration consistency and schema v3
 */
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { ApiResult, MigrationAuditReport } from '../types'

/**
 * Invoca la Cloud Function getMigrationAudit per verificare lo stato della migrazione.
 */
export async function getMigrationAuditReport(targetUid?: string): Promise<ApiResult<MigrationAuditReport>> {
  try {
    const auditFn = httpsCallable<{ targetUid?: string | undefined }, { success: boolean; data: MigrationAuditReport }>(
      functions,
      'getMigrationAudit'
    )
    const result = await auditFn({ targetUid })

    if (result.data.success) {
      return { success: true, data: result.data.data }
    } else {
      return { success: false, error: 'Errore durante il recupero del report di audit' }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Errore durante la chiamata a getMigrationAudit'
    }
  }
}
