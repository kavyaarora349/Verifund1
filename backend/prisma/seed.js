import bcrypt from "bcryptjs";
import { PrismaClient, Role, TxStatus } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const users = [
        { email: "admin@verifund.gov.in", password: "Admin@123", role: Role.ADMIN, name: "Admin User" },
        { email: "auditor@verifund.gov.in", password: "Audit@123", role: Role.AUDITOR, name: "Auditor User" },
        {
            email: "finance@verifund.gov.in",
            password: "Finance@123",
            role: Role.FINANCE_OFFICER,
            name: "Finance Officer"
        },
        { email: "depthead@verifund.gov.in", password: "Dept@123", role: Role.DEPT_HEAD, name: "Department Head" },
        { email: "public@verifund.gov.in", password: "Public@123", role: Role.PUBLIC, name: "Public User" }
    ];
    for (const user of users) {
        const hash = await bcrypt.hash(user.password, 10);
        await prisma.user.upsert({
            where: { email: user.email },
            update: { name: user.name, role: user.role, passwordHash: hash, isActive: true },
            create: { email: user.email, name: user.name, role: user.role, passwordHash: hash }
        });
    }
    const ministry = await prisma.ministry.upsert({
        where: { code: "MOR" },
        update: {},
        create: { code: "MOR", name: "Ministry of Roads", allocatedAmount: BigInt(100_000_000_000) }
    });
    const department = await prisma.department.upsert({
        where: { code: "NHAI" },
        update: {},
        create: {
            code: "NHAI",
            name: "National Highways",
            ministryId: ministry.id,
            allocatedAmount: BigInt(40_000_000_000)
        }
    });
    const finance = await prisma.user.findUniqueOrThrow({ where: { email: "finance@verifund.gov.in" } });
    const count = await prisma.transaction.count();
    if (count < 50) {
        for (let i = 0; i < 50; i += 1) {
            await prisma.transaction.create({
                data: {
                    fromName: "Treasury",
                    fromWallet: "GOV_TREASURY",
                    toName: `Vendor-${i}`,
                    toWallet: `VENDOR_WALLET_${i}`,
                    toType: "vendor",
                    amount: BigInt(1000000 + i * 10000),
                    departmentId: department.id,
                    ministry: ministry.name,
                    initiatedById: finance.id,
                    status: i % 7 === 0 ? TxStatus.FLAGGED : TxStatus.CONFIRMED
                }
            });
        }
    }
    await prisma.blacklist.upsert({
        where: { walletAddress: "SHADY_WALLET" },
        update: {},
        create: {
            walletAddress: "SHADY_WALLET",
            vendorName: "ShadyCo Ltd",
            reason: "Sanctioned vendor",
            addedById: finance.id
        }
    });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
