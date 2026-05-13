# Tooling 模块

DevAll 支持两类工具绑定到 Agent 节点：

1. **Function Tooling**：调用仓库内的 Python 函数（`functions/function_calling/`），通过 JSON Schema 自动生成工具签名。
2. **MCP Tooling**：连接符合 Model Context Protocol 的外部服务，可直接复用 FastMCP、Claude Desktop 等工具生态。

所有 Tooling 配置都挂载在 `AgentConfig.tooling`：

```yaml
nodes:
  - id: solve
    type: agent
    config:
      provider: openai
      model: gpt-4o-mini
      prompt_template: solver
      tooling:
        type: function
        config:
          tools:
            - name: describe_available_files
            - name: load_file
          auto_load: true
          timeout: 20
```

## 1.  Overview：Function 与 MCP 模式对比

| 维度 | Function | MCP Remote | MCP Local |
|------|----------|------------|-----------|
| 部署方式 | 同进程调用本地 Python 函数 | 直连 HTTP(S) 服务 | 拉起本地进程并通过 stdio 连接 |
| Schemas | 自动从类型注解 + `ParamMeta` 生成 | 由 MCP JSON Schema 提供 | 由 MCP JSON Schema 提供 |
| 上下文注入 | 自动注入 `_context`（附件/workspace） | 取决于 MCP 服务器实现 | 取决于 MCP 服务器实现 |
| 典型用途 | 文件操作、本地脚本、内部 API | 第三方工具合集、浏览器、数据库代理 | Blender MCP、CLI 工具等本地进程 |
| 配置字段 | `tools`、`timeout` | `server`、`headers`、`timeout` | `command`、`args`、`cwd`、`env`、`wait_for_log` 等 |

### Function Tooling

`FunctionToolConfig` 允许 Agent 节点调用仓库中的 Python 函数。相关代码位于 `entity/configs/tooling.py`、`utils/function_catalog.py` 以及 `functions/function_calling/`。

**配置字段：**

| 字段 | 说明 |
|------|------|
| `tools` | 列表，元素为 `FunctionToolEntryConfig`，每个条目至少包含 `name` |
| `timeout` | 单次工具执行的超时时间（秒） |

### MCP Tooling

MCP 工具分为 **Remote (HTTP)** 与 **Local (stdio)** 两种模式：

**McpRemoteConfig 字段：**

| 字段 | 说明 |
|------|------|
| `server` | 必填，MCP HTTP(S) 端点，例如 `https://api.example.com/mcp` |
| `headers` | 可选，附加 HTTP 头（如 `Authorization`） |
| `timeout` | 可选，单次工具调用超时时间（秒） |

**McpLocalConfig 字段：**

| 字段 | 说明 |
|------|------|
| `command` / `args` | 可执行文件与参数（如 `uvx blender-mcp`） |
| `cwd` | 可选工作目录 |
| `env` / `inherit_env` | 定制子进程环境；默认继承父进程后再覆盖 |
| `startup_timeout` | 等待 `wait_for_log` 命中的最长秒数 |
| `wait_for_log` | stdout 正则，用于判定"就绪" |

## 2. 上下文注入

执行器会对被调用的函数提供 `_context` 关键字参数，包含：

| 键 | 值 |
|---|---|
| `attachment_store` | `utils.attachments.AttachmentStore` 实例，可查询/注册附件 |
| `python_workspace_root` | 当前 Session 的 `code_workspace/` |
| `graph_directory` | Session 根目录，可推导相对路径 |
| `human_prompt` | `utils.human_prompt.HumanPromptService`，可调用 `request()` 触发人工反馈 |
| 其他 | 视运行环境扩展，例如 `session_id`、`node_id` |

函数可声明 `_context: dict | None = None` 并自行解析（参考 `functions/function_calling/file.py` 中的 `FileToolContext`，还可参考 `functions/function_calling/user.py`）。

**示例：文件读取工具**

