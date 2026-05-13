---
layout: home

hero:
  name: "ChatDev 2.0"
  text: "DevAll 文档站"
  tagline: "零代码多智能体编排平台 — 用 YAML 定义工作流，用可视化界面运行"
  actions:
    - theme: brand
      text: 快速入门
      link: /zh/web-ui
    - theme: alt
      text: 工作流编排
      link: /zh/workflow

features:
  - title: 零代码编排
    details: 只需编写 YAML 配置文件，即可定义复杂的多智能体工作流。无需编码即可实现自动化流程。
  - title: 多节点类型
    details: 支持 Agent、Python、Human、Subgraph、Literal、Loop Counter 等多种节点类型。
  - title: 动态并行
    details: 支持 Map/Tree 模式的动态并行执行，可将任务自动拆分并行处理并归约结果。
  - title: 循环图支持
    details: 支持带环路的工作流图，使用 Tarjan 算法检测强连通分量，实现递归式环路执行。
  - title: 多模型支持
    details: 统一 Provider 抽象层，支持 OpenAI、Gemini、MiniMax、GLM 等多种 LLM 后端。
  - title: 可视化界面
    details: Web UI 提供工作流可视化编辑器、实时执行监控、附件管理和日志查看功能。
---

## 产品定位

ChatDev 2.0 (DevAll) 是一款**零代码多智能体编排平台**，通过 YAML 配置驱动复杂的多智能体协作流程。

**适用场景**：
- 数据可视化与报告生成
- 3D 内容创作
- 深度研究与信息聚合
- 软件开发自动化
- 任何需要多步骤、多角色协作的任务

**与 ChatDev 1.0 的区别**：
- ChatDev 1.0 是"虚拟软件公司"，通过角色（CEO、CTO、程序员）协作开发软件
- ChatDev 2.0 是通用编排平台，通过 YAML 定义任意工作流，不限于软件开发

## 技术架构

| 组件 | 技术 |
|------|------|
| 后端 | Python + FastAPI + WebSocket |
| 前端 | Vue 3 + VueFlow + TypeScript |
| 工作流引擎 | DAG/循环图调度 + Tarjan SCC |
| 运行环境 | Docker / 本地 Python |
| 部署 | Docker Compose / GitHub Pages (文档) |

## 快速导航

| 文档 | 内容 |
|------|------|
| [Web UI 快速入门](/zh/web-ui) | 前端界面操作、启动工作流、人工审阅 |
| [工作流编排](/zh/workflow) | YAML 结构、节点类型、Provider 配置 |
| [图执行逻辑](/zh/execution) | DAG 执行、Tarjan 环路检测、超级节点 |
| [动态执行](/zh/dynamic) | Map/Tree 模式、并行处理、层级归约 |
| [模块参考](/zh/modules) | Memory、Thinking、Tooling 模块 |
| [节点参考](/zh/nodes) | Agent、Python、Human、Subgraph 等 |

## 外部链接

- [GitHub 仓库](https://github.com/OpenBMB/ChatDev)
- [ChatDev 1.0 (Legacy)](https://github.com/OpenBMB/ChatDev/tree/chatdev1.0)
