import { Request, Response } from "express";
import yaml from "js-yaml";
import { configExportImportService } from "../../services/config/config-export-import.service.js";

export async function POST(req: Request, res: Response) {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, error: "请提供配置文件内容" });
    let data;
    try { data = yaml.load(content); } catch (parseError: any) { return res.status(400).json({ success: false, error: "YAML 格式解析失败: " + parseError.message }); }
    if (!data || typeof data !== "object") return res.status(400).json({ success: false, error: "配置文件格式无效" });
    const result = configExportImportService.importData(data);
    if (result.success) res.json({ success: true, message: result.message });
    else res.status(500).json({ success: false, error: result.message });
  } catch (error: any) { res.status(500).json({ success: false, error: "导入失败: " + error.message }); }
}