```python
from typing import Annotated
from utils.function_catalog import ParamMeta


def read_text_file(
    path: Annotated[str, ParamMeta(description="workspace 相对路径")],
    *,
    encoding: str = "utf-8",
    _context: dict | None = None,
) -> str:
    ctx = FileToolContext(_context)
    target = ctx.resolve_under_workspace(path)
    return target.read_text(encoding=encoding)
```

## 3. 内置函数列表

### 文件操作 (file.py)

文件与目录操作工具集，用于在 `code_workspace/` 中进行文件管理。

| 函数 | 说明 |
|------|------|
| `describe_available_files` | 列出附件仓库和 code_workspace 中的可用文件 |
| `list_directory` | 列出指定目录内容 |
| `create_folder` | 创建文件夹（支持多级目录） |
| `delete_path` | 删除文件或目录 |
| `load_file` | 加载文件并注册为附件，支持多模态（文本/图片/音频） |
| `save_file` | 保存文本内容到文件 |
| `read_text_file_snippet` | 读取文本片段（offset + limit），适合大文件 |
| `read_file_segment` | 按行范围读取文件，支持行号元数据 |
| `apply_text_edits` | 应用多处文本编辑，保留换行符和编码 |
| `rename_path` | 重命名文件或目录 |
| `copy_path` | 复制文件或目录树 |
| `move_path` | 移动文件或目录 |
| `search_in_files` | 在工作区文件中搜索文本或正则模式 |

### Python 环境管理 (uv_related.py)

使用 uv 管理 Python 环境和依赖。

| 函数 | 说明 |
|------|------|
| `install_python_packages` | 使用 `uv add` 安装 Python 包 |
| `init_python_env` | 初始化 Python 环境（uv lock + venv） |
| `uv_run` | 在工作区内执行 uv run，运行模块或脚本 |

### 深度研究 (deep_research.py)

搜索结果管理与报告生成工具，适用于自动化研究场景。

**搜索结果管理：**

| 函数 | 说明 |
|------|------|
| `search_save_result` | 保存或更新搜索结果（URL、标题、摘要、详情） |
| `search_load_all` | 加载所有已保存的搜索结果 |
| `search_load_by_url` | 按 URL 加载特定搜索结果 |
| `search_high_light_key` | 为搜索结果保存高亮关键词 |

**报告管理：**

| 函数 | 说明 |
|------|------|
| `report_read` | 读取报告完整内容 |
| `report_read_chapter` | 读取特定章节（支持多级路径如 `Intro/Background`） |
| `report_outline` | 获取报告大纲（标题层级结构） |
| `report_create_chapter` | 创建新章节 |
| `report_rewrite_chapter` | 重写章节内容 |
| `report_continue_chapter` | 追加内容到现有章节 |
| `report_reorder_chapters` | 重新排序章节 |
| `report_del_chapter` | 删除章节 |
| `report_export_pdf` | 导出报告为 PDF |

### 网络工具 (web.py)

| 函数 | 说明 |
|------|------|
| `web_search` | 使用 Serper.dev 执行网络搜索，支持分页和多语言 |
| `read_webpage_content` | 使用 Jina Reader 读取网页内容，支持速率限制 |

**环境变量：**
- `SERPER_DEV_API_KEY`：Serper.dev API 密钥
- `JINA_API_KEY`：Jina API 密钥（可选，无密钥时自动限速 20 RPM）

### 视频工具 (video.py)

Manim 动画渲染与视频处理。

| 函数 | 说明 |
|------|------|
| `render_manim` | 渲染 Manim 脚本，自动检测场景类并输出视频 |
| `concat_videos` | 使用 FFmpeg 拼接多个视频文件 |

### 代码执行 (code_executor.py)

| 函数 | 说明 |
|------|------|
| `execute_code` | 执行 Python 代码字符串，返回 stdout 和 stderr |

> **安全提示**：此工具具有高权限，应仅在可信工作流内使用。

