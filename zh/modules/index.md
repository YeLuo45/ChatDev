# 模块概述

本文档介绍 ChatDev 系统中的两大核心模块：Memory 模块与 Thinking 模块，分别负责记忆管理和思考增强功能。

---

## 1. Memory 模块

Memory 模块为 Agent 提供持久化和检索上下文信息的能力，使模型能够访问历史对话、文档知识和运行时事件。

### 1.1 体系结构

| 层级 | 说明 |
| --- | --- |
| **Memory Store** | 在 YAML `memory[]` 中声明，包含 `name`、`type` 和 `config`。`type` 由 `register_memory_store()` 注册 |
| **Memory Attachment** | 在 Agent 节点（`AgentConfig.memories`）中引用，指定读取/写入策略及检索阶段 |
| **MemoryManager** | 运行期根据 Attachment + Store 构建实例，负责 `load()`、`retrieve()`、`update()`、`save()` |
| **Embedding** | `SimpleMemoryConfig`、`FileMemoryConfig` 可内嵌 `EmbeddingConfig`，由 `EmbeddingFactory` 创建向量模型 |

### 1.2 配置示例

```yaml
memory:
  - name: convo_cache
    type: simple
    config:
      memory_path: WareHouse/shared/simple.json
      embedding:
        provider: openai
        model: text-embedding-3-small
        api_key: ${API_KEY}
  - name: project_docs
    type: file
    config:
      index_path: WareHouse/index/project_docs.json
      file_sources:
        - path: docs/
          file_types: [".md", ".mdx"]
          recursive: true
      embedding:
        provider: openai
        model: text-embedding-3-small
```

### 1.3 内置 Memory Store 类型

| 类型 | 实现文件 | 特点 | 适用场景 |
| --- | --- | --- | --- |
| `simple` | `node/agent/memory/simple_memory.py` | 运行结束后可选择落盘（JSON）；使用向量搜索（FAISS）+ 语义重打分；支持读写 | 小规模对话记忆、快速原型 |
| `file` | `node/agent/memory/file_memory.py` | 将指定文件/目录切片为向量索引，只读；自动检测文件变更并更新索引 | 知识库、文档问答 |
| `blackboard` | `node/agent/memory/blackboard_memory.py` | 轻量附加日志，按时间/条数裁剪；不依赖向量检索 | 简易广播板、流水线调试 |
| `mem0` | `node/agent/memory/mem0_memory.py` | 由 Mem0 云端托管；支持语义搜索 + 图关系；无需本地 embedding | 生产级记忆、跨会话持久化、多 Agent 记忆共享 |

### 1.4 MemoryAttachmentConfig

| 字段 | 说明 |
| --- | --- |
| `name` | 引用的 Memory Store 名称（需在 `stores[]` 中存在且唯一） |
| `retrieve_stage` | 可选数组，限制检索发生的阶段（`pre`、`plan`、`gen`、`critique` 等） |
| `top_k` | 每次检索返回的条数，默认 3 |
| `similarity_threshold` | 过滤相似度下限（-1 表示不限制） |
| `read` / `write` | 是否允许在该节点读取/写回此记忆 |

执行流程：

1. `MemoryManager` 在节点进入指定阶段时遍历 Attachments
2. 满足阶段与 `read=true` 的 Attachment 调用 `retrieve()`
3. 结果格式化为"===== 相关记忆 ====="文本写入 Agent 输入上下文
4. 节点完成后，`write=true` 的 Attachment 调用 `update()` 并在必要时 `save()`

### 1.5 各类型 Store 详解

#### SimpleMemory

- **路径**：`SimpleMemoryConfig.memory_path`（可为 `auto`），缺省仅驻留内存
- **检索**：构建查询文本 → Embedding 生成向量 → FAISS `IndexFlatIP` 检索 → 语义重打分（Jaccard/LCS）
- **写入**：`update()` 根据输入/输出生成摘要哈希去重，再写入 embedding + snapshot + 附件元信息

#### FileMemory

- **配置**：至少一个 `file_sources`（路径、后缀过滤、递归、编码）。`index_path` 必填
- **索引流程**：扫描文件 → 切片（默认 500 字符、重叠 50）→ Embedding → 写入 JSON
- **检索**：使用 FAISS 余弦相似度，只读，不支持 `update()`
- **维护**：`load()` 时校验文件哈希，必要时重建索引

#### BlackboardMemory

- **配置**：`memory_path`（可 `auto`）、`max_items`
- **检索**：直接返回最近 `top_k` 条，按时间排序
- **写入**：append 方式存储输入/输出 snapshot，不生成向量

#### Mem0Memory

