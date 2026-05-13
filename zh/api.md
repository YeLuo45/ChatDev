# 附件与 API 参考

本文档涵盖附件上传下载、工件事件监听以及 FIELD_SPECS 标准，适用对象为高级用户和集成开发者。

---

## 1. 上传与列举

### 1.1 上传文件

```
POST /api/uploads/{session_id}
```

| 项目 | 说明 |
| --- | --- |
| Headers | `Content-Type: multipart/form-data` |
| Form 字段 | `file`（单个文件） |

**响应示例**

```json
{
  "attachment_id": "att_bxabcd",
  "name": "spec.md",
  "mime": "text/markdown",
  "size": 12345
}
```

文件保存至 `WareHouse/<session>/code_workspace/attachments/`，并在 `attachments_manifest.json` 中记录。

### 1.2 列举附件

```
GET /api/uploads/{session_id}
```

返回该 Session 当前所有附件的元数据（ID、文件名、MIME 类型、大小、来源）。

### 1.3 在执行请求中引用附件

在 `POST /api/workflow/execute` 或 WebSocket `human_input` 消息中可引用附件：

```json
{
  "attachments": ["att_xxx"],
  "task_prompt": "处理上传的文件"
}
```

> **注意**：`attachments` 必须同时提供 `task_prompt`（即便只想上传文件）。

---

## 2. 工件事件与下载

### 2.1 实时事件

```
GET /api/sessions/{session_id}/artifact-events
```

| Query 参数 | 说明 |
| --- | --- |
| `after` | 游标位置 |
| `wait_seconds` | 等待超时秒数 |
| `include_mime` | 按 MIME 类型过滤 |
| `include_ext` | 按文件扩展名过滤 |
| `max_size` | 文件大小上限 |
| `limit` | 返回数量上限 |

**响应示例**

```json
{
  "events": [
    {
      "artifact_id": "art_123",
      "attachment_id": "att_456",
      "node_id": "python_runner",
      "path": "code_workspace/result.json",
      "size": 2048,
      "mime": "application/json",
      "hash": "sha256:...",
      "timestamp": 1732699900
    }
  ],
  "next_cursor": "...",
  "has_more": false,
  "timed_out": false
}
```

WebSocket 会同步推送类型为 `artifact_created` 的事件，前端可直接订阅。

### 2.2 下载单个工件

```
GET /api/sessions/{session_id}/artifacts/{artifact_id}
```

| Query 参数 | 说明 |
| --- | --- |
| `mode` | `meta`（仅元数据）或 `stream`（文件内容） |
| `download` | `true` 时附带 `Content-Disposition` 头 |
| `data_uri` | 小文件可选择内联返回（需服务器启用） |

### 2.3 打包下载 Session

```
GET /api/sessions/{session_id}/download
```

将 `WareHouse/<session>/` 打包为 zip，供一次性下载。

---

## 3. 文件生命周期

1. **上传**：写入 `code_workspace/attachments/`，manifest 记录 `source`、`workspace_path`、`storage` 等字段。
2. **注册**：Python 节点或工具可调用 `AttachmentStore.register_file()` 将 workspace 文件注册为附件；`WorkspaceArtifactHook` 会将其同步到事件流。
3. **清理**：默认保留所有附件，便于运行结束后下载。设置 `MAC_AUTO_CLEAN_ATTACHMENTS=1` 可在 Session 完成后自动删除 `attachments/` 目录。
4. **归档**：WareHouse 打包下载不会删除原文件，需额外策略（cron/job）做归档或清空。

---

## 4. FIELD_SPECS 标准

FIELD_SPECS 是 Config 类的字段元数据规范，用于 Web UI 表单生成和设计模板导出。

### 4.1 基本结构

```python
FIELD_SPECS = {
    "interpreter": ConfigFieldSpec(
        name="interpreter",
        display_name="解释器",
        type_hint="str",
        required=False,
        default="python3",
        description="Python 可执行文件路径",
    ),
}
```

### 4.2 核心字段说明

| 字段 | 说明 |
| --- | --- |
| `name` | 与 YAML 字段一致 |
| `display_name` | 前端表单展示名称，缺省时回退到 `name` |
| `type_hint` | 类型描述，如 `str`、`list[str]`、`dict[str, Any]` |
| `required` | 是否必填 |
| `default` | 默认值 |
| `description` | 表单提示与文档说明 |
| `enum` | 可选值列表（字符串数组） |
| `enumOptions` | 为枚举提供 label/description 等附加提示 |
| `child` | 嵌套子配置类（引用另一个 `BaseConfig` 子类） |

### 4.3 编写流程

1. **实现 `from_dict` 校验**：解析 YAML 时确保类型正确，抛出清晰 `ConfigError`。
2. **定义 `FIELD_SPECS`**：覆盖所有公开字段，提供类型、描述、默认值。
3. **动态字段处理**：若字段依赖注册表或目录扫描结果，重写 `field_specs()` 并使用 `replace()` 注入实时 `enum`/`description`。
4. **导出设计模板**：

```bash
python -m tools.export_design_template --output yaml_template/design.yaml --mirror frontend/public/design.yaml
```

### 4.4 常见模式

| 模式 | 示例 |
| --- | --- |
| 简单标量字段 | `entity/configs/python_runner.py` 中的 `timeout_seconds` |
| 嵌套列表字段 | `entity/configs/memory.py` 的 `file_sources` 使用 `child=FileSourceConfig` |
| 动态枚举 | `Node.field_specs()` 使用节点注册表填充 `type` 选项；`FunctionToolEntryConfig.field_specs()` 从函数目录生成枚举列表 |

### 4.5 最佳实践

- 描述保持用户友好，明确单位（例如"超时时间（秒）"）。
- 默认值应与 `from_dict` 行为一致，避免 UI 默认与后端解析不符。
- 对嵌套配置提供精简示例或引用。
- 修改或新增 FIELD_SPECS 后，记得同步导出设计模板。

---

## 5. 大小与安全建议

| 项目 | 说明 |
| --- | --- |
| **大小限制** | 后端未硬编码，可在反向代理设置 `client_max_body_size`，或在 `AttachmentService.save_upload_file` 中添加校验 |
| **文件类型** | 基于 MIME 推断 `MessageBlockType`（image/audio/video/file）；可结合 `include_mime` 过滤 |
| **病毒/敏感信息** | 上传前由客户端自查；必要时在保存后触发扫描服务 |
| **权限** | Attachment API 依赖 Session ID；生产部署应在代理层或 JWT 内部校验调用者身份 |

---

## 6. 常见问题排查

| 问题 | 排查步骤 |
| --- | --- |
| 上传 413 Payload Too Large | 调整反向代理或 FastAPI `client_max_size`，确认磁盘配额 |
| 下载链接 404 | 确认 `session_id` 拼写（仅允许字母/数字/`_-`），检查 Session 是否已被清理 |
| 工件事件缺失 | 确认 WebSocket 是否连接，或在 REST 事件接口中使用 `after` 游标重拉 |
| 附件未在 Python 节点可见 | 检查 `code_workspace/attachments/` 是否被清理，或 `_context['python_workspace_root']` 是否正确 |

---

## 7. 客户端实现建议

- **Web UI**：使用 `artifact-events` 长轮询或 WebSocket，实时刷新附件列表；在节点成功后提供"下载全部"按钮。
- **CLI/自动化**：在运行结束后调用 `/download` 拉取 zip；若仅需部分文件，可结合 `artifact-events` 的 `include_ext` 精准过滤。
- **测试环境**：可通过脚本模拟上传/下载流程，确保反向代理和 CORS 配置正确。
