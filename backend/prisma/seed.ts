import bcrypt from "bcryptjs";
import { PrismaClient, Role, TxStatus } from "@prisma/client";

const prisma = new PrismaClient();

const RULES = [
  { name: "AMOUNT_ANOMALY", config: { multiplier: 3.4 } },
  { name: "DUPLICATE_PAYMENT", config: { windowHours: 24 } },
  { name: "VELOCITY_SPIKE", config: { count: 2, windowHours: 6 } },
  { name: "UNUSUAL_HOURS", config: { start: 9, end: 18 } },
  { name: "OVER_BUDGET", config: {} },
  { name: "BLACKLISTED_ENTITY", config: {} }
];

async function main() {
  const password = async (plain: string) => bcrypt.hash(plain, 10);

  const adminHash = await password("Admin@123");
  const auditorHash = await password("Audit@123");
  const financeHash = await password("Finance@123");
  const deptHash = await password("Dept@123");
  const publicHash = await password("Public@123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@verifund.gov.in" },
    update: {
      name: "System Administrator",
      passwordHash: adminHash,
      role: Role.ADMIN,
      isActive: true,
      walletAddress: "ADMIN_ALGO_WALLET_001"
    },
    create: {
      email: "admin@verifund.gov.in",
      name: "System Administrator",
      passwordHash: adminHash,
      role: Role.ADMIN,
      walletAddress: "ADMIN_ALGO_WALLET_001"
    }
  });

  const auditor = await prisma.user.upsert({
    where: { email: "auditor@verifund.gov.in" },
    update: {
      name: "Lead Auditor",
      passwordHash: auditorHash,
      role: Role.AUDITOR,
      isActive: true,
      walletAddress: "AUDITOR_ALGO_WALLET_001"
    },
    create: {
      email: "auditor@verifund.gov.in",
      name: "Lead Auditor",
      passwordHash: auditorHash,
      role: Role.AUDITOR,
      walletAddress: "AUDITOR_ALGO_WALLET_001"
    }
  });

  const finance = await prisma.user.upsert({
    where: { email: "finance@verifund.gov.in" },
    update: {
      name: "Chief Finance Officer",
      passwordHash: financeHash,
      role: Role.FINANCE_OFFICER,
      ministry: "Central Finance",
      isActive: true,
      walletAddress: "FINANCE_ALGO_WALLET_001"
    },
    create: {
      email: "finance@verifund.gov.in",
      name: "Chief Finance Officer",
      passwordHash: financeHash,
      role: Role.FINANCE_OFFICER,
      ministry: "Central Finance",
      walletAddress: "FINANCE_ALGO_WALLET_001"
    }
  });

  await prisma.user.upsert({
    where: { email: "depthead@verifund.gov.in" },
    update: {
      name: "NHAI Department Head",
      passwordHash: deptHash,
      role: Role.DEPT_HEAD,
      ministry: "Ministry of Roads",
      isActive: true,
      walletAddress: "DEPTHEAD_ALGO_WALLET_001"
    },
    create: {
      email: "depthead@verifund.gov.in",
      name: "NHAI Department Head",
      passwordHash: deptHash,
      role: Role.DEPT_HEAD,
      department: "NHAI — Highway Operations",
      ministry: "Ministry of Roads",
      walletAddress: "DEPTHEAD_ALGO_WALLET_001"
    }
  });

  await prisma.user.upsert({
    where: { email: "public@verifund.gov.in" },
    update: {
      name: "Public Viewer",
      passwordHash: publicHash,
      role: Role.PUBLIC,
      isActive: true,
      walletAddress: "PUBLIC_ALGO_WALLET_001"
    },
    create: {
      email: "public@verifund.gov.in",
      name: "Public Viewer",
      passwordHash: publicHash,
      role: Role.PUBLIC,
      walletAddress: "PUBLIC_ALGO_WALLET_001"
    }
  });

  const ministriesData: {
    code: string;
    name: string;
    depts: { code: string; name: string; allocatedRupees: number }[];
  }[] = [
    {
      code: "MOR",
      name: "Ministry of Roads",
      depts: [
        { code: "NHAI", name: "NHAI — Highway Operations", allocatedRupees: 400_000_000 },
        { code: "NHIDCL", name: "NHIDCL — Infra Delivery", allocatedRupees: 250_000_000 },
        { code: "PWD-CEN", name: "PWD — Central Roads", allocatedRupees: 180_000_000 }
      ]
    },
    {
      code: "MOH",
      name: "Ministry of Health",
      depts: [
        { code: "CGHS", name: "CGHS — Central Scheme", allocatedRupees: 320_000_000 },
        { code: "AIIMS-POOL", name: "AIIMS Capital Pool", allocatedRupees: 410_000_000 },
        { code: "IMMUN", name: "Immunisation Directorate", allocatedRupees: 220_000_000 }
      ]
    },
    {
      code: "MOE",
      name: "Ministry of Education",
      depts: [
        { code: "SEL", name: "School Education — Central", allocatedRupees: 300_000_000 },
        { code: "HEL", name: "Higher Education Grants", allocatedRupees: 280_000_000 },
        { code: "SKILL", name: "Skills Mission HQ", allocatedRupees: 190_000_000 }
      ]
    },
    {
      code: "MOP",
      name: "Ministry of Power",
      depts: [
        { code: "GRID", name: "National Grid Ops", allocatedRupees: 350_000_000 },
        { code: "REEN", name: "Renewable Transition Unit", allocatedRupees: 260_000_000 },
        { code: "UTIL", name: "Utility Modernisation", allocatedRupees: 210_000_000 }
      ]
    },
    {
      code: "MODEF",
      name: "Ministry of Defence — Civil",
      depts: [
        { code: "BRDG", name: "Border Roads Organisation", allocatedRupees: 330_000_000 },
        { code: "CANT", name: "Cantonment Works", allocatedRupees: 170_000_000 },
        { code: "VET", name: "Veterans Welfare Fund", allocatedRupees: 140_000_000 }
      ]
    }
  ];

  const departmentIds: string[] = [];

  for (const m of ministriesData) {
    const deptAllocatedSum = m.depts.reduce((s, d) => s + BigInt(d.allocatedRupees) * 100n, 0n);
    const ministryAllocated = deptAllocatedSum + BigInt(50_000_000) * 100n;

    const ministry = await prisma.ministry.upsert({
      where: { code: m.code },
      update: { name: m.name, allocatedAmount: ministryAllocated },
      create: {
        code: m.code,
        name: m.name,
        allocatedAmount: ministryAllocated
      }
    });

    for (const d of m.depts) {
      const dept = await prisma.department.upsert({
        where: { code: d.code },
        update: {
          name: d.name,
          allocatedAmount: BigInt(d.allocatedRupees) * 100n,
          ministryId: ministry.id
        },
        create: {
          code: d.code,
          name: d.name,
          allocatedAmount: BigInt(d.allocatedRupees) * 100n,
          ministryId: ministry.id
        }
      });
      departmentIds.push(dept.id);
    }
  }

  const nhai = await prisma.department.findUniqueOrThrow({ where: { code: "NHAI" } });

  await prisma.user.update({
    where: { email: "depthead@verifund.gov.in" },
    data: { department: nhai.name }
  });

  for (const r of RULES) {
    await prisma.fraudRule.upsert({
      where: { name: r.name },
      update: { config: r.config },
      create: { name: r.name, config: r.config }
    });
  }

  await prisma.blacklist.deleteMany({ where: { vendorName: "ShadyCo Ltd" } });
  await prisma.blacklist.create({
    data: {
      vendorName: "ShadyCo Ltd",
      walletAddress: null,
      reason: "Sanctions programme match — blocked vendor",
      addedById: finance.id
    }
  });

  await prisma.blacklist.upsert({
    where: { walletAddress: "SHADY_WALLET_ONCHAIN" },
    update: {},
    create: {
      walletAddress: "SHADY_WALLET_ONCHAIN",
      vendorName: "ShadyCo Ltd",
      reason: "Known laundering wallet",
      addedById: finance.id
    }
  });

  const existingTx = await prisma.transaction.count();
  const statuses: TxStatus[] = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "PENDING", "FLAGGED", "REJECTED"];
  type BatchRow = {
    fromName: string;
    fromWallet: string;
    toName: string;
    toWallet: string;
    toType: string;
    amount: bigint;
    departmentId: string;
    ministry: string;
    initiatedById: string;
    status: TxStatus;
    blockchainTxHash: string | null;
    blockNumber: number | null;
    onChainAt: Date | null;
  };
  const batch: BatchRow[] = [];

  for (let i = existingTx; i < 500; i += 1) {
    const deptId = departmentIds[i % departmentIds.length];
    const deptRow = await prisma.department.findUniqueOrThrow({
      where: { id: deptId },
      include: { ministry: true }
    });
    const rupees = 50_000 + ((i * 13_337) % 8_000_000);
    const status = statuses[i % statuses.length];
    const needsChain = status === "CONFIRMED" && i % 5 === 0;
    batch.push({
      fromName: "Treasury Pool",
      fromWallet: "GOV_TREASURY_POOL",
      toName: `Vendor Entity ${i}`,
      toWallet: `VENDOR_WALLET_${(i * 17) % 400}`,
      toType: "vendor",
      amount: BigInt(rupees) * 100n,
      departmentId: deptRow.id,
      ministry: deptRow.ministry.name,
      initiatedById: finance.id,
      status,
      blockchainTxHash: needsChain ? `SEED-TX-${i}` : null,
      blockNumber: needsChain ? 30_000_000 + i : null,
      onChainAt: needsChain ? new Date(Date.now() - (i % 1000) * 3600_000) : null
    });
    if (batch.length >= 100) {
      await prisma.transaction.createMany({ data: batch });
      batch.length = 0;
    }
  }
  if (batch.length) await prisma.transaction.createMany({ data: batch });

  const flagCategories = [
    "DUPLICATE_PAYMENT",
    "OVER_BUDGET",
    "VELOCITY_SPIKE",
    "AMOUNT_ANOMALY",
    "UNUSUAL_HOURS",
    "BLACKLISTED_ENTITY"
  ];
  const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

  let flaggedTx = await prisma.transaction.findMany({
    where: { status: "FLAGGED" },
    take: 120,
    select: { id: true }
  });
  if (!flaggedTx.length) {
    flaggedTx = await prisma.transaction.findMany({
      take: 120,
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
  }

  let flagsCreated = await prisma.flag.count();
  let fi = 0;
  while (flagsCreated < 50 && fi < flaggedTx.length) {
    await prisma.flag.create({
      data: {
        transactionId: flaggedTx[fi].id,
        category: flagCategories[fi % flagCategories.length],
        reason: `Seed anomaly signal ${fi}`,
        severity: severities[fi % severities.length],
        aiScore: 60 + (fi % 35),
        isResolved: fi % 4 === 0,
        resolvedAt: fi % 4 === 0 ? new Date() : null,
        resolution: fi % 4 === 0 ? "CLEARED" : null,
        resolvedById: fi % 4 === 0 ? auditor.id : null
      }
    });
    flagsCreated += 1;
    fi += 1;
  }

  if ((await prisma.budgetAlert.count()) === 0) {
    const sampleDepts = await prisma.department.findMany({ take: 6 });
    for (const d of sampleDepts) {
      await prisma.budgetAlert.create({
        data: { departmentId: d.id, thresholdPct: 85 + (sampleDepts.indexOf(d) % 10), isTriggered: false }
      });
    }
  }

  console.info("Seed completed (users, ministries, departments, transactions, flags, rules).");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
