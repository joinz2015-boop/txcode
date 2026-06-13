import { SchedulerJob } from './jobs/scheduler/scheduler.job.js'
import { DreamJob } from './jobs/dream/dream.job.js'
import { SessionCleanupJob } from './jobs/cleanup/session-cleanup.job.js'
import type { IJob } from './types.js'

const jobs: IJob[] = [
  new SchedulerJob(),
  new DreamJob(),
  new SessionCleanupJob(),
]

export async function initJobs() {
  for (const job of jobs) {
    await job.init()
  }
}

export async function shutdownJobs() {
  for (const job of jobs) {
    await job.shutdown()
  }
}
