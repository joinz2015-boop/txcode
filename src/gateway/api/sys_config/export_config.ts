import { Request, Response } from "express";
import yaml from "js-yaml";
import { configExportImportService } from "../../../services/config/config-export-import.service.js";

export async function GET(_req: Request, res: Response) {
  try {
    const data = configExportImportService.exportAll();
    const yamlContent = yaml.dump(data, { skipInvalid: true });
    res.setHeader("Content-Type", "application/x-yaml");
    res.setHeader("Content-Disposition", "attachment; filename=config.yml");
    res.send(yamlContent);
  } catch (error: any) { res.status(500).json({ success: false, error: "导出失败: " + error.message }); }
}
