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
  | 'password_changed'
  | 'case_assigned'
  | 'case_unassigned'
  | 'status_changed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'message_sent'
  | 'admin_access'
  | 'viewed_pii';

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
    
    if (!user) {
      console.warn('Cannot log security event: No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('security_logs')
      .insert([{
        user_id: user.id,
        action,
        resource_type: resourceType || null,
        resource_id: resourceId || null,
        metadata: metadata as Json,
      }]);

    if (error) {
      console.error('Failed to log security event:', error);
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
};

// React hook wrapper for components
export function useSecurityLog() {
  return {
    logSecurityEvent,
    ...securityLog,
  };
}
