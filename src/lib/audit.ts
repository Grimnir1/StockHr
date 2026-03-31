import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

interface AuditEventInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  details: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      user_id: event.userId || auth.currentUser?.uid || null,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      details: event.details,
      metadata: event.metadata || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
