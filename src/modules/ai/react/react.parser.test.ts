import { contentValidator } from './react.validator';
import { ReActParser } from './react.parser';

function testValidator(name: string, content: string) {
  console.log(`\n========== ${name} ==========`);
  const result = contentValidator.validate(content);
  console.log('Valid:', result.valid, '| isFaultTolerance:', result.isFaultTolerance);
  if (!result.valid) {
    console.log('Error:', result.error);
  } else {
    console.log('Cleaned content:', result.cleanedContent);
  }
}



async function testParser() {
  console.log('\n========== Full Parser Test ==========');
  const parser = new ReActParser();
  
  try {
    const result = await parser.parse("```xml\n<react>\n  <thought>创建AI云平台后端方案文档</thought>\n  <action>\n    <action_name>write_file</action_name>\n    <action_input>\n      <file_path>E:\\ai\\songbing_ai\\.txcode\\req\\AI云平台后端方案.md</file_path>\n      <content><![CDATA[# AI云平台后端方案\n\n## 一、项目概述\n\nAI云平台是一个提供AI模型训练、部署、推理的一站式服务平台，帮助用户快速使用GPU算力、管理AI模型、运行训练任务。\n\n## 二、技术栈\n\n| 层级 | 技术选型 |\n|------|----------|\n| 后端框架 | Python FastAPI |\n| 数据库 | MySQL 8.0 |\n| 缓存 | Redis |\n| ORM | SQLAlchemy + Alembic |\n| 任务队列 | Celery + Redis |\n| 前端 | Vue2 + ElementUI |\n| 认证 | JWT |\n| API文档 | Swagger/OpenAPI |\n\n## 三、目录结构\n\n```\nai-cloud-platform/\n├── backend/\n│   ├── app/\n│   │   ├── api/v1/           # API路由\n│   │   │   ├── auth.py       # 认证接口\n│   │   │   ├── users.py      # 用户管理\n│   │   │   ├── models.py     # 模型管理\n│   │   │   ├── tasks.py      # 任务管理\n│   │   │   └── resources.py  # 算力资源\n│   │   ├── core/             # 核心配置\n│   │   │   ├── config.py     # 配置管理\n│   │   │   ├── security.py   # 安全工具\n│   │   │   └── database.py   # 数据库连接\n│   │   ├── models/           # 数据模型\n│   │   ├── schemas/          # Pydantic schemas\n│   │   ├── services/         # 业务逻辑\n│   │   ├── tasks/            # Celery任务\n│   │   └── main.py           # 应用入口\n│   ├── alembic/              # 数据库迁移\n│   ├── requirements.txt\n│   └── .env.example\n├── frontend/                  # Vue2项目\n└── docker/                    # Docker配置\n```\n\n## 四、数据库设计\n\n### 4.1 用户表 (users)\n- id, username, email, password_hash, full_name, phone\n- role(admin/user/operator), status(active/inactive/banned), balance\n- created_at, updated_at\n\n### 4.2 AI模型表 (ai_models)\n- id, name, description, model_type, model_path, framework_version\n- file_size, is_public, owner_id, status\n- created_at, updated_at\n\n### 4.3 训练任务表 (training_tasks)\n- id, name, description, model_id, user_id, task_type\n- config(JSON), status, progress, logs, start_time, end_time\n- created_at\n\n### 4.4 算力资源表 (resources)\n- id, name, resource_type(gpu/cpu/memory/storage)\n- total_capacity, available_capacity, status, price_per_hour\n\n### 4.5 订单表 (orders)\n- id, order_no, user_id, resource_id, task_id\n- amount, payment_method, status, paid_at, created_at\n\n## 五、API接口设计\n\n### 5.1 认证模块\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| POST | /api/v1/auth/register | 用户注册 |\n| POST | /api/v1/auth/login | 用户登录 |\n| POST | /api/v1/auth/logout | 登出 |\n| POST | /api/v1/auth/refresh | 刷新Token |\n| GET | /api/v1/auth/me | 获取当前用户 |\n\n### 5.2 模型管理\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| GET | /api/v1/models | 模型列表 |\n| POST | /api/v1/models | 上传模型 |\n| GET | /api/v1/models/{id} | 模型详情 |\n| PUT | /api/v1/models/{id} | 更新模型 |\n| DELETE | /api/v1/models/{id} | 删除模型 |\n| POST | /api/v1/models/{id}/deploy | 部署模型 |\n\n### 5.3 任务管理\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| GET | /api/v1/tasks | 任务列表 |\n| POST | /api/v1/tasks | 创建任务 |\n| GET | /api/v1/tasks/{id} | 任务详情 |\n| DELETE | /api/v1/tasks/{id} | 取消任务 |\n| GET | /api/v1/tasks/{id}/logs | 获取日志 |\n\n### 5.4 资源管理\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| GET | /api/v1/resources | 资源列表 |\n| GET | /api/v1/resources/available | 可用资源 |\n\n## 六、核心业务流程\n\n1. 用户注册/登录 → 获取JWT Token\n2. 充值账户/购买套餐\n3. 上传AI模型文件\n4. 创建训练/推理任务\n5. 选择算力资源\n6. 任务执行并查看日志\n7. 任务完成获取结果\n\n## 七、环境变量配置\n\n```bash\nDEBUG=true\nSECRET_KEY=your-secret-key\nALGORITHM=HS256\nACCESS_TOKEN_EXPIRE_MINUTES=30\n\nMYSQL_HOST=localhost\nMYSQL_PORT=3306\nMYSQL_USER=root\nMYSQL_PASSWORD=password\nMYSQL_DATABASE=ai_cloud\n\nREDIS_HOST=localhost\nREDIS_PORT=6379\nREDIS_PASSWORD=\n\nCELERY_BROKER_URL=redis://localhost:6379/0\nCELERY_RESULT_BACKEND=redis://localhost:6379/1\n```\n\n## 八、下一步\n\n1. 确认方案后，创建后端项目骨架\n2. 搭建开发环境(Docker)\n3. 实现用户认证模块\n4. 实现核心业务模块]]></content>\n    </action_input>\n  </action>\n  <keep_context>false</keep_context>\n</react>\n</minimax:tool_call>");
    console.log('Parse success:', JSON.stringify(result.steps, null, 2));
  } catch (e: any) {
    console.log('Parse error:', e.message);
  }

  console.log('\n========== Fault Tolerance Test ==========');
  try {
    const result = await parser.parse('我已经完成了所有任务。文件已经保存。');
    console.log('Fault tolerance parse success:', JSON.stringify(result.steps, null, 2));
    console.log('Final answer:', result.finalAnswer);
  } catch (e: any) {
    console.log('Fault tolerance error:', e.message);
  }
}

testParser();
