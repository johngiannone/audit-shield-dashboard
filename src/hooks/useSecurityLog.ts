import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type SecurityAction =
  | 'viewed_document'
  | 'downloaded_document'
  | 'signed_contract'
  | 'exported_case'
  | 'deleted_client'
  | 'login_success'
  | 'login_failed'
  | 'login_lockout'
  | 'password_changed'
  | 'case_assigned'
  | 'case_unassigned'
  | 'status_changed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'message_sent'
  | 'admin_access'
  | 'viewed_pii'
  | 'activation_attempt'
  | 'activation_success'
  | 'webhook_processed'
  | 'rate_limit_exceeded'
  | 'file_upload'
  | 'suspicious_activity';

interface LogSecurityEventParams {
  action: SecurityAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function logSecurityEvent({
  action,
  resourceType,
  resourceId,
  metadata = {},
}: LogSecurityEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Enrich metadata with timestamp
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      authenticated: !!user,
    };

    // Log even for unauthenticated events (e.g., failed logins)
    const { error } = await supabase
      .from('security_logs')
      .insert([{
        user_id: user?.id || null,
        action,
        resource_type: resourceType || null,
        resource_id: resourceId || null,
        metadata: enrichedMetadata as Json,
      }]);

    if (error) {
      // Fallback: log to console if DB insert fails (RLS may block unauthenticated inserts)
      console.warn('Failed to log security event to DB:', error.message, { action, resourceType, enrichedMetadata });
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

// Convenience functions for common actions
export const securityLog = {
  viewedDocument: (documentId: string, documentName?: string) =>
    logSecurityEvent({
      action: 'viewed_document',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { document_name: documentName },
    }),

  downloadedDocument: (documentId: string, documentName?: string) =>
    logSecurityEvent({
      action: 'downloaded_document',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { document_name: documentName },
    }),

  signedContract: (contractId: string, contractType?: string) =>
    logSecurityEvent({
      action: 'signed_contract',
      resourceType: 'contract',
      resourceId: contractId,
      metadata: { contract_type: contractType },
    }),

  exportedCase: (caseId: string, exportFormat?: string) =>
    logSecurityEvent({
      action: 'exported_case',
      resourceType: 'case',
      resourceId: caseId,
      metadata: { format: exportFormat },
    }),

  caseAssigned: (caseId: string, agentId: string) =>
    logSecurityEvent({
      action: 'case_assigned',
      resourceType: 'case',
      resourceId: caseId,
      metadata: { agent_id: agentId },
    }),

  caseUnassigned: (caseId: string) =>
    logSecurityEvent({
      action: 'case_unassigned',
      resourceType: 'case',
      resourceId: caseId,
    }),

  statusChanged: (caseId: string, oldStatus: string, newStatus: string) =>
    logSecurityEvent({
      action: 'status_changed',
      resourceType: 'case',
      resourceId: caseId,
      metadata: { old_status: oldStatus, new_status: newStatus },
    }),

  documentUploaded: (caseId: string, documentName: string) =>
    logSecurityEvent({
      action: 'document_uploaded',
      resourceType: 'case',
      resourceId: caseId,
      metadata: { document_name: documentName },
    }),

  adminAccess: (page: string) =>
    logSecurityEvent({
      action: 'admin_access',
      resourceType: 'page',
      resourceId: page,
    }),

  loginSuccess: (email: string) =>
    logSecurityEvent({
      action: 'login_success',
      resourceType: 'auth',
      metadata: { email },
    }),

  loginFailed: (email: string, reason?: string) =>
    logSecurityEvent({
      action: 'login_failed',
      resourceType: 'auth',
      metadata: { email, reason: reason || 'Invalid credentials' },
    }),

  viewedPii: (piiType: string, resourceId?: string, maskedValue?: string) =>
    logSecurityEvent({
      action: 'viewed_pii',
      resourceType: piiType,
      resourceId,
      metadata: { pii_type: piiType, masked_value: maskedValue },
    }),

  loginLockout: (email: string, attempts: number) =>
    logSecurityEvent({
      action: 'login_lockout',
      resourceType: 'auth',
      metadata: { email, attempts, lockout_duration_min: 15 },
    }),

  activationAttempt: (code: string, success: boolean) =>
    logSecurityEvent({
      action: success ? 'activation_success' : 'activation_attempt',
      resourceType: 'activation',
      metadata: { code_prefix: code.substring(0, 3) + '***', success },
    }),

  suspiciousActivity: (description: string, details?: Record<string, string | number | boolean | null>) =>
    logSecurityEvent({
      action: 'suspicious_activity',
      resourceType: 'security',
      metadata: { description, ...details },
    }),
};

// React hook wrapper for components
export function useSecurityLog() {
  return {
    logSecurityEvent,
    ...securityLog,
  };
}
