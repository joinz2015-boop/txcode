import { Request, Response } from "express";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

export async function GET(req: Request, res: Response) {
  const file = req.query.file as string;
  const isNew = req.query.isNew === "true";
  const projectPath = req.query.path as string || projectService.getCurrentProjectPath();
  try {
    if (isNew && file) {
      const fullPath = path.join(projectPath, file);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: "文件不存在" });
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      let diff = `diff --git a/${file} b/${file}\n`;
      diff += `new file mode 100644\n`;
      diff += `--- /dev/null\n`;
      diff += `+++ b/${file}\n`;
      diff += `@@ -0,0 +1,${lines.length} @@\n`;
      for (const line of lines) {
        diff += `+${line}\n`;
      }
      res.json({ success: true, data: { diff } });
    } else {
      const args = file ? ["--", file] : [];
      const diff = execSync(`git diff ${args.join(" ")}`, { cwd: projectPath, encoding: "utf-8" });
      res.json({ success: true, data: { diff } });
    }
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
