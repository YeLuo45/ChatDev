# Agent 节点

> **主题色**: `#6c5ce7`

Agent 节点是 DevAll 平台中最核心的节点类型，用于调用大语言模型 (LLM) 完成文本生成、对话、推理等任务。它支持多种模型提供商（OpenAI、Gemini 等），并可配置工具调用、思维链、记忆等高级功能。

## 概述

Agent 节点封装了大语言模型的调用能力，提供了灵活的配置选项以满足不同的业务场景需求。通过配置不同的 provider 和 model name，可以轻松切换底层模型；通过 tooling、thinking、memories 等配置，可以实现复杂的多模态交互、工具调用、推理增强和知识增强能力。

## 配置字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `provider` | string | 是 | `openai` | 模型提供商名称，如 `openai`、`gemini` |
| `base_url` | string | 否 | 提供商默认 | API 端点 URL，支持 `${VAR}` 占位符 |
| `api_key` | string | 否 | - | API 密钥，建议使用环境变量 `${API_KEY}` |
| `name` | string | 是 | - | 模型名称，如 `gpt-4o`、`gemini-2.0-flash-001` |
| `role` | text | 否 | - | 系统提示词 (System Prompt) |
| `params` | dict | 否 | `{}` | 模型调用参数（temperature、top_p 等） |
| `tooling` | object | 否 | - | 工具调用配置，详见 [Tooling 模块](../modules/tooling/README.md) |
| `thinking` | object | 否 | - | 思维链配置，如 chain-of-thought、reflection |
| `memories` | list | 否 | `[]` | 记忆绑定配置，详见 [Memory 模块](../modules/memory.md) |
| `skills` | object | 否 | - | Agent Skills 发现配置，以及内置的技能激活/文件读取工具 |
| `retry` | object | 否 | - | 自动重试策略配置 |

### params 参数说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `temperature` | float | - | 生成随机性控制，较低值更确定性 |
| `top_p` | float | - | 核采样参数 |
| `max_tokens` | int | - | 最大生成 token 数 |
| `timeout` | int | - | 请求超时时间（秒） |

### 重试策略配置 (retry)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | bool | `true` | 是否启用自动重试 |
| `max_attempts` | int | `5` | 最大尝试次数（含首次） |
| `min_wait_seconds` | float | `1.0` | 最小退避等待时间 |
| `max_wait_seconds` | float | `6.0` | 最大退避等待时间 |
| `retry_on_status_codes` | list[int] | `[408,409,425,429,500,502,503,504]` | 触发重试的 HTTP 状态码 |

## 记忆附件配置 (memories)

memories 配置用于将记忆模块绑定到 Agent 节点，实现 RAG（检索增强生成）模式。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 记忆类型，如 `vector_store`、`knowledge_graph` |
| `name` | string | 是 | 记忆名称，需与 Memory 模块中定义的一致 |

### 示例

```yaml
memories:
  - type: vector_store
    name: product_knowledge
  - type: knowledge_graph
    name: user_preferences
```

## 思维配置 (thinking)

thinking 配置用于启用高级推理能力，如 Chain-of-Thought、Reflection 等。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | string | - | 思维模式：`chain-of-thought`、`reflection`、`react` |
| `enabled` | bool | `false` | 是否启用思维链 |
| `max_steps` | int | - | 最大推理步骤数 |

### 示例

```yaml
thinking:
  type: chain-of-thought
  enabled: true
  max_steps: 5
```

## 使用示例

### 基础配置

```yaml
nodes:
  - id: Writer
    type: agent
    config:
      provider: openai
      base_url: ${BASE_URL}
      api_key: ${API_KEY}
      name: gpt-4o
      role: |
        你是一位专业的技术文档撰写者，请用清晰简洁的语言回答问题。
      params:
        temperature: 0.7
        max_tokens: 2000
```

### 配置工具调用

```yaml
nodes:
  - id: Assistant
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      tooling:
        type: function
        config:
          tools:
            - name: describe_available_files
            - name: load_file
          timeout: 20
```

### 配置 MCP 工具（Remote HTTP）

```yaml
nodes:
  - id: MCP Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      tooling:
        type: mcp_remote
        config:
          server: http://localhost:8080/mcp
          headers:
            Authorization: Bearer ***
          timeout: 30
```

### 配置 MCP 工具（Local stdio）

```yaml
nodes:
  - id: Local MCP Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      tooling:
        type: mcp_local
        config:
          command: uvx
          args: ["mcp-server-sqlite", "--db-path", "data.db"]
          cwd: ${WORKSPACE}
          env:
            DEBUG: "true"
          startup_timeout: 10
```

### 配置思维链

```yaml
nodes:
  - id: Reasoning Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      thinking:
        type: chain-of-thought
        enabled: true
        max_steps: 5
```

### 配置记忆附件

```yaml
nodes:
  - id: RAG Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      memories:
        - type: vector_store
          name: product_knowledge
        - type: knowledge_graph
          name: user_preferences
```

### 配置 Agent Skills

```yaml
nodes:
  - id: Skilled Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      skills:
        enabled: true
        allow:
          - name: python-scratchpad
          - name: rest-api-caller
```

### 配置重试策略

```yaml
nodes:
  - id: Robust Agent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
      retry:
        enabled: true
        max_attempts: 3
        min_wait_seconds: 2.0
        max_wait_seconds: 10.0
```

### Gemini 多模态配置

```yaml
nodes:
  - id: Vision Agent
    type: agent
    config:
      provider: gemini
      base_url: https://generativelanguage.googleapis.com
      api_key: ${GEMINI_API_KEY}
      name: gemini-2.5-flash-image
      role: 你需要根据用户的输入，生成相应的图像内容。
```

## 相关文档

- [Tooling 模块配置](../modules/tooling/README.md)
- [Memory 模块配置](../modules/memory.md)
- [工作流编排指南](../workflow_authoring.md)
