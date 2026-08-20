import { Request, Response } from "express";
import { specManager } from "../../service/spec/index.js";
import { projectService } from "../../service/project/project.service.js";

export async function GET(req: Request, res: Response) {
  specManager.setProjectPath(projectService.getCurrentProjectPath());
  const specs = specManager.getLocalSpecs();
  res.json({
    success: true,
    data: {
      specs: specs.map(s => ({ name: s.name, description: s.description, read_mode: s.read_mode, filePath: s.filePath })),
      projectPath: projectService.getCurrentProjectPath(),
    },
  });
}

