# Clippy团队给人型机器人注入灵魂

下面提供一份 Life++ 项目的启动指引文档，适用于 Aptos EverMove Hackerhouse 期间的开发与部署。该文档详细描述了环境准备、依赖安装、智能合约部署、前后端启动及测试调试步骤，帮助团队快速启动项目。

---

# Life++ 项目启动指引

本文档旨在指导开发团队搭建开发环境、部署智能合约、运行前后端服务，并完成基础测试。请按照以下步骤进行操作：

---

## 1. 前期准备

### 1.1 开发环境要求

- **操作系统**：推荐 macOS、Linux 或 Windows（WSL 环境）
- **Node.js**：建议 v16 及以上版本
- **Git**：确保已安装 Git 客户端
- **Docker（可选）**：用于快速搭建依赖服务

### 1.2 必备工具

- **Aptos CLI & SDK**  
  - 下载并安装 Aptos CLI：[Aptos CLI 安装文档](https://aptos.dev/)
  - 配置 Aptos SDK 环境（支持 JavaScript/TypeScript），参考 [Aptos SDK 文档](https://aptos.dev/sdk/js)
- **钱包工具**  
  - 安装 Petra Wallet 或其他支持 Aptos 的钱包
- **代码编辑器**  
  - 推荐 VS Code，并安装相关插件（如 Solidity、Move 语言支持）

---

## 2. 项目克隆与依赖安装

### 2.1 克隆代码仓库

在终端中执行以下命令，将代码仓库克隆至本地：

```bash
git clone https://github.com/your-org/lifeplusplus.git
cd lifeplusplus
```

### 2.2 安装前端依赖

进入前端目录并安装依赖：

```bash
cd frontend
npm install
```

### 2.3 安装后端依赖

进入后端目录并安装依赖：

```bash
cd ../backend
npm install
```

### 2.4 智能合约开发环境

- 确保已安装 Move 开发环境，参考 Aptos 官方文档
- 在合约目录中编写与调试智能合约（Robot NFT & Life++ Token）

---

## 3. 环境配置与链接

### 3.1 配置 Aptos Testnet

- 登录 Aptos CLI 并设置 Testnet 连接：

```bash
aptos init --profile testnet
```

- 获取 Testnet 钱包地址和私钥，并确保配置文件中正确更新

### 3.2 配置跨链与隐私链参数

- 根据项目需求，在配置文件中添加 Solana 及 Quorum 隐私链的相关参数
- 确保跨链接口模块已正确配置（如跨链 API 及网关地址）

---

## 4. 智能合约编译与部署

### 4.1 编译 Move 智能合约

在合约目录下执行编译命令，确保合约语法无误：

```bash
aptos move compile --package-dir .
```

### 4.2 部署合约至 Testnet

使用 Aptos CLI 部署合约：

```bash
aptos move publish --package-dir . --profile testnet
```

- 部署完成后，请记录合约地址和部署日志，便于后续前端调用

---

## 5. 前后端启动

### 5.1 启动前端服务

在 `frontend` 目录下启动前端应用：

```bash
npm run start
```

- 前端启动后，可通过浏览器访问 `http://localhost:3000` 查看界面

### 5.2 启动后端服务

在 `backend` 目录下启动后端服务：

```bash
npm run start
```

- 后端服务负责处理数据归集、AI 模型调用与合约接口请求

---

## 6. 功能测试与调试

### 6.1 合约功能测试

- 使用 Aptos CLI 及前端界面测试 Robot NFT 铸造、Token 交易及治理功能
- 查看链上数据是否正确上链，验证合约交互逻辑

### 6.2 前端交互调试

- 检查钱包连接、数据上传、AI 分身生成及 NFT 展示流程是否流畅
- 使用浏览器开发者工具调试前端错误，并及时调整代码

### 6.3 后端日志监控

- 查看后端日志，确认 AI 模型调用与数据归集过程正常
- 对跨链及隐私链接口进行压力测试，确保数据传输稳定

---

## 7. 文档与反馈

- 在项目 Wiki 中记录开发过程、部署日志及常见问题
- 内置反馈通道，团队成员及时提交改进建议
- 定期召开内部评审会议，确保项目在预定时间内交付

---

## 8. 常见问题及解决方案

- **问题：钱包连接失败**  
  解决方案：检查钱包插件是否正确安装、网络是否连接至 Aptos Testnet，并验证配置文件中的地址信息

- **问题：智能合约部署报错**  
  解决方案：检查 Move 合约语法及依赖，确保 Aptos CLI 已正确配置 Testnet 环境

- **问题：前后端交互异常**  
  解决方案：检查 API 地址、跨域设置及前端调用日志，确保智能合约地址与 API 配置一致

---

## 9. 其他注意事项

- **版本管理**：确保代码提交遵循 Git 分支管理规范，定期合并开发分支
- **安全性检查**：在每次合约更新后，执行自动化安全扫描工具，防范潜在漏洞
- **文档更新**：实时更新启动指引文档，确保新成员能迅速上手

---

通过以上启动指引，团队可以在 Aptos EverMove Hackerhouse 期间迅速搭建 Life++ 项目环境，完成从代码部署到用户体验验证的全流程。请团队成员务必仔细阅读并按照文档执行，遇到问题及时沟通，共同推动项目落地。
