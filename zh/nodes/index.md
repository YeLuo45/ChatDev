# 节点概述

DevAll 工作流引擎提供多种节点类型，用于构建复杂的多智能体应用。以下是所有可用节点类型的说明：

## 节点类型

| 节点类型 | 名称 | 说明 |
|---------|------|------|
| `agent` | 智能体节点 | 调用大语言模型 (LLM) 完成文本生成、对话、推理等任务，支持多种模型提供商和工具调用 |
| `python` | Python 执行节点 | 在工作流中执行 Python 代码，进行数据处理、计算等操作 |
| `human` | 人工输入节点 | 在工作流执行过程中暂停，等待人工输入或确认 |
| `subgraph` | 子图节点 | 嵌入并执行其他工作流子图，实现模块化和复用 |
| `passthrough` | 透传节点 | 将输入数据直接透传到输出，常用于数据转换或调试 |
| `literal` | 字面量节点 | 定义静态常量值，作为工作流中的固定参数 |
| `loop_counter` | 循环计数器节点 | 管理循环执行流程，记录当前迭代次数并控制循环终止 |

## 节点文档

- [智能体节点 (agent)](./agent.md) — 大模型对话、工具调用、思维链
- [Python 执行节点 (python)](./python.md) — Python 代码执行
- [人工输入节点 (human)](./human.md) — 人工介入与确认
- [子图节点 (subgraph)](./subgraph.md) — 子图嵌入与复用
- [透传节点 (passthrough)](./passthrough.md) — 数据透传
- [字面量节点 (literal)](./literal.md) — 静态常量定义
- [循环计数器节点 (loop_counter)](./loop_counter.md) — 循环控制

## 快速开始

在 YAML 配置中声明节点：

```yaml
nodes:
  - id: MyAgent
    type: agent
    config:
      provider: openai
      name: gpt-4o
      api_key: ${API_KEY}
```

每个节点都可以有多个输入和输出端口，通过 `inputs` 和 `outputs` 定义数据流向。
