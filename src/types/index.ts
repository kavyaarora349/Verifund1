export type Role = 'Admin' | 'Vendor' | 'Finance Officer' | 'Dept Head' | 'Public';

export type User = {
  id: string;
  name: string;
  role: Role;
  department?: string;
  walletAddress: string;
  email: string;
  lastLogin: string;
  status: 'active' | 'inactive';
};

export type Approval = {
  role: Role;
  name: string;
  wallet: string;
  signedAt: string | null;
  status: 'signed' | 'pending' | 'rejected';
};

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TransactionFlag = {
  reason: string;
  severity: FlagSeverity;
  aiScore: number;
  category: string;
};

export type TransactionStatus = 'confirmed' | 'pending' | 'flagged' | 'rejected';

export type Transaction = {
  id: string;
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: {
    name: string;
    wallet: string;
    role: string;
  };
  to: {
    name: string;
    wallet: string;
    type: 'vendor' | 'dept' | 'ministry';
  };
  amount: number;
  department: string;
  ministry: string;
  timestamp: string;
  status: TransactionStatus;
  flag?: TransactionFlag;
  approvals: Approval[];
};

export type BudgetNode = {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  children?: BudgetNode[];
};

export type FlagStat = {
  total: number;
  critical: number;
  underReview: number;
  cleared: number;
};
