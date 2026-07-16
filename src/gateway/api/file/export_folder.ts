import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

function collectFiles(dirPath: string, zipRoot: string, zip: any): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, zipRoot, zip);
    } else {
      const relativePath = path.relative(zipRoot, fullPath);
      const content = fs.readFileSync(fullPath);
      zip.addFile(relativePath, content);
    }
  }
}

export async function GET(req: Request, res: Response) {
  const folderPath = resolvePath(req.query.path as string);
  if (!folderPath) return res.status(400).json({ success: false, error: "path 必填" });
  if (!fs.existsSync(folderPath)) return res.status(404).json({ success: false, error: "Folder not found" });
  if (!fs.statSync(folderPath).isDirectory()) return res.status(400).json({ success: false, error: "Path is not a directory" });

  const folderName = path.basename(folderPath);
  const zip = new AdmZip();
  collectFiles(folderPath, folderPath, zip);

  const zipBuffer = zip.toBuffer();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(folderName)}.zip`);
  res.send(zipBuffer);
}
