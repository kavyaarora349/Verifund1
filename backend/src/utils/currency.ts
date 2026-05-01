/** API amounts are whole rupees; DB stores paise (1 ₹ = 100 paise). */
export function rupeesToPaise(rupees: number): bigint {
  if (!Number.isFinite(rupees) || rupees <= 0 || !Number.isInteger(rupees)) {
    throw new Error("Amount must be a positive integer number of rupees");
  }
  return BigInt(rupees) * 100n;
}
