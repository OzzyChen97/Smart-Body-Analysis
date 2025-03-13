# GitHub 上传指南

本指南将帮助您将 Mi Health Tracker 项目上传到 GitHub。

## 前提条件

1. 安装 Git：如果您尚未安装 Git，请从 [git-scm.com](https://git-scm.com/) 下载并安装。
2. 创建 GitHub 账户：如果您还没有 GitHub 账户，请在 [github.com](https://github.com/) 注册一个。

## 步骤

### 1. 初始化 Git 仓库

在项目根目录中打开终端，运行以下命令：

```bash
git init
```

### 2. 添加文件到暂存区

将项目文件添加到 Git 暂存区：

```bash
git add .
```

### 3. 提交更改

提交您的更改，并添加一个描述性的消息：

```bash
git commit -m "Initial commit of Mi Health Tracker"
```

### 4. 在 GitHub 上创建新仓库

1. 登录到 [GitHub](https://github.com/)
2. 点击右上角的 "+" 图标，然后选择 "New repository"
3. 输入仓库名称，例如 "mi-health-tracker"
4. 可选：添加描述
5. 选择仓库可见性（公开或私有）
6. 不要初始化仓库，因为您已经有了本地代码
7. 点击 "Create repository"

### 5. 连接本地仓库与 GitHub

GitHub 将显示命令来连接您的本地仓库。使用以下命令（替换 `YOUR_USERNAME` 为您的 GitHub 用户名）：

```bash
git remote add origin https://github.com/YOUR_USERNAME/mi-health-tracker.git
```

### 6. 推送代码到 GitHub

将您的代码推送到 GitHub：

```bash
git push -u origin main
```

注意：如果您的默认分支是 `master` 而不是 `main`，请使用：

```bash
git push -u origin master
```

## 后续更新

每次您对项目进行更改后，可以使用以下命令将更改推送到 GitHub：

```bash
git add .
git commit -m "描述您的更改"
git push
```

## 分支管理（可选）

为了更好的开发工作流，您可以创建和使用分支：

1. 创建新分支：
   ```bash
   git checkout -b feature/new-feature
   ```

2. 在分支上工作并提交更改：
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. 推送分支到 GitHub：
   ```bash
   git push -u origin feature/new-feature
   ```

4. 在 GitHub 上创建 Pull Request 将分支合并到主分支。

## 使用 GitHub Pages 部署前端（可选）

如果您想要部署前端应用，可以使用 GitHub Pages：

1. 在 `frontend` 目录中构建应用：
   ```bash
   cd frontend
   npm run build
   ```

2. 将构建文件夹复制到一个新的分支：
   ```bash
   git checkout -b gh-pages
   git rm -rf .
   cp -r frontend/build/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push -u origin gh-pages
   ```

3. 在 GitHub 仓库设置中启用 GitHub Pages，并选择 `gh-pages` 分支作为源。

## 问题排查

- 如果推送时遇到权限问题，请确保您已经设置了 GitHub 凭据或 SSH 密钥。
- 如果遇到合并冲突，请先拉取最新的更改：`git pull origin main`，解决冲突后再推送。
- 如果您不小心将敏感信息（如密码或 API 密钥）提交到仓库，请立即更改这些凭据，并考虑使用 [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) 从历史记录中删除这些信息。

## 其他资源

- [GitHub 文档](https://docs.github.com/)
- [Git 基础教程](https://git-scm.com/book/zh/v2)
- [GitHub 流程指南](https://guides.github.com/introduction/flow/) 