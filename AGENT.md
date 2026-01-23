# IPAbuyer AI 编程指导文件

禁止对此文件进行编辑

## 软件框架

1. electron和react作为软件框架
2. sql.js作为数据库交互组件
3. axios作为http交互组件
4. 使用Node.js内置模块调用ipatool.exe执行命令
5. 最终使用electron-builder发布至Microsoft Store

## 数据库

1. PurchasedAppDb.db文件存放已购买app和购买app的邮箱地址
2. KeychainConfig.db文件存放登录app的用户名（邮箱）以及加密密钥，禁止存放用户名密码；每个用户名都有其对应的加密密钥，对新用户名生成唯一的随机加密密钥

## 搜索功能

1. 通过`https://itunes.apple.com/search?term=搜索名称&entity=software&limit=限制输出&country=国家代码`向apple服务器查询相关的软件列表
2. 国家代码遵循ISO 3166-1 Alpha-2
3. 处理返回的json数据并展示在主页表格中

## 主页表格

1. 主页表格不允许翻页
2. 主页表格允许鼠标滚轮翻动列表
3. 允许选中一些app并处理
4. 允许右键app进行处理

## app处理

1. 获取app列表，用户选中一些app后，可以进行购买或者下载
2. 使用`ipatool.exe purchase --keychain-passphrase 加密密钥 --bundle-identifier APPID`进行购买
3. 使用`ipatool.exe download --keychain-passphrase 加密密钥 --output 输出位置 --bundle-identifier APPID`进行下载
4. 需要捕获ipatool的输出信息并进行处理

## 登录苹果账户

1. 对app进行购买和下载，需要用户登录苹果账户
2. 登录命令为：`ipatool.exe auth login --auth-code 双重验证码 --email 邮箱 --password 密码 --keychain-passphrase 加密密钥`
3. 登出命令为：`ipatool.exe auth revoke`
4. 为了测试用途，在数据库中准备用户名test和密码test的账户，该账户购买或下载任何app都直接成功，该账户用于界面测试

## 变量命名

命名规则：页面名称_变量_类型

遵循驼峰命名规则

如：SettingPage_AboutDeveloper_Button

## 发布

1. Name="IPAbuyer.IPAbuyer"
2. Publisher="CN=68F867E4-B304-4B5D-9818-31B1910E0771"
3. Version="0.2.0.0"
4. Language="zh-CN"

## 数据库文件目录

1. DEBUG时存放于`AppData\Local\IPAbuyer\`
2. RELEASE时存放于`AppData\Local\Packages\IPAbuyer.IPAbuyer_kr1hdvrv6tpd0\LocalState\`
