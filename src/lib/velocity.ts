import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, StockMovement } from '../types';
import { logAuditEvent } from './audit';

const FIXED_ADU_ANALYSIS_DAYS = 7;
const DEFAULT_SLOW_MOVING_INACTIVITY_DAYS = 14;

function toIsoDate(value: unknown): string | null {
  if (typeof value === 'string' && value) {
    return value;
  }

  if (value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }

  if (value && typeof (value as any).seconds === 'number') {
    return new Date((value as any).seconds * 1000).toISOString();
  }

  return null;
}

function getPercentileRank(index: number, total: number) {
  if (total <= 1) return 0.5;
  return index / (total - 1);
}

export async function recalculateProductVelocity(): Promise<void> {
  const settingsDoc = await getDoc(doc(db, 'system', 'settings')).catch(() => null);
  const settings = settingsDoc?.data() || {};

  const analysisPeriodDays = FIXED_ADU_ANALYSIS_DAYS;

  const inactivityDays = Math.max(
    1,
    Number(settings.slow_threshold || DEFAULT_SLOW_MOVING_INACTIVITY_DAYS)
  );

  const analysisStart = new Date();
  analysisStart.setDate(analysisStart.getDate() - analysisPeriodDays);

  const inactivityCutoff = new Date();
  inactivityCutoff.setDate(inactivityCutoff.getDate() - inactivityDays);

  const [productSnapshot, movementSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'products'))),
    getDocs(query(collection(db, 'movements'))),
  ]);

  const products = productSnapshot.docs.map((productDoc) => {
    return { id: productDoc.id, ...productDoc.data() } as Product;
  });

  if (products.length === 0) {
    return;
  }

  const aduByProduct = new Map<string, number>();
  const lastMovementDateByProduct = new Map<string, string>();

  movementSnapshot.docs.forEach((movementDoc) => {
    const movement = movementDoc.data() as StockMovement;
    const movementDateIso = toIsoDate(movement.movement_date);
    const productId = movement.product_id;

    if (!productId || !movementDateIso) return;

    const movementDate = new Date(movementDateIso);
    if (Number.isNaN(movementDate.getTime())) return;

    const previousLast = lastMovementDateByProduct.get(productId);
    if (!previousLast || new Date(previousLast) < movementDate) {
      lastMovementDateByProduct.set(productId, movementDate.toISOString());
    }

    if (movementDate < analysisStart) return;

    const qty = Number(movement.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return;

    // ADU tracks average daily consumption from issued stock.
    if (movement.type !== 'out') return;

    aduByProduct.set(productId, (aduByProduct.get(productId) || 0) + qty / analysisPeriodDays);
  });

  const rankedProducts = products
    .map((product) => ({
      id: product.id,
      adu: Number((aduByProduct.get(product.id) || 0).toFixed(4)),
    }))
    .sort((a, b) => {
      if (a.adu !== b.adu) return a.adu - b.adu;
      return a.id.localeCompare(b.id);
    });

  const allAduEqual = rankedProducts.every((p) => p.adu === rankedProducts[0].adu);
  const velocityByProductId = new Map<string, 'fast' | 'moderate' | 'slow'>();

  rankedProducts.forEach((entry, index) => {
    let velocity: 'fast' | 'moderate' | 'slow' = 'moderate';

    if (!allAduEqual) {
      const percentileRank = getPercentileRank(index, rankedProducts.length);
      if (percentileRank >= 0.75) {
        velocity = 'fast';
      } else if (percentileRank <= 0.25) {
        velocity = 'slow';
      }
    }

    velocityByProductId.set(entry.id, velocity);
  });

  const productBatch = writeBatch(db);
  products.forEach((product) => {
    productBatch.set(
      doc(db, 'products', product.id),
      {
        adu: Number((aduByProduct.get(product.id) || 0).toFixed(4)),
        velocity: velocityByProductId.get(product.id) || 'moderate',
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  const alertBatch = writeBatch(db);
  products.forEach((product) => {
    const productId = product.id;
    const velocity = velocityByProductId.get(productId) || 'moderate';
    const lastMovementIso = lastMovementDateByProduct.get(productId);
    const lastMovementDate = lastMovementIso ? new Date(lastMovementIso) : null;
    const isInactive = !lastMovementDate || lastMovementDate <= inactivityCutoff;
    const alertRef = doc(db, 'alerts', `slow-moving-inactive-${productId}`);

    if (velocity === 'slow' && isInactive) {
      alertBatch.set(
        alertRef,
        {
          id: `slow-moving-inactive-${productId}`,
          type: 'slow_moving',
          severity: 'warning',
          product_id: productId,
          product_name: product.name || 'Unknown product',
          is_acknowledged: false,
          status: 'open',
          message: `${product.name || 'Product'} is slow-moving and has no stock movement in the last ${inactivityDays} days.`,
          created_at: new Date().toISOString(),
          inactivity_days: inactivityDays,
          last_movement_at: lastMovementIso || null,
          source: 'velocity_engine',
        },
        { merge: true }
      );
    } else {
      alertBatch.set(
        alertRef,
        {
          is_acknowledged: true,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          source: 'velocity_engine',
        },
        { merge: true }
      );
    }
  });

  await Promise.all([productBatch.commit(), alertBatch.commit()]);

  await logAuditEvent({
    action: 'UPDATE',
    entityType: 'VelocityEngine',
    entityId: 'recalculateProductVelocity',
    details: `Recalculated velocity and alerts for ${products.length} products`,
    metadata: {
      productCount: products.length,
      analysisPeriodDays,
      inactivityDays,
    },
  });
}
