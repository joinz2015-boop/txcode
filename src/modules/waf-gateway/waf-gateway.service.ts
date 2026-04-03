import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { dbService } from '../db/db.service.js';

export interface WafGatewayConfig {
  id: number;
  secret_key: string;
  server_ip: string;
  status: 'running' | 'stopped';
  created_at: string;
  updated_at: string;
}

interface TunnelClientConfig {
  server_host: string;
  server_port: number;
  register_secret: string;
  rsa_public_key: string;
}

export class WafGatewayService {
  private clientProcess: ChildProcess | null = null;
  private pidFile: string;
  private clientDir: string;
  private configFile: string;

  constructor() {
    const homeDir = os.homedir();
    this.clientDir = path.join(homeDir, '.txcode', 'waf_client');
    this.pidFile = path.join(this.clientDir, 'waf_client.pid');
    this.configFile = path.join(this.clientDir, 'tunnel_client.json');
    this.ensureClientDir();
  }

  private ensureClientDir(): void {
    if (!fs.existsSync(this.clientDir)) {
      fs.mkdirSync(this.clientDir, { recursive: true });
    }
  }

  getConfig(): WafGatewayConfig | undefined {
    return dbService.get<WafGatewayConfig>('SELECT * FROM waf_gateway_config WHERE id = 1');
  }

  updateConfig(config: Partial<Pick<WafGatewayConfig, 'secret_key' | 'server_ip'>>): void {
    const now = new Date().toISOString();
    const current = this.getConfig();
    
    if (current) {
      dbService.run(
        `UPDATE waf_gateway_config SET 
          secret_key = ?, 
          server_ip = ?, 
          updated_at = ? 
        WHERE id = 1`,
        [
          config.secret_key ?? current.secret_key,
          config.server_ip ?? current.server_ip,
          now
        ]
      );
    }
  }

  updateStatus(status: 'running' | 'stopped'): void {
    const now = new Date().toISOString();
    dbService.run(
      `UPDATE waf_gateway_config SET status = ?, updated_at = ? WHERE id = 1`,
      [status, now]
    );
  }

  private getClientFileName(): string {
    const platform = os.platform();
    if (platform === 'win32') {
      return 'waf_client.exe';
    }
    return 'waf_client';
  }

  private getClientUrl(): string {
    const platform = os.platform();
    if (platform === 'win32') {
      return 'https://homecommunity.oss-cn-beijing.aliyuncs.com/waf_client.exe';
    }
    return 'https://homecommunity.oss-cn-beijing.aliyuncs.com/waf_client';
  }

