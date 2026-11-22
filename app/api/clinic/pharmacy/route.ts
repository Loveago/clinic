import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_PHARMACY_ROLES,
  getAccraDateString,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET() {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const today = getAccraDateString();
    const thirtyDaysLater = getAccraDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const [medicines, movements, pendingPrescriptions] = await Promise.all([
      prisma.medicine.findMany({
        include: {
          batches: { orderBy: { expiryDate: 'asc' } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.stockMovement.findMany({
        include: {
          medicine: { select: { name: true } },
          batch: { select: { batchNumber: true, expiryDate: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.prescription.findMany({
        where: { status: { in: ['ISSUED', 'PARTIALLY_DISPENSED'] } },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          items: { include: { medicine: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const enrichedMedicines = medicines.map((m) => {
      const validStock = m.batches
        .filter((b) => b.quantityAvailable > 0 && b.expiryDate >= today)
        .reduce((s, b) => s + b.quantityAvailable, 0);
      const expiredStock = m.batches
        .filter((b) => b.quantityAvailable > 0 && b.expiryDate < today)
        .reduce((s, b) => s + b.quantityAvailable, 0);
      const expiringSoon = m.batches.filter(
        (b) => b.quantityAvailable > 0 && b.expiryDate >= today && b.expiryDate <= thirtyDaysLater
      ).length;
      return {
        ...m,
        availableStock: validStock,
        expiredStock,
        expiringSoonCount: expiringSoon,
        isLowStock: validStock <= m.reorderLevel,
      };
    });

    return NextResponse.json({
      today,
      medicines: enrichedMedicines,
      movements,
      pendingPrescriptions,
    });
  } catch (error) {
    console.error('GET clinic pharmacy error:', error);
    return NextResponse.json({ error: 'Failed to load pharmacy inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_PHARMACY_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create_medicine') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 });

      const medicine = await prisma.medicine.create({
        data: {
          name,
          genericName: body.genericName || null,
          brandName: body.brandName || null,
          category: body.category || 'General',
          description: body.description || null,
          dosageForm: body.dosageForm || 'Tablet',
          strength: body.strength || null,
          unit: body.unit || 'Unit',
          manufacturer: body.manufacturer || null,
          supplier: body.supplier || null,
          purchasePrice: Number(body.purchasePrice) || 0,
          sellingPrice: Number(body.sellingPrice) || 0,
          reorderLevel: Number(body.reorderLevel) || 10,
        },
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'MEDICINE_CREATED',
        entityType: 'Medicine',
        entityId: medicine.id,
        details: { name: medicine.name, sellingPrice: medicine.sellingPrice },
      });

      return NextResponse.json({ medicine }, { status: 201 });
    }

    if (action === 'receive_batch') {
      const { medicineId, batchNumber, quantity, expiryDate, purchaseDate, supplier, unitCost } = body;
      const qty = Number(quantity);
      if (!medicineId || !batchNumber || !expiryDate || !Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { error: 'medicineId, batchNumber, expiryDate, and positive quantity are required.' },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.medicineBatch.create({
          data: {
            medicineId,
            batchNumber: String(batchNumber).trim(),
            quantityReceived: qty,
            quantityAvailable: qty,
            expiryDate: String(expiryDate).trim(),
            purchaseDate: String(purchaseDate || getAccraDateString()),
            supplier: supplier || null,
            unitCost: Number(unitCost) || 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            medicineId,
            batchId: batch.id,
            movementType: 'RECEIVE',
            quantity: qty,
            reason: `Received batch ${batch.batchNumber}`,
            staffId: auth.userId || null,
            staffName: auth.name || 'Pharmacist',
          },
        });

        return batch;
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'STOCK_BATCH_RECEIVED',
        entityType: 'Medicine',
        entityId: medicineId,
        details: { batchNumber, quantity: qty, expiryDate },
      });

      return NextResponse.json({ batch: result }, { status: 201 });
    }

    if (action === 'adjust_stock') {
      const { batchId, deltaQuantity, reason } = body;
      const delta = Number(deltaQuantity);
      if (!batchId || !Number.isFinite(delta) || delta === 0 || !String(reason || '').trim()) {
        return NextResponse.json(
          { error: 'batchId, non-zero deltaQuantity, and reason are required.' },
          { status: 400 }
        );
      }

      const batch = await prisma.medicineBatch.findUnique({ where: { id: batchId } });
      if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      if (batch.quantityAvailable + delta < 0) {
        return NextResponse.json({ error: 'Adjustment would result in negative stock.' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.medicineBatch.update({
          where: { id: batchId },
          data: { quantityAvailable: { increment: delta } },
        });
        await tx.stockMovement.create({
          data: {
            medicineId: b.medicineId,
            batchId: b.id,
            movementType: delta < 0 && String(reason).toLowerCase().includes('expir') ? 'EXPIRED_WRITEOFF' : 'ADJUSTMENT',
            quantity: delta,
            reason: String(reason).trim(),
            staffId: auth.userId || null,
            staffName: auth.name || 'Pharmacist',
          },
        });
        return b;
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'STOCK_ADJUSTED',
        entityType: 'Medicine',
        entityId: batch.medicineId,
        details: { batchId, delta, reason },
      });

      return NextResponse.json({ batch: updated });
    }

    if (action === 'dispense') {
      const { prescriptionId, items } = body;
      if (!prescriptionId || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'prescriptionId and dispense items array are required.' },
          { status: 400 }
        );
      }

      const today = getAccraDateString();

      try {
        const updatedRx = await prisma.$transaction(async (tx) => {
          const rx = await tx.prescription.findUnique({
            where: { id: prescriptionId },
            include: { items: true },
          });
          if (!rx) throw new Error('NOT_FOUND:Prescription not found');
          if (rx.status === 'CANCELLED') throw new Error('BAD_REQUEST:Cannot dispense a cancelled prescription');

          for (const reqItem of items as Array<{ prescriptionItemId: string; quantity: number; batchId?: string }>) {
            const qtyToDispense = Number(reqItem.quantity);
            if (!Number.isFinite(qtyToDispense) || qtyToDispense <= 0) continue;

            const rxItem = rx.items.find((i) => i.id === reqItem.prescriptionItemId);
            if (!rxItem) throw new Error('BAD_REQUEST:Invalid prescription item');

            const remainingNeeded = rxItem.quantityPrescribed - rxItem.quantityDispensed;
            if (qtyToDispense > remainingNeeded) {
              throw new Error(
                `BAD_REQUEST:Cannot dispense ${qtyToDispense} of ${rxItem.medicineName}; only ${remainingNeeded} remaining.`
              );
            }

            if (!rxItem.medicineId) {
              throw new Error(`BAD_REQUEST:${rxItem.medicineName} is not linked to a stocked medicine.`);
            }

            // If specific batchId provided, validate it is not expired and has enough stock
            if (reqItem.batchId) {
              const specificBatch = await tx.medicineBatch.findUnique({ where: { id: reqItem.batchId } });
              if (!specificBatch || specificBatch.medicineId !== rxItem.medicineId) {
                throw new Error('BAD_REQUEST:Invalid medicine batch selected.');
              }
              if (specificBatch.expiryDate < today) {
                throw new Error(`BAD_REQUEST:Cannot dispense expired batch ${specificBatch.batchNumber} (expired ${specificBatch.expiryDate}).`);
              }
              const dec = await tx.medicineBatch.updateMany({
                where: {
                  id: specificBatch.id,
                  quantityAvailable: { gte: qtyToDispense },
                  expiryDate: { gte: today },
                },
                data: { quantityAvailable: { decrement: qtyToDispense } },
              });
              if (dec.count === 0) {
                throw new Error(`BAD_REQUEST:Insufficient non-expired stock in batch ${specificBatch.batchNumber}.`);
              }
              await tx.dispensingRecord.create({
                data: {
                  prescriptionItemId: rxItem.id,
                  batchId: specificBatch.id,
                  quantityDispensed: qtyToDispense,
                  dispensedById: auth.userId || null,
                  dispensedByName: auth.name || 'Pharmacist',
                },
              });
              await tx.stockMovement.create({
                data: {
                  medicineId: rxItem.medicineId,
                  batchId: specificBatch.id,
                  movementType: 'DISPENSE',
                  quantity: -qtyToDispense,
                  reason: `Dispensed for ${rx.prescriptionNumber}`,
                  staffId: auth.userId || null,
                  staffName: auth.name || 'Pharmacist',
                },
              });
            } else {
              // FEFO: First Expired, First Out across non-expired batches
              const batches = await tx.medicineBatch.findMany({
                where: {
                  medicineId: rxItem.medicineId,
                  quantityAvailable: { gt: 0 },
                  expiryDate: { gte: today },
                },
                orderBy: { expiryDate: 'asc' },
              });

              const totalAvailable = batches.reduce((s, b) => s + b.quantityAvailable, 0);
              if (totalAvailable < qtyToDispense) {
                throw new Error(
                  `BAD_REQUEST:Insufficient non-expired stock for ${rxItem.medicineName} (available: ${totalAvailable}, requested: ${qtyToDispense}).`
                );
              }

              let left = qtyToDispense;
              for (const batch of batches) {
                if (left <= 0) break;
                const take = Math.min(left, batch.quantityAvailable);
                const dec = await tx.medicineBatch.updateMany({
                  where: {
                    id: batch.id,
                    quantityAvailable: { gte: take },
                    expiryDate: { gte: today },
                  },
                  data: { quantityAvailable: { decrement: take } },
                });
                if (dec.count === 0) {
                  throw new Error(`BAD_REQUEST:Concurrent stock update prevented dispensing ${rxItem.medicineName}. Please retry.`);
                }
                await tx.dispensingRecord.create({
                  data: {
                    prescriptionItemId: rxItem.id,
                    batchId: batch.id,
                    quantityDispensed: take,
                    dispensedById: auth.userId || null,
                    dispensedByName: auth.name || 'Pharmacist',
                  },
                });
                await tx.stockMovement.create({
                  data: {
                    medicineId: rxItem.medicineId,
                    batchId: batch.id,
                    movementType: 'DISPENSE',
                    quantity: -take,
                    reason: `Dispensed for ${rx.prescriptionNumber}`,
                    staffId: auth.userId || null,
                    staffName: auth.name || 'Pharmacist',
                  },
                });
                left -= take;
              }
            }

            await tx.prescriptionItem.update({
              where: { id: rxItem.id },
              data: { quantityDispensed: { increment: qtyToDispense } },
            });
          }

          const refreshedItems = await tx.prescriptionItem.findMany({
            where: { prescriptionId },
          });
          const allDispensed = refreshedItems.every((i) => i.quantityDispensed >= i.quantityPrescribed);
          const anyDispensed = refreshedItems.some((i) => i.quantityDispensed > 0);
          const nextStatus = allDispensed ? 'DISPENSED' : anyDispensed ? 'PARTIALLY_DISPENSED' : rx.status;

          return tx.prescription.update({
            where: { id: prescriptionId },
            data: { status: nextStatus },
            include: { items: { include: { dispensingRecords: true } } },
          });
        }, { timeout: 20000 });

        await logClinicAudit({
          actorId: auth.userId,
          actorName: auth.name,
          actorRole: auth.clinicRole,
          action: 'PRESCRIPTION_DISPENSED',
          entityType: 'Prescription',
          entityId: prescriptionId,
          details: { status: updatedRx.status },
        });

        return NextResponse.json({ prescription: updatedRx });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Dispensing failed';
        if (msg.startsWith('NOT_FOUND:')) {
          return NextResponse.json({ error: msg.replace('NOT_FOUND:', '') }, { status: 404 });
        }
        if (msg.startsWith('BAD_REQUEST:')) {
          return NextResponse.json({ error: msg.replace('BAD_REQUEST:', '') }, { status: 400 });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: 'Unknown pharmacy action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic pharmacy error:', error);
    return NextResponse.json({ error: 'Pharmacy operation failed' }, { status: 500 });
  }
}
