import { prisma } from "../../config/db.js";
import { emitFlagNew, emitTxFlagged } from "../notifications/socket.service.js";
import { amountAnomalyRule } from "./rules/amountAnomaly.rule.js";
import { blacklistedEntityRule } from "./rules/blacklistedEntity.rule.js";
import { duplicatePaymentRule } from "./rules/duplicatePayment.rule.js";
import { overBudgetRule } from "./rules/overBudget.rule.js";
import { unusualHoursRule } from "./rules/unusualHours.rule.js";
import { velocitySpikeRule } from "./rules/velocitySpike.rule.js";

export async function runFraudChecksWithSideEffects(transactionId: string): Promise<void> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { department: true }
  });
  if (!tx) return;

  const results = await Promise.all([
    duplicatePaymentRule(tx),
    overBudgetRule(tx),
    unusualHoursRule(tx),
    velocitySpikeRule(tx),
    blacklistedEntityRule(tx),
    amountAnomalyRule(tx)
  ]);

  const triggered = results.filter((r) => r.triggered);
  if (!triggered.length) return;

  const createdFlags = [];
  for (const r of triggered) {
    const flag = await prisma.flag.create({
      data: {
        transactionId: tx.id,
        category: r.category ?? "UNKNOWN",
        reason: r.reason ?? "Rule triggered",
        severity: r.severity ?? "LOW",
        aiScore: r.aiScore ?? 50
      }
    });
    createdFlags.push(flag);
  }

  let upgradedToFlagged = false;
  if (triggered.some((r) => r.severity === "HIGH" || r.severity === "CRITICAL")) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: "FLAGGED" }
    });
    upgradedToFlagged = true;
  }

  const txWithDept = await prisma.transaction.findUnique({
    where: { id: tx.id },
    include: { department: true }
  });

  for (const flag of createdFlags) {
    emitFlagNew({ flag, transaction: txWithDept });
  }

  if (upgradedToFlagged) {
    emitTxFlagged({ transactionId: tx.id, flagCount: createdFlags.length });
  }
}