### 用户交互 (user.py)

| 函数 | 说明 |
|------|------|
| `call_user` | 向用户发送指令并获取响应，用于需要人工输入的场景 |

### 天气查询 (weather.py)

示例工具，用于演示 Function Calling 流程。

| 函数 | 说明 |
|------|------|
| `get_city_num` | 返回城市编号（硬编码示例） |
| `get_weather` | 根据城市编号返回天气信息（硬编码示例） |

### 添加自定义工具

1. 在 `functions/function_calling/` 目录下创建 Python 文件
2. 使用类型注解定义参数：

```python
from typing import Annotated
from utils.function_catalog import ParamMeta

def my_tool(
    param1: Annotated[str, ParamMeta(description="参数描述")],
    *,
    _context: dict | None = None,  # 可选，系统自动注入
) -> str:
    """函数描述（会显示给 LLM）"""
    return "result"
```

3. 重启后端服务器
4. 在 Agent 节点中通过 `name: my_tool` 或 `name: my_module:All` 引用

## 4. MCP 启动

### 快速启动示例

**Remote 模式 YAML：**

```yaml
nodes:
  - id: remote_mcp
    type: agent
    config:
      tooling:
        type: mcp_remote
        config:
          server: https://mcp.mycompany.com/mcp
          headers:
            Authorization: Bearer ***
          timeout: 15
```

**Local 模式 YAML：**

```yaml
nodes:
  - id: local_mcp
    type: agent
    config:
      tooling:
        type: mcp_local
        config:
          command: uvx
          args:
            - blender-mcp
          cwd: ${REPO_ROOT}
          wait_for_log: "MCP ready"
          startup_timeout: 8
```

### FastMCP 示例服务器

```python
from fastmcp import FastMCP
import random

mcp = FastMCP("Company Simple MCP Server", debug=True)

@mcp.tool
def rand_num(a: int, b: int) -> int:
    return random.randint(a, b)

if __name__ == "__main__":
    mcp.run()
```

启动命令：

```bash
uv run fastmcp run mcp_example/mcp_server.py --transport streamable-http --port 8010
```

- 若以 Remote 模式使用，只需将 `server` 指向 `http://127.0.0.1:8010/mcp`
- 若以 Local 模式使用，可将 `command` 设置为 `uv run fastmcp run ...` 并保持 `transport=stdio`

## 5. 安全提示

- Function Tooling 运行在后端进程中，应确保函数遵循最小权限原则；不要在函数中执行不受控的命令。
- MCP Tooling 分为 **Remote (HTTP)** 与 **Local (stdio)**。Remote 仅配置已有服务器地址；Local 会拉起进程，请使用受控脚本并限制环境变量，必要时通过 `wait_for_log` 等字段判断进程是否就绪。
- Remote 模式建议置于 HTTPS 反向代理之后，并结合 API Key/ACL；Local 模式进程仍可访问宿主机文件，请限制其权限。
- 若工具可能修改附件或 workspace，请结合[附件指南](../../attachments.md)了解生命周期与清理策略。

## 6. 调试与排错

- 若前端/CLI 报告 "function 'xxx' not found"，检查函数名称与文件是否位于 `MAC_FUNCTIONS_DIR`（默认 `functions/function_calling/`）。
- `function_catalog` 加载失败时，`FunctionToolEntryConfig.field_specs()` 会在描述中提示错误，请先修复函数语法或依赖。
- 工具运行超时会向 Agent 返回异常文本；可通过 `timeout` 扩大限额，或在函数内部自行捕获并返回友好错误。
- MCP Remote：使用 curl 或 `fastmcp client` 测试 HTTP 端点；MCP Local：先单独运行并确认 stdout 中有 `wait_for_log` 匹配的文本。
- 若调用失败，查看 Web UI 中的工具请求/响应，或在 `logs/` 中搜索对应 session 的结构化日志。
