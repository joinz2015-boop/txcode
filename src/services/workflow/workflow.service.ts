export interface WorkflowState {
  currentCategory: string
  currentProject: string
  currentStep: number
}

export class WorkflowService {
  private state: WorkflowState = {
    currentCategory: '',
    currentProject: '',
    currentStep: 1
  }

  getState(): WorkflowState {
    return { ...this.state }
  }

  setCurrent(category: string, project: string, step: number): void {
    this.state.currentCategory = category
    this.state.currentProject = project
    if (step >= 1 && step <= 4) {
      this.state.currentStep = step
    }
  }

  setCategory(category: string): void {
    this.state.currentCategory = category
    this.state.currentProject = ''
    this.state.currentStep = 1
  }

  setProject(project: string): void {
    this.state.currentProject = project
  }

  setStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.state.currentStep = step
    }
  }
}

export const workflowService = new WorkflowService()