- **配置**：必须提供 `api_key`（从 app.mem0.ai 获取）
- **检索**：使用 Mem0 服务端语义搜索
- **写入**：仅将用户输入（`role: "user"` 消息）发送至 Mem0，不包含 Agent 输出
- **持久化**：完全由云端托管，`load()` 和 `save()` 为空操作

### 1.6 Embedding 配置

| 字段 | 说明 |
| --- | --- |
| `provider` | `openai` 或 `local` |
| `model` | 模型名称（如 `text-embedding-3-small`） |
| `api_key` | API 密钥 |
| `base_url` | 可配置兼容层地址 |
| `params` | 支持 `use_chunking`、`chunk_strategy`、`max_length` 等 |

---

## 2. Thinking 模块

Thinking 模块为 Agent 节点提供思考增强能力，使模型能够在生成结果前或后进行额外的推理过程。

### 2.1 体系结构

| 层级 | 说明 |
| --- | --- |
| **ThinkingConfig** | 在 YAML `nodes[].config.thinking` 中声明，包含 `type` 和 `config` |
| **ThinkingManagerBase** | 抽象基类，定义 `_before_gen_think` 和 `_after_gen_think` 两个时机的思考逻辑 |
| **注册中心** | 通过 `register_thinking_mode()` 注册新思考模式 |

### 2.2 配置示例

```yaml
nodes:
  - id: Thoughtful Agent
    type: agent
    config:
      provider: openai
      model: gpt-4o-mini
      thinking:
        type: reflection
        config:
          reflection_prompt: |
            请仔细审视你的回答，考虑以下方面：
            1. 逻辑是否严密
            2. 有无事实错误
            3. 表达是否清晰
            然后给出改进后的回答。
```

### 2.3 内置思考模式

| 类型 | 描述 | 触发时机 | 配置字段 |
| --- | --- | --- | --- |
| `reflection` | 模型生成后进行自我反思并优化输出 | 生成后 (`after_gen`) | `reflection_prompt` |

#### Reflection 模式

Self-Reflection 模式让模型在初次生成后对自己的输出进行反思和改进：

1. Agent 节点正常调用模型生成初始回答
2. ThinkingManager 将对话历史拼接为反思上下文
3. 结合 `reflection_prompt` 再次调用模型生成反思结果
4. 反思结果替换原始输出作为节点最终输出

**适用场景**：

- 写作润色：让模型自我审阅并修正语法、逻辑问题
- 代码审查：生成代码后自动进行安全和质量检查
- 复杂推理：对多步骤推理结果进行验证和修正

### 2.4 执行时机

| 时机 | 属性 | 说明 |
| --- | --- | --- |
| 生成前 (`before_gen`) | `before_gen_think_enabled` | 在模型调用前执行思考，可预处理输入 |
| 生成后 (`after_gen`) | `after_gen_think_enabled` | 在模型输出后执行思考，可后处理或优化输出 |

内置 `reflection` 模式仅启用生成后思考。

### 2.5 与 Memory 的交互

Thinking 模块可访问 Memory 上下文：

- `ThinkingPayload.text`：当前阶段的文本内容
- `ThinkingPayload.blocks`：多模态内容块（图片、附件等）
- `ThinkingPayload.metadata`：附加元数据

Memory 检索结果会通过 `memory` 参数传入思考函数。

---

## 3. 扩展自定义模块

### 自定义 Memory Store

1. 新建 Config + Store（继承 `MemoryBase`）
2. 在 `node/agent/memory/registry.py` 中调用 `register_memory_store()`
3. 补充 `FIELD_SPECS`，运行 `python -m tools.export_design_template` 更新前端选项

### 自定义思考模式

1. 创建配置类：继承 `BaseConfig`
2. 实现 ThinkingManager：继承 `ThinkingManagerBase`
3. 注册模式：

```python
from runtime.node.agent.thinking.registry import register_thinking_mode

register_thinking_mode(
    "my_thinking",
    config_cls=MyThinkingConfig,
    manager_cls=MyThinkingManager,
    summary="自定义思考模式描述",
)
```

4. 运行 `python -m tools.export_design_template` 更新前端选项

---

## 4. 最佳实践

### Memory

- 控制 `max_content_length` 避免爆 context
- 通过 `retrieve_stage` 控制检索次数，减少模型输入冗余
- 调整 `top_k`、`similarity_threshold` 平衡召回与 token 成本
- 确保 `memory_path`/`index_path` 所在目录可写

### Thinking

- 当前反思为单轮，若需多轮可在 `reflection_prompt` 中明确迭代要求
- 过长的 `reflection_prompt` 会增加 token 消耗，建议聚焦关键改进点
- 将重要反思结果存入 Memory，供后续节点参考
- 监控反思带来的额外 token 用量
