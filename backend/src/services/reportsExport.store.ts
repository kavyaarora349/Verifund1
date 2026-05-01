import { randomUUID } from "node:crypto";

type JobStatus = "queued" | "completed";

type ExportJob = {
  status: JobStatus;
  message?: string;
  createdAt: Date;
};

const jobs = new Map<string, ExportJob>();

export function queueAuditPdfExport(): { jobId: string } {
  const jobId = randomUUID();
  jobs.set(jobId, { status: "queued", createdAt: new Date() });
  queueMicrotask(() => {
    jobs.set(jobId, {
      status: "completed",
      createdAt: jobs.get(jobId)?.createdAt ?? new Date(),
      message:
        "Stub export completed — attach MinIO + PDF renderer for downloadable binaries in production."
    });
  });
  return { jobId };
}

export function getAuditPdfJob(jobId: string): ExportJob | undefined {
  return jobs.get(jobId);
}