  private async downloadClient(): Promise<string> {
    const clientFile = path.join(this.clientDir, this.getClientFileName());
    
    if (fs.existsSync(clientFile)) {
      return clientFile;
    }

    console.log(`Downloading WAF client from ${this.getClientUrl()}`);
    
    return new Promise((resolve, reject) => {
      const client = spawn('curl', ['-L', '-o', clientFile, this.getClientUrl()], {
        stdio: 'pipe'
      });

      client.on('close', (code) => {
        if (code === 0) {
          if (os.platform() !== 'win32') {
            fs.chmodSync(clientFile, 0o755);
          }
          console.log('WAF client downloaded successfully');
          resolve(clientFile);
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });

      client.on('error', reject);
    });
  }

  private generateConfig(): void {
    const config = this.getConfig();
    if (!config) {
      throw new Error('WAF gateway config not found');
    }

    const tunnelConfig: TunnelClientConfig = {
      server_host: config.server_ip,
      server_port: 5555,
      register_secret: config.secret_key,
      rsa_public_key: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvmXlcvzBsEX5rhzQl2lo
usXBBtUpmnPykEf2MpRa4NmUOKZwjeVS2nmqwfUdgzVBuTfVXOF4paqnWh/DupMP
XzE8lWj72VPjoPFt8yO0+0baAOMCi6L6gwzOdzu/EF4cIN6Bh4V648zc+TqRg2o/
+UqUb6cRfIc2ftP0aT/CudSei/IYZxUuL55vckU9dlMb8D6OVllrg6m5YMnPj4W5
Gb5eQxMU5Yryux3/9vPwdmfiRmGteqNn/pLOQhgd6LxX+7bBUEb3y8sSyEwEN1eW
0SADkZXdofyQRsRrnmeJuk9bQUAeBBkbGOtUL/ROUbFckfsKLdzokPHpX8/+Pndh
RQIDAQAB
-----END PUBLIC KEY-----`
    };

    fs.writeFileSync(this.configFile, JSON.stringify(tunnelConfig, null, 2));
    console.log(`Config file generated: ${this.configFile}`);
  }

  async start(): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('WAF gateway config not found');
    }

    if (!config.server_ip || !config.secret_key) {
      throw new Error('Server IP and secret key are required');
    }

    const isRunning = await this.isProcessRunning();
    if (isRunning) {
      console.log('WAF client is already running');
      return;
    }

    await this.downloadClient();
    this.generateConfig();

    const clientFile = path.join(this.clientDir, this.getClientFileName());
    
    console.log(`Starting WAF client: ${clientFile}`);
    
    return new Promise((resolve, reject) => {
      if (os.platform() === 'win32') {
        this.clientProcess = spawn('cmd', ['/c', 'start', '/b', '', clientFile], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          cwd: this.clientDir
        });
      } else {
        this.clientProcess = spawn(clientFile, [], {
          detached: true,
          stdio: 'ignore',
          cwd: this.clientDir
        });
      }

      const pid = this.clientProcess.pid;
      if (pid) {
        fs.writeFileSync(this.pidFile, pid.toString());
      }

      this.clientProcess.on('error', (err) => {
        console.error(`WAF client start error: ${err.message}`);
        this.updateStatus('stopped');
        reject(err);
      });

      this.clientProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`WAF client exited with code ${code}`);
        }
      });

      this.clientProcess.unref();
      this.updateStatus('running');
      console.log(`WAF client started with PID: ${pid}`);
      resolve();
    });
  }

  async stop(): Promise<void> {
    const isRunning = await this.isProcessRunning();
    if (!isRunning && !fs.existsSync(this.pidFile)) {
      this.updateStatus('stopped');
      console.log('WAF client is not running');
      return;
    }

    if (os.platform() === 'win32') {
      const exeName = this.getClientFileName();
      spawn('powershell', [
        '-WindowStyle', 'Hidden',
        '-Command',
        `Get-Process -Name "${exeName.replace('.exe', '')}" -ErrorAction SilentlyContinue | Stop-Process -Force`
      ], { stdio: 'ignore', shell: false });
      console.log(`WAF client process ${exeName} terminated`);
    } else {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim(), 10);
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`WAF client process ${pid} terminated`);
        } catch (err) {
          console.error(`Failed to kill process ${pid}:`, err);
        }
      }
    }

    if (fs.existsSync(this.pidFile)) {
      fs.unlinkSync(this.pidFile);
    }

    if (this.clientProcess) {
      this.clientProcess.kill('SIGTERM');
      this.clientProcess = null;
    }

    this.updateStatus('stopped');
    console.log('WAF client stopped');
  }

  async isProcessRunning(): Promise<boolean> {
    if (!fs.existsSync(this.pidFile)) {
      return false;
    }

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim(), 10);
    
    try {
      if (os.platform() === 'win32') {
        const result = spawn('tasklist', ['/FI', `PID eq ${pid}`], { stdio: 'pipe' });
        return new Promise((resolve) => {
          let output = '';
          result.stdout?.on('data', (data) => {
            output += data.toString();
          });
          result.on('close', () => {
            resolve(output.includes(pid.toString()));
          });
        });
      } else {
        process.kill(pid, 0);
        return true;
      }
    } catch {
      return false;
    }
  }

  getStatus(): { status: 'running' | 'stopped'; configured: boolean } {
    const config = this.getConfig();
    return {
      status: config?.status as 'running' | 'stopped' || 'stopped',
      configured: Boolean(config?.server_ip && config?.secret_key),
    };
  }
}

export const wafGatewayService = new WafGatewayService();
